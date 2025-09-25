import { createClient } from '@supabase/supabase-js';
import { offlineSupabase } from './offlineSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use offline supabase for desktop app, online for web
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron;

export const supabase = isElectron 
  ? offlineSupabase 
  : (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : offlineSupabase; // Fallback to offline if no credentials

// Database types
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'cashier';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  category?: Category;
  barcode?: string;
  buying_price: number;
  unit_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  cashier_id: string;
  cashier?: UserProfile;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  customer_paid: number;
  change_given: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  receipt_url?: string;
  created_by: string;
  created_at: string;
}