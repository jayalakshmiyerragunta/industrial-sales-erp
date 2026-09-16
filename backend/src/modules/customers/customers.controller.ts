import { Request, Response } from 'express';
import * as customersService from './customers.service';

export async function list(req: Request, res: Response) {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const customers = await customersService.list(search);
  res.json({ success: true, data: customers });
}

export async function getById(req: Request, res: Response) {
  const id = String(req.params.id);
  const customer = await customersService.getById(id);
  res.json({ success: true, data: customer });
}

export async function create(req: Request, res: Response) {
  const customer = await customersService.create(req.body);
  res.status(201).json({ success: true, message: 'Customer created', data: customer });
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id);
  const customer = await customersService.update(id, req.body);
  res.json({ success: true, message: 'Customer updated', data: customer });
}