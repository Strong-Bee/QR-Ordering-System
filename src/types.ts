export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  KASIR = 'KASIR',
  DAPUR = 'DAPUR',
  CUSTOMER = 'CUSTOMER'
}

export interface Table {
  id: number;
  number: number;
  qrCodeUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: number;
  isAvailable: boolean;
}

export interface Order {
  id: string; // cuid or unique string
  tableId: number;
  status: OrderStatus;
  totalAmount: number;
  midtransOrderId: string;
  midtransSnapUrl?: string;
  midtransSnapToken?: string;
  paymentMethod?: string;
  paidAt?: string;
  customerName?: string;
  customerEmail?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: string;
  menuItemId: number;
  quantity: number;
  price: number;
  note?: string;
  // Denormalized or joined menu item for display convenience
  menuItem?: MenuItem;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  tableNumber?: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface Feedback {
  id: string;
  orderId?: string;
  customerName: string;
  rating: number;
  note: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  orderId: string;
  recipientEmail: string;
  customerName: string;
  subject: string;
  bodyHtml: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  sentAt: string;
  errorMessage?: string;
}

