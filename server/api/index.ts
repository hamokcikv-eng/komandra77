import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { catalogRoutes } from './catalog';
import { authRoutes } from './auth';
import { orderRoutes } from './orders';
import { publicRoutes } from './public';
import { adminRoutes } from './admin';

export const api = new Hono<AppEnv>();

api.route('/', catalogRoutes);
api.route('/', authRoutes);
api.route('/', orderRoutes);
api.route('/', publicRoutes);
api.route('/admin', adminRoutes);
