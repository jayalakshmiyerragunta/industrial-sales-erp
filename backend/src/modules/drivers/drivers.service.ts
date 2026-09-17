import { prisma } from '../../config/db';

/**
 * Active drivers with an `allocated` flag — true when the driver is already
 * attached to a dispatch. The DB-level UNIQUE constraint on
 * dispatches.driver_id guarantees a driver can never serve two orders.
 */
export async function list() {
  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      vehicleNumber: true,
      dispatches: { select: { id: true, dispatchNo: true } },
    },
    orderBy: { name: 'asc' },
  });

  return drivers.map((d) => ({
    id: d.id,
    name: d.name,
    vehicleNumber: d.vehicleNumber,
    allocated: d.dispatches.length > 0,
    dispatchNo: d.dispatches[0]?.dispatchNo ?? null,
  }));
}