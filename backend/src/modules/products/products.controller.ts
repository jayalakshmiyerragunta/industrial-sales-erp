import { Request, Response } from 'express';
import * as productsService from './products.service';

export async function list(req: Request, res: Response) {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const products = await productsService.list(search, category);
  res.json({ success: true, data: products });
}

export async function getById(req: Request, res: Response) {
  const product = await productsService.getById(String(req.params.id));
  res.json({ success: true, data: product });
}

export async function create(req: Request, res: Response) {
  const product = await productsService.create(req.body);
  res.status(201).json({ success: true, message: 'Product created', data: product });
}

export async function update(req: Request, res: Response) {
  const product = await productsService.update(String(req.params.id), req.body);
  res.json({ success: true, message: 'Product updated', data: product });
}

export async function categories(_req: Request, res: Response) {
  const result = await productsService.categories();
  res.json({ success: true, data: result.map((c) => c.category) });
}