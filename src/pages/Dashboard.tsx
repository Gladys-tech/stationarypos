import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Receipt
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  todaySales: number;
  todayRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalCashiers: number;
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    todayRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalCashiers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get total products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get low stock products
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_quantity', 10);

      // Get today's sales
      const { data: todaySalesData, count: todaySalesCount } = await supabase
        .from('sales')
        .select('total_amount', { count: 'exact' })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      // Get monthly revenue
      const { data: monthlyRevenueData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', firstDayOfMonth.toISOString());

      // Get total expenses this month
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .gte('created_at', firstDayOfMonth.toISOString());

      // Get cost of goods sold for proper profit calculation
      const { data: saleItemsData } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          product:products(buying_price),
          sale:sales!inner(created_at)
        `)
        .gte('sale.created_at', firstDayOfMonth.toISOString());

      // Get total cashiers (admin only)
      let cashierCount = 0;
      if (profile?.role === 'admin') {
        const { count } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'cashier');
        cashierCount = count || 0;
      }

      const todayRevenue = todaySalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const monthlyRevenue = monthlyRevenueData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      
      // Calculate cost of goods sold
      const costOfGoodsSold = saleItemsData?.reduce((sum, item) => {
        const buyingPrice = item.product?.buying_price || 0;
        return sum + (buyingPrice * item.quantity);
      }, 0) || 0;
      
      // Calculate net profit: Revenue - (COGS + Expenses)
      const netProfit = monthlyRevenue - (costOfGoodsSold + totalExpenses);

      setStats({
        totalProducts: productCount || 0,
        lowStockProducts: lowStockCount || 0,
        todaySales: todaySalesCount || 0,
        todayRevenue,
        totalExpenses,
        netProfit,
        totalCashiers: cashierCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    change?: string;
  }> = ({ title, value, icon: Icon, color, change }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}!</h1>
        <p className="text-blue-100 mt-2">Here's what's happening with your store today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          color="bg-blue-500"
        />
        
        <StatCard
          title="Today's Sales"
          value={stats.todaySales}
          icon={ShoppingCart}
          color="bg-green-500"
        />
        
        <StatCard
          title="Today's Revenue"
          value={`UGX ${stats.todayRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-purple-500"
        />
        
        {profile?.role === 'admin' ? (
          <StatCard
            title="Total Cashiers"
            value={stats.totalCashiers}
            icon={Users}
            color="bg-orange-500"
          />
        ) : (
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockProducts}
            icon={AlertTriangle}
            color="bg-red-500"
          />
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Net Profit (Monthly)"
          value={`UGX ${stats.netProfit.toLocaleString()}`}
          icon={TrendingUp}
          color={stats.netProfit >= 0 ? "bg-green-500" : "bg-red-500"}
        />
        
        <StatCard
          title="Monthly Expenses"
          value={`UGX ${stats.totalExpenses.toLocaleString()}`}
          icon={Receipt}
          color="bg-red-500"
        />
        
        <StatCard
          title="Monthly Revenue"
          value={`UGX ${stats.todayRevenue.toLocaleString()}`}
          icon={Calendar}
          color="bg-indigo-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/make-sale"
            className="flex items-center justify-center space-x-3 bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-xl transition-colors duration-200"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-medium">Make a Sale</span>
          </a>
          
          <a
            href="/inventory"
            className="flex items-center justify-center space-x-3 bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-xl transition-colors duration-200"
          >
            <Package className="h-5 w-5" />
            <span className="font-medium">Manage Inventory</span>
          </a>
          
          <a
            href="/reports"
            className="flex items-center justify-center space-x-3 bg-purple-50 hover:bg-purple-100 text-purple-700 p-4 rounded-xl transition-colors duration-200"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">View Reports</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;