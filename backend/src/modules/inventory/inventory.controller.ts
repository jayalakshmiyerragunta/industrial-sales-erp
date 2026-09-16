import { Request, Response } from 'express';
import * as inventoryService from './inventory.service';

export async function availability(_req: Request, res: Response) {
  const inventory = await inventoryService.availability();
  res.json({ success: true, data: inventory });
}