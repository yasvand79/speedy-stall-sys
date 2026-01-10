// Core types for Food Shop Management System

export type OrderType = 'dine-in' | 'takeaway';
export type OrderStatus = 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'card';
export type PaymentStatus = 'pending' | 'partial' | 'completed';
export type MenuCategory = 'veg' | 'non-veg' | 'beverages' | 'combos';
export type UserRole = 'developer' | 'admin' | 'billing';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  isAvailable: boolean;
  imageUrl?: string;
  preparationTime: number; // in minutes
  ingredients: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  tableNumber?: number;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  payments: Payment[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPerUnit: number;
  lastRestocked: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface DailySummary {
  date: Date;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingItems: { itemId: string; itemName: string; quantity: number }[];
  peakHour: number;
}
