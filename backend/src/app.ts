import 'express-async-errors';
import express from 'express';
import cors from 'cors';

import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import customersRouter from './modules/customers/customers.router';
import productsRouter from './modules/products/products.router';
import inventoryRouter from './modules/inventory/inventory.router';
import enquiriesRouter from './modules/enquiries/enquiries.router';
import quotationsRouter from './modules/quotations/quotations.router';
import salesOrdersRouter from './modules/sales-orders/sales-orders.router';
import dispatchesRouter from './modules/dispatches/dispatches.router';
import driversRouter from './modules/drivers/drivers.router';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
const API = '/api/v1';
app.use(`${API}/auth`, authRouter);
app.use(`${API}/users`, usersRouter);
app.use(`${API}/customers`, customersRouter);
app.use(`${API}/products`, productsRouter);
app.use(`${API}/inventory`, inventoryRouter);
app.use(`${API}/enquiries`, enquiriesRouter);
app.use(`${API}/quotations`, quotationsRouter);
app.use(`${API}/sales-orders`, salesOrdersRouter);
app.use(`${API}/dispatches`, dispatchesRouter);
app.use(`${API}/drivers`, driversRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

export default app;