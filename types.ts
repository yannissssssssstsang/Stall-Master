
export enum Language {
  EN = 'en',
  ZH = 'zh'
}

export enum PaymentMethod {
  CASH = 'CASH',
  PAYME = 'PAYME',
  ALIPAY = 'ALIPAY',
  FPS = 'FPS'
}

// Added SyncStatus type to track cloud synchronization state
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'pending' | 'offline';

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  threshold?: number;
  image?: string;
  category: string;
}

export interface ProductChangeLog {
  id: string;
  productId: string;
  productName: string;
  field: 'price' | 'stock';
  oldValue: number;
  newValue: number;
  timestamp: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  timestamp: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  profit: number;
  customerEmail?: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
}

export interface DailyReport {
  date: string;
  transactions: Transaction[];
  totalRevenue: number;
  totalProfit: number;
}

export interface AIExtractionResult {
  name: string;
  price: number;
  cost: number;
  category: string;
}

export interface PaymentQRCodes {
  PAYME?: string;
  ALIPAY?: string;
  FPS?: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  alertType: 'none' | 'transaction' | 'stock' | 'both';
}
