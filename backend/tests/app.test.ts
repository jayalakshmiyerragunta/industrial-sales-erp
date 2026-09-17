import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

const api = request(app);

async function login(email: string, password: string) {
  const res = await api.post('/api/v1/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

async function firstCustomer(admin: string) {
  const res = await api.get('/api/v1/customers').set('Authorization', `Bearer ${admin}`);
  return res.body.data[0].id as string;
}

async function productByCode(admin: string, code: string) {
  const res = await api.get(`/api/v1/products?search=${code}`).set('Authorization', `Bearer ${admin}`);
  const product = res.body.data.find((p: { code: string }) => p.code === code);
  expect(product).toBeTruthy();
  return product;
}

async function stockRow(admin: string, productId: string) {
  const res = await api.get('/api/v1/inventory').set('Authorization', `Bearer ${admin}`);
  return res.body.data.find((r: { productId: string }) => r.productId === productId);
}

async function createEnquiry(admin: string, customerId: string, items: { productId: string; quantity: number }[]) {
  const res = await api
    .post('/api/v1/enquiries')
    .set('Authorization', `Bearer ${admin}`)
    .send({ customerId, notes: 'automated test', items });
  expect(res.body.success).toBe(true);
  return res.body.data as { id: string; enquiryNo: string };
}

async function createQuotation(
  admin: string,
  enquiryId: string,
  items: { productId: string; quantity: number; unitPrice: number; discountPct?: number; gstPct?: number }[]
) {
  const res = await api
    .post('/api/v1/quotations')
    .set('Authorization', `Bearer ${admin}`)
    .send({ enquiryId, items });
  expect(res.body.success).toBe(true);
  return res.body.data as { id: string; quotationNo: string; totalAmount: string };
}

// Build enquiry -> quotation -> accept -> convert -> sales order, returning the order id.
async function makePendingOrder(admin: string, customerId: string, productId: string, quantity: number) {
  const enquiry = await createEnquiry(admin, customerId, [{ productId, quantity }]);
  const quotation = await createQuotation(admin, enquiry.id, [
    { productId, quantity, unitPrice: 1000, gstPct: 18 },
  ]);
  await api
    .patch(`/api/v1/quotations/${quotation.id}/status`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ status: 'SENT' })
    .expect(200);
  await api
    .patch(`/api/v1/quotations/${quotation.id}/status`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ status: 'ACCEPTED' })
    .expect(200);
  const res = await api
    .post(`/api/v1/quotations/${quotation.id}/convert`)
    .set('Authorization', `Bearer ${admin}`)
    .expect(201);
  return res.body.data as { id: string; orderNo: string };
}

// First driver not yet used by a dispatch (optionally excluding one id).
async function freeDriver(admin: string, excludedId?: string) {
  const res = await api.get('/api/v1/drivers').set('Authorization', `Bearer ${admin}`);
  const driver = res.body.data.find(
    (d: { allocated: boolean; id: string }) => !d.allocated && d.id !== excludedId
  );
  expect(driver).toBeTruthy();
  return driver as { id: string; name: string; vehicleNumber: string };
}

describe('Industrial Sales Workflow ERP', () => {
  let admin: string;
  let sales: string;
  let customerId: string;
  let pump: { id: string };

  beforeAll(async () => {
    admin = await login('admin@erp.com', 'Admin@123');
    sales = await login('sales@erp.com', 'Sales@123');
    customerId = await firstCustomer(admin);
    pump = await productByCode(admin, 'IND-PA-001');
  });

  it('rejects a login with a wrong password', async () => {
    const res = await api.post('/api/v1/auth/login').send({ email: 'admin@erp.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('enforces backend RBAC: sales users cannot confirm orders', async () => {
    const res = await api.post('/api/v1/sales-orders/whatever/confirm').set('Authorization', `Bearer ${sales}`);
    expect(res.status).toBe(403);
  });

  it('computes quotation totals on the backend (discount + GST) and rejects client totals', async () => {
    // 2 x 10000 @ 10% disc + 18% GST  =>  20000 * 0.90 * 1.18 = 21240
    const enquiry = await createEnquiry(admin, customerId, [{ productId: pump.id, quantity: 2 }]);
    const res = await api
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        enquiryId: enquiry.id,
        items: [{ productId: pump.id, quantity: 2, unitPrice: 10000, discountPct: 10, gstPct: 18 }],
      })
      .expect(201);
    expect(res.body.data.totalAmount).toBe('21240');
    expect(res.body.data.items[0].lineAmount).toBe('21240');

    // A client trying to dictate the total is rejected by the strict schema.
    const cheated = await api
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        enquiryId: enquiry.id,
        totalAmount: 1,
        items: [{ productId: pump.id, quantity: 2, unitPrice: 10000, gstPct: 18 }],
      });
    expect(cheated.status).toBe(400);
  });

  it('converts only ACCEPTED quotations, once', async () => {
    const enquiry = await createEnquiry(admin, customerId, [{ productId: pump.id, quantity: 1 }]);
    const quotation = await createQuotation(admin, enquiry.id, [
      { productId: pump.id, quantity: 1, unitPrice: 1000, gstPct: 18 },
    ]);

    const notAccepted = await api
      .post(`/api/v1/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${admin}`);
    expect(notAccepted.status).toBe(409);

    await api
      .patch(`/api/v1/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'SENT' })
      .expect(200);
    await api
      .patch(`/api/v1/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'ACCEPTED' })
      .expect(200);

    const conversion = await api
      .post(`/api/v1/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(201);
    expect(conversion.body.data.status).toBe('PENDING');

    const duplicate = await api
      .post(`/api/v1/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${admin}`);
    expect(duplicate.status).toBe(409);
  });

  it('does not convert a REJECTED quotation into a sales order', async () => {
    const enquiry = await createEnquiry(admin, customerId, [{ productId: pump.id, quantity: 1 }]);
    const quotation = await createQuotation(admin, enquiry.id, [
      { productId: pump.id, quantity: 1, unitPrice: 1000, gstPct: 18 },
    ]);
    await api
      .patch(`/api/v1/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'SENT' })
      .expect(200);
    await api
      .patch(`/api/v1/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'REJECTED' })
      .expect(200);

    const res = await api
      .post(`/api/v1/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(409);
  });

  it('rejects (marks LOST) an enquiry and prevents re-rejecting a terminal one', async () => {
    const enquiry = await createEnquiry(admin, customerId, [{ productId: pump.id, quantity: 1 }]);
    const res = await api
      .patch(`/api/v1/enquiries/${enquiry.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'LOST' })
      .expect(200);
    expect(res.body.data.status).toBe('LOST');

    const again = await api
      .patch(`/api/v1/enquiries/${enquiry.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'LOST' });
    expect(again.status).toBe(409);
  });

  it('reserves inventory when an admin confirms a sales order', async () => {
    const before = await stockRow(admin, pump.id);

    const { id: orderId } = await makePendingOrder(admin, customerId, pump.id, 3);
    const confirmRes = await api
      .post(`/api/v1/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');

    const after = await stockRow(admin, pump.id);
    expect(Number(after.reservedQty)).toBe(Number(before.reservedQty) + 3);
    expect(Number(after.availableQty)).toBe(Number(before.availableQty) - 3);
    expect(Number(after.physicalQty)).toBe(Number(before.physicalQty));

    // A PENDING order cannot reserve twice.
    const again = await api
      .post(`/api/v1/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${admin}`);
    expect(again.status).toBe(409);
  });

  it('decrements physical + reserved stock on dispatch (one-time per order)', async () => {
    const before = await stockRow(admin, pump.id);

    const { id: orderId } = await makePendingOrder(admin, customerId, pump.id, 2);
    await api.post(`/api/v1/sales-orders/${orderId}/confirm`).set('Authorization', `Bearer ${admin}`).expect(200);
    const afterConfirm = await stockRow(admin, pump.id);

    const driver = await freeDriver(admin);
    const res = await api
      .post(`/api/v1/dispatches/${orderId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ driverId: driver.id })
      .expect(201);
    expect(res.body.data.salesOrder.id).toBe(orderId);
    expect(res.body.data.driverName).toBe(driver.name);
    expect(res.body.data.vehicleNumber).toBe(driver.vehicleNumber);

    const after = await stockRow(admin, pump.id);
    expect(Number(after.physicalQty)).toBe(Number(before.physicalQty) - 2);
    expect(Number(after.reservedQty)).toBe(Number(afterConfirm.reservedQty) - 2);
    // available drops at confirm (reserved up), and is unchanged at dispatch.
    expect(Number(after.availableQty)).toBe(Number(afterConfirm.availableQty));

    const secondDriver = await freeDriver(admin, driver.id);
    const twice = await api
      .post(`/api/v1/dispatches/${orderId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ driverId: secondDriver.id });
    expect(twice.status).toBe(409);
  });

  it('cannot allocate the same driver to two different orders', async () => {
    const driver = await freeDriver(admin);

    const orderA = await makePendingOrder(admin, customerId, pump.id, 1);
    await api.post(`/api/v1/sales-orders/${orderA.id}/confirm`).set('Authorization', `Bearer ${admin}`).expect(200);
    await api
      .post(`/api/v1/dispatches/${orderA.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ driverId: driver.id })
      .expect(201);

    const orderB = await makePendingOrder(admin, customerId, pump.id, 1);
    await api.post(`/api/v1/sales-orders/${orderB.id}/confirm`).set('Authorization', `Bearer ${admin}`).expect(200);
    const reuse = await api
      .post(`/api/v1/dispatches/${orderB.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ driverId: driver.id });
    expect(reuse.status).toBe(409);
    expect(reuse.body.message).toMatch(/already allocated/i);

    // The driver list now reflects the allocation.
    const list = await api.get('/api/v1/drivers').set('Authorization', `Bearer ${admin}`);
    expect(list.body.data.find((d: { id: string }) => d.id === driver.id).allocated).toBe(true);
  });

  it('cannot confirm an order that requires more inventory than is available (brief Test 4)', async () => {
    const res = await api
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        code: 'IND-SHORT-001',
        name: 'Short Stock Item',
        category: 'Test',
        unit: 'pcs',
        basePrice: 100,
        physicalQty: 5,
      })
      .expect(201);
    const productId = res.body.data.id;

    const { id: orderId } = await makePendingOrder(admin, customerId, productId, 10);
    const confirm = await api
      .post(`/api/v1/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${admin}`);
    expect(confirm.status).toBe(409);
    expect(confirm.body.message).toMatch(/Insufficient stock/i);
  });

  it('releases reserved inventory when a confirmed order is cancelled', async () => {
    const created = await api
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        code: 'IND-CANCEL-001',
        name: 'Cancel Stock Item',
        category: 'Test',
        unit: 'pcs',
        basePrice: 200,
        physicalQty: 20,
      })
      .expect(201);
    const productId = created.body.data.id;
    const before = await stockRow(admin, productId);

    const { id: orderId } = await makePendingOrder(admin, customerId, productId, 8);
    await api
      .post(`/api/v1/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    const during = await stockRow(admin, productId);
    expect(Number(during.reservedQty)).toBe(Number(before.reservedQty) + 8);

    await api
      .post(`/api/v1/sales-orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    const after = await stockRow(admin, productId);
    expect(Number(after.reservedQty)).toBe(Number(before.reservedQty));
    expect(Number(after.physicalQty)).toBe(Number(before.physicalQty));
  });

  it('handles concurrent confirmations with row-level locking (only one can reserve)', async () => {
    const created = await api
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        code: 'IND-RACE-001',
        name: 'Race Stock Item',
        category: 'Test',
        unit: 'pcs',
        basePrice: 500,
        physicalQty: 10,
      })
      .expect(201);
    const productId = created.body.data.id;

    const orderA = await makePendingOrder(admin, customerId, productId, 6);
    const orderB = await makePendingOrder(admin, customerId, productId, 8);

    const [resA, resB] = await Promise.all([
      api.post(`/api/v1/sales-orders/${orderA.id}/confirm`).set('Authorization', `Bearer ${admin}`),
      api.post(`/api/v1/sales-orders/${orderB.id}/confirm`).set('Authorization', `Bearer ${admin}`),
    ]);

    const successes = [resA, resB].filter((r) => r.status === 200).length;
    const failures = [resA, resB].filter((r) => r.status === 409).length;
    expect(successes).toBe(1);
    expect(failures).toBe(1);

    // Exactly the successful order's quantity is reserved; available stays >= 0.
    const row = await stockRow(admin, productId);
    expect(Number(row.reservedQty)).toBe(6);
    expect(Number(row.availableQty)).toBeGreaterThanOrEqual(0);

    const confirmed = [resA, resB].find((r) => r.status === 200)?.body.data.status;
    expect(confirmed).toBe('CONFIRMED');
  });

  it('lets an admin adjust physical stock, but never below reserved (manage inventory)', async () => {
    const created = await api
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        code: 'IND-ADJ-001',
        name: 'Adjustable Stock Item',
        category: 'Test',
        unit: 'pcs',
        basePrice: 300,
        physicalQty: 20,
      })
      .expect(201);
    const productId = created.body.data.id;

    // SALES users may view inventory but cannot adjust it (backend RBAC).
    await api
      .patch(`/api/v1/inventory/${productId}`)
      .set('Authorization', `Bearer ${sales}`)
      .send({ physicalQty: 30 })
      .expect(403);

    // Negative quantities are rejected by validation.
    await api
      .patch(`/api/v1/inventory/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ physicalQty: -5 })
      .expect(400);

    // Admin can raise physical stock; available = physical - reserved.
    const up = await api
      .patch(`/api/v1/inventory/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ physicalQty: 50 })
      .expect(200);
    expect(Number(up.body.data.physicalQty)).toBe(50);
    expect(Number(up.body.data.reservedQty)).toBe(0);
    expect(Number(up.body.data.availableQty)).toBe(50);

    // Once 8 units are reserved, physical stock cannot drop below the reservation.
    const { id: orderId } = await makePendingOrder(admin, customerId, productId, 8);
    await api
      .post(`/api/v1/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);

    const below = await api
      .patch(`/api/v1/inventory/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ physicalQty: 4 });
    expect(below.status).toBe(409);
    expect(below.body.message).toMatch(/reserved/i);
  });

  it('lets a sales user create a customer, including one with a blank email', async () => {
    const res = await api
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${sales}`)
      .send({
        companyName: 'No Email Co',
        contactPerson: 'Nemo Menon',
        mobile: '9000000000',
        email: '',
        city: 'Kochi',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBeNull();
  });
});