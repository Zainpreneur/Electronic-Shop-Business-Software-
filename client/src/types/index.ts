export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  reorderLevel: number;
  imageUrl?: string | null;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt?: string;
  sales?: Sale[];
  repairs?: RepairJob[];
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "OTHER";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED";

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId?: string | null;
  customer?: Customer | null;
  user?: { name: string };
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes?: string | null;
  createdAt: string;
}

export type PurchaseStatus = "ORDERED" | "RECEIVED" | "CANCELLED";

export interface PurchaseItem {
  id: string;
  productId: string;
  product?: Product;
  qty: number;
  unitCost: number;
  lineTotal: number;
}

export interface Purchase {
  id: string;
  refNo: string;
  supplierId: string;
  supplier?: Supplier;
  user?: { name: string };
  items: PurchaseItem[];
  total: number;
  status: PurchaseStatus;
  createdAt: string;
  receivedAt?: string | null;
}

export type RepairStatus =
  | "RECEIVED"
  | "DIAGNOSING"
  | "IN_PROGRESS"
  | "WAITING_FOR_PARTS"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";

export interface RepairJob {
  id: string;
  jobNo: string;
  customerId: string;
  customer?: Customer;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  issueDescription: string;
  diagnosis?: string | null;
  status: RepairStatus;
  estimateCost?: number | null;
  finalCost?: number | null;
  technicianId?: string | null;
  technician?: { id: string; name: string } | null;
  receivedAt: string;
  completedAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthOrders: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockItems: { id: string; name: string; sku: string; stockQty: number; reorderLevel: number }[];
  openRepairs: number;
  totalCustomers: number;
  recentSales: Sale[];
  salesTrend: { date: string; total: number }[];
}
