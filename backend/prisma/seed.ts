import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Users ──────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const salesHash = await bcrypt.hash('Sales@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@erp.com', passwordHash, role: 'ADMIN' },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: {},
    create: { name: 'Sales User', email: 'sales@erp.com', passwordHash: salesHash, role: 'SALES' },
  });

  console.log('  ✅ Users: admin@erp.com (ADMIN), sales@erp.com (SALES)');

  // ── Customers ──────────────────────────────────
  const customers = [
    { companyName: 'ABC Engineering Pvt. Ltd.', contactPerson: 'Rajesh Kumar', mobile: '9876543210', email: 'rajesh@abcengg.com', city: 'Bengaluru' },
    { companyName: 'Precision Tools India', contactPerson: 'Amit Sharma', mobile: '9988776655', email: 'amit@precisiontools.in', city: 'Pune' },
    { companyName: 'Metro Manufacturing Co.', contactPerson: 'Priya Nair', mobile: '8877665544', email: 'priya@metromfg.com', city: 'Chennai' },
    { companyName: 'Steelcraft Industries', contactPerson: 'Vikram Patel', mobile: '7766554433', email: 'vikram@steelcraft.in', city: 'Ahmedabad' },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const customer = await prisma.customer.create({ data: c });
    createdCustomers.push(customer);
    console.log(`  ✅ Customer: ${c.companyName}`);
  }

  // ── Products & Inventory (6 industrial) ────────
  const products = [
    { code: 'IND-PA-001', name: 'Industrial Pump Assembly', category: 'Pumps & Motors', unit: 'pcs', basePrice: 12500, physical: 150 },
    { code: 'IND-BB-002', name: 'Ball Bearing 6205-2RS', category: 'Bearings', unit: 'pcs', basePrice: 180, physical: 5000 },
    { code: 'IND-VF-003', name: 'Pneumatic Control Valve 2"', category: 'Valves', unit: 'pcs', basePrice: 4200, physical: 80 },
    { code: 'IND-HS-004', name: 'Hydraulic Hose Assembly 1m', category: 'Hydraulics', unit: 'mtr', basePrice: 950, physical: 300 },
    { code: 'IND-GB-005', name: 'Gearbox 5HP Helical', category: 'Gear Drives', unit: 'pcs', basePrice: 18500, physical: 25 },
    { code: 'IND-FI-006', name: 'Air Filter Element HEPA', category: 'Filtration', unit: 'pcs', basePrice: 320, physical: 1200 },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: { code: p.code, name: p.name, category: p.category, unit: p.unit, basePrice: p.basePrice },
    });
    await prisma.inventory.create({
      data: { productId: product.id, physicalQty: p.physical, reservedQty: 0 },
    });
    console.log(`  ✅ Product: ${p.name} (${p.physical} units in stock)`);
  }

  // ── Sample enquiry ─────────────────────────────
  const allProducts = await prisma.product.findMany();
  const enquiry = await prisma.enquiry.create({
    data: {
      enquiryNo: 'ENQ-20260918-0001',
      customerId: createdCustomers[0].id,
      requiredDate: new Date(Date.now() + 14 * 86400000),
      notes: 'Urgent requirement for factory maintenance shutdown.',
      status: 'NEW',
      createdBy: sales.id,
      items: {
        create: [
          { productId: allProducts[0].id, quantity: 100 },
          { productId: allProducts[1].id, quantity: 200 },
          { productId: allProducts[2].id, quantity: 50 },
        ],
      },
    },
  });
  console.log(`  ✅ Enquiry: ${enquiry.enquiryNo}`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Credentials:');
  console.log('  admin@erp.com  / Admin@123');
  console.log('  sales@erp.com  / Sales@123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });