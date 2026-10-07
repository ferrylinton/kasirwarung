export type UnitCategory = string;

export interface CashierUnit {
  id: string;
  tenantId: string;
  name: string;
  symbol: string;
  category?: string;
  description?: string;
  isDefault?: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CashierUnitDetail extends CashierUnit {
  products?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    category?: string;
  }>;
}

export interface UnitStats {
  totalUnits: number;
  activeUnits?: number;
  unusedUnits?: number;
  totalProductsTracked: number;
  eceranCount?: number;
  kemasanCount?: number;
  timbanganCount?: number;
  volumeCount?: number;
  ikatanCount?: number;
  lainnyaCount?: number;
}
