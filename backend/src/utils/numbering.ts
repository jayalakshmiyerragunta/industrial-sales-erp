import { Prisma } from '@prisma/client';

/**
 * Atomically reserves the next document number for a given prefix
 * (ENQ, QTN, SO, DSP). The counter row is locked with SELECT ... FOR UPDATE
 * inside the calling transaction, so concurrent documents never collide.
 *
 * Format: <PREFIX>-<YYYYMMDD>-<4-digit sequence>  e.g. QTN-20260918-0007
 */
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  prefix: string
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const rows = await tx.$queryRaw<{ value: number }[]>`
    SELECT value FROM document_counters WHERE doc_type = ${prefix} FOR UPDATE
  `;

  let next = 1;
  if (rows.length > 0) {
    next = rows[0].value + 1;
    await tx.$executeRaw`
      UPDATE document_counters SET value = ${next}, updated_at = now()
      WHERE doc_type = ${prefix}
    `;
  } else {
    await tx.$executeRaw`
      INSERT INTO document_counters (doc_type, value, updated_at)
      VALUES (${prefix}, ${next}, now())
    `;
  }

  return `${prefix}-${date}-${String(next).padStart(4, '0')}`;
}