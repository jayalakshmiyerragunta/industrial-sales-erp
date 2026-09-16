import { Request, Response } from 'express';
import * as usersService from './users.service';

export async function list(_req: Request, res: Response) {
  const users = await usersService.listUsers();
  res.json({ success: true, data: users });
}