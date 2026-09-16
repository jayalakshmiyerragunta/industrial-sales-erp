import { Request, Response } from 'express';
import * as dispatchesService from './dispatches.service';

export async function list(_req: Request, res: Response) {
  const dispatches = await dispatchesService.list();
  res.json({ success: true, data: dispatches });
}

export async function getById(req: Request, res: Response) {
  const dispatch = await dispatchesService.getById(String(req.params.id));
  res.json({ success: true, data: dispatch });
}

export async function dispatchOrder(req: Request, res: Response) {
  const dispatch = await dispatchesService.dispatchOrder(String(req.params.id), req.body, req.user!.userId);
  res.status(201).json({
    success: true,
    message: 'Order dispatched; physical and reserved quantities reduced',
    data: dispatch,
  });
}