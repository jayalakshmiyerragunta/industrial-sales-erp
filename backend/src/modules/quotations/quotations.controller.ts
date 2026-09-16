import { Request, Response } from 'express';
import * as quotationsService from './quotations.service';

export async function list(_req: Request, res: Response) {
  const quotations = await quotationsService.list();
  res.json({ success: true, data: quotations });
}

export async function getById(req: Request, res: Response) {
  const quotation = await quotationsService.getById(String(req.params.id));
  res.json({ success: true, data: quotation });
}

export async function create(req: Request, res: Response) {
  const quotation = await quotationsService.create(req.body, req.user!.userId);
  res.status(201).json({ success: true, message: 'Quotation created', data: quotation });
}

export async function updateStatus(req: Request, res: Response) {
  const quotation = await quotationsService.updateStatus(String(req.params.id), req.body, req.user!.userId);
  res.json({ success: true, message: `Quotation marked as ${quotation.status}`, data: quotation });
}