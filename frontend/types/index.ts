export type * from './api.d.ts';
export * from './user.ts';
export * from './tenant.ts';
export * from './product.ts';
export * from './order.ts';
export * from './dashboard.ts';
export * from './log.ts';
export * from './theme.ts';
export * from './unit.ts';
export * from './session.ts';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}
