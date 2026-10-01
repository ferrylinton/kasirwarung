import { Router } from 'express';
import systemRoutes from './system.routes.ts';
import authRoutes from './auth.routes.ts';
import productRoutes from './product.routes.ts';
import categoryRoutes from './category.routes.ts';
import orderRoutes from './order.routes.ts';
import savedOrderRoutes from './savedOrder.routes.ts';
import userRoutes from './user.routes.ts';
import dashboardRoutes from './dashboard.routes.ts';
import logRoutes from './log.routes.ts';
import tenantRoutes from './tenant.routes.ts';

const apiRouter = Router();

// 1. System / Public Diagnostics
apiRouter.use('/', systemRoutes);

// 2. Authentication & User Profile
apiRouter.use('/auth', authRoutes);

// 3. Products & Categories
apiRouter.use('/products', productRoutes);
apiRouter.use('/categories', categoryRoutes);

// 4. Orders & Saved Orders (Hold Orders)
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/saved-orders', savedOrderRoutes);

// 5. User / Cashier Management
apiRouter.use('/users', userRoutes);

// 6. Dashboards, Audit Logs & Tenant Management
apiRouter.use('/', dashboardRoutes);
apiRouter.use('/', logRoutes);
apiRouter.use('/', tenantRoutes);

export default apiRouter;
