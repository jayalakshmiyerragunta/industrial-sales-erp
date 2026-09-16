import { Request, Response } from 'express';
import * as enquiriesService from './enquiries.service';

export async function list(_req: Request, res: Response) {
  const enquiries = await enquiriesService.list();
  res.json({ success: true, data: enquiries });
}

export async function getById(req: Request, res: Response) {
  const enquiry = await enquiriesService.getById(String(req.params.id));
  res.json({ success: true, data: enquiry });
}

export async function create(req: Request, res: Response) {
  const enquiry = await enquiriesService.create(req.body, req.user!.userId);
  res.status(201).json({ success: true, message: 'Enquiry created', data: enquiry });
}