import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Package,
  Users,
  BarChart3,
  PieChart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Select from '../components/ui/Select';
import ExportButtons from '../components/ui/ExportButtons';
import { getDateRange } from '../utils/exportUtils';

interface ReportData {
  totalSales: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalProducts: number;
  lowStockProducts: number;
  totalUsers: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  salesByDay: Array<{ date: string; sales: number; revenue: number }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalUsers: 0,
    topProducts: [],
    salesByDay: [],
    expensesByCategory: []
  });
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('this-week');

  useEffect(() => {
    fetchReportData();
  }, [filterPeriod]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(filterPeriod);

      // Get sales data
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(
            *,
            product:products(name, buying_price)
          )
        `)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      // Get sale items for COGS calculation
      const { data: saleItemsData } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          product:products(buying_price),
          sale:sales!inner(created_at)
        `)
        .gte('sale.created_at', start.toISOString())
        .lt('sale.created_at', end.toISOString());

      // Calculate cost of goods sold from sale items
      const costOfGoodsSold = saleItemsData?.reduce((sum, item) => {
        const buyingPrice = item.product?.buying_price || 0;
        return sum + (buyingPrice * item.quantity);
      }, 0) || 0;

      // Get expenses data
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      // Get products data
      const { data: productsData } = await supabase
        .from('products')
        .select('*');

      // Get users data
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*');

      // Calculate metrics
      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      
      // Net profit calculation: Revenue - (COGS + Expenses)
      const netProfit = totalRevenue - (costOfGoodsSold + totalExpenses);
      const totalProducts = productsData?.length || 0;
      const lowStockProducts = productsData?.filter(p => p.stock_quantity <= (p.low_stock_threshold || 10)).length || 0;
      const totalUsers = usersData?.length || 0;

      // Calculate top products
      const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
      
      salesData?.forEach(sale => {
        sale.sale_items?.forEach(item => {
          const productName = item.product?.name || 'Unknown';
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity;
          productSales[productName].revenue += item.total_price;
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate sales by day
      const salesByDay: { [key: string]: { sales: number; revenue: number } } = {};
      
      salesData?.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        if (!salesByDay[date]) {
          salesByDay[date] = { sales: 0, revenue: 0 };
        }
        salesByDay[date].sales += 1;
        salesByDay[date].revenue += sale.total_amount;
      });

      const salesByDayArray = Object.entries(salesByDay)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate expenses by category
      const expensesByCategory: { [key: string]: number } = {};
      
      expensesData?.forEach(expense => {
        const category = expense.category || 'general';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount;
      });

      const expensesByCategoryArray = Object.entries(expensesByCategory)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      setReportData({
        totalSales,
        totalRevenue,
        totalExpenses,
        netProfit,
        totalProducts,
        lowStockProducts,
        totalUsers,
        topProducts,
        salesByDay: salesByDayArray,
        expensesByCategory: expensesByCategoryArray
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportColumns = {
    summary: [
      { header: 'Metric', accessor: 'metric' },
      { header: 'Value', accessor: 'value' }
    ],
    topProducts: [
      { header: 'Product', accessor: 'name' },
      { header: 'Quantity Sold', accessor: 'quantity' },
      { header: 'Revenue (UGX)', accessor: 'revenue' }
    ],
    salesByDay: [
      { header: 'Date', accessor: 'date' },
      { header: 'Sales Count', accessor: 'sales' },
      { header: 'Revenue (UGX)', accessor: 'revenue' }
    ],
    expensesByCategory: [
      { header: 'Category', accessor: 'category' },
      { header: 'Amount (UGX)', accessor: 'amount' }
    ]
  };

  const summaryData = [
    { metric: 'Total Sales', value: reportData.totalSales },
    { metric: 'Total Revenue (UGX)', value: reportData.totalRevenue.toLocaleString() },
    { metric: 'Total Expenses (UGX)', value: reportData.totalExpenses.toLocaleString() },
    { metric: 'Net Profit (UGX)', value: reportData.netProfit.toLocaleString() },
    { metric: 'Total Products', value: reportData.totalProducts },
    { metric: 'Low Stock Products', value: reportData.lowStockProducts },
    { metric: 'Total Users', value: reportData.totalUsers }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold">Business Reports</h1>
        <p className="text-blue-100 mt-2">Comprehensive business analytics and insights</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <Select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'this-week', label: 'This Week' },
                { value: 'last-month', label: 'Last Month' },
                { value: 'last-year', label: 'Last Year' },
                { value: 'all', label: 'All Time' }
              ]}
            />
          </div>
          
          <ExportButtons
            data={summaryData}
            columns={exportColumns.summary}
            filename={`business-report-${filterPeriod}`}
            title={`Business Report - ${filterPeriod}`}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalSales}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">UGX {reportData.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">UGX {reportData.totalExpenses.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                UGX {reportData.netProfit.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${reportData.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Top Products
            </h2>
            <ExportButtons
              data={reportData.topProducts}
              columns={exportColumns.topProducts}
              filename={`top-products-${filterPeriod}`}
              title="Top Products Report"
            />
          </div>
          
          {reportData.topProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No product data available</p>
          ) : (
            <div className="space-y-3">
              {reportData.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.quantity} sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">UGX {product.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Expenses by Category
            </h2>
            <ExportButtons
              data={reportData.expensesByCategory}
              columns={exportColumns.expensesByCategory}
              filename={`expenses-by-category-${filterPeriod}`}
              title="Expenses by Category Report"
            />
          </div>
          
          {reportData.expensesByCategory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No expense data available</p>
          ) : (
            <div className="space-y-3">
              {reportData.expensesByCategory.map((expense) => (
                <div key={expense.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{expense.category.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600">UGX {expense.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales by Day */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Daily Sales Performance
          </h2>
          <ExportButtons
            data={reportData.salesByDay}
            columns={exportColumns.salesByDay}
            filename={`daily-sales-${filterPeriod}`}
            title="Daily Sales Report"
          />
        </div>
        
        {reportData.salesByDay.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Sales Count</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportData.salesByDay.map((day) => (
                  <tr key={day.date} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900">{new Date(day.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-600">{day.sales}</td>
                    <td className="py-3 px-4 font-semibold text-green-600">UGX {day.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;