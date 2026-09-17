import { Request, Response } from 'express';
import * as inventoryService from './inventory.service';

export async function availability(_req: Request, res: Response) {
  const inventory = await inventoryService.availability();
  res.json({ success: true, data: inventory });
}

export async function adjust(req: Request, res: Response) {
  const { physicalQty } = req.body as { physicalQty: number };
  const row = await inventoryService.adjust(String(req.params.productId), physicalQty);
  res.json({ success: true, data: row });
}
