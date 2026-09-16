import { Request, Response } from 'express';
import * as salesOrdersService from './sales-orders.service';

export async function list(_req: Request, res: Response) {
  const orders = await salesOrdersService.list();
  res.json({ success: true, data: orders });
}

export async function getById(req: Request, res: Response) {
  const order = await salesOrdersService.getById(String(req.params.id));
  res.json({ success: true, data: order });
}

export async function convertFromQuotation(req: Request, res: Response) {
  const order = await salesOrdersService.convertFromQuotation(String(req.params.id), req.user!.userId);
  res.status(201).json({ success: true, message: 'Sales order created from quotation', data: order });
}

export async function confirm(req: Request, res: Response) {
  const order = await salesOrdersService.confirm(String(req.params.id));
  res.json({ success: true, message: `Sales order ${order.orderNo} confirmed and inventory reserved`, data: order });
}

export async function cancel(req: Request, res: Response) {
  const order = await salesOrdersService.cancel(String(req.params.id));
  res.json({ success: true, message: `Sales order ${order.orderNo} cancelled`, data: order });
}