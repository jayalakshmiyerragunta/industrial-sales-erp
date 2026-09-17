import { Request, Response } from 'express';
import * as driversService from './drivers.service';

export async function list(_req: Request, res: Response) {
  const drivers = await driversService.list();
  res.json({ success: true, data: drivers });
}