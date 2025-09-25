import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Select from '../components/ui/Select';
import ExportButtons from '../components/ui/ExportButtons';
import { getDateRange } from '../utils/exportUtils';

interface ProfitData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  dailyProfits: Array<{
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  monthlyComparison: {
    currentMonth: { revenue: number; expenses: number; profit: number };
    previousMonth: { revenue: number; expenses: number; profit: number };
    growth: number;
  };
}

const Profits: React.FC = () => {
  const [profitData, setProfitData] = useState<ProfitData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    dailyProfits: [],
    monthlyComparison: {
      currentMonth: { revenue: 0, expenses: 0, profit: 0 },
      previousMonth: { revenue: 0, expenses: 0, profit: 0 },
      growth: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('this-week');

  useEffect(() => {
    fetchProfitData();
  }, [filterPeriod]);

  const fetchProfitData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(filterPeriod);

      // Get sales data for the selected period
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      // Get expenses data for the selected period
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      // Calculate totals
      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

      // Calculate daily profits
      const dailyData: { [key: string]: { revenue: number; expenses: number } } = {};

      // Process sales
      salesData?.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, expenses: 0 };
        }
        dailyData[date].revenue += sale.total_amount;
      });

      // Process expenses
      expensesData?.forEach(expense => {
        const date = new Date(expense.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, expenses: 0 };
        }
        dailyData[date].expenses += expense.amount;
      });

      // Add cost of goods sold to expenses for proper profit calculation
      const { data: saleItemsData } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          product:products(buying_price),
          sale:sales!inner(created_at)
        `)
        .gte('sale.created_at', start.toISOString())
        .lt('sale.created_at', end.toISOString());

      // Calculate cost of goods sold and add to daily expenses
      const costOfGoodsSold = saleItemsData?.reduce((sum, item) => {
        const buyingPrice = item.product?.buying_price || 0;
        return sum + (buyingPrice * item.quantity);
      }, 0) || 0;

      // Add COGS to total expenses for proper profit calculation
      const totalExpensesWithCOGS = totalExpenses + costOfGoodsSold;
      const netProfit = totalRevenue - totalExpensesWithCOGS;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      const dailyProfits = Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          expenses: data.expenses + (costOfGoodsSold / Object.keys(dailyData).length), // Distribute COGS across days
          profit: data.revenue - (data.expenses + (costOfGoodsSold / Object.keys(dailyData).length))
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate monthly comparison
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Current month data
      const { data: currentMonthSales } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      const { data: currentMonthExpenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      // Previous month data
      const { data: previousMonthSales } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());

      const { data: previousMonthExpenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());

      const currentMonthRevenue = currentMonthSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const currentMonthExpensesTotal = currentMonthExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const currentMonthProfit = currentMonthRevenue - currentMonthExpensesTotal;

      const previousMonthRevenue = previousMonthSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const previousMonthExpensesTotal = previousMonthExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const previousMonthProfit = previousMonthRevenue - previousMonthExpensesTotal;

      const growth = previousMonthProfit > 0 
        ? ((currentMonthProfit - previousMonthProfit) / previousMonthProfit) * 100 
        : currentMonthProfit > 0 ? 100 : 0;

      setProfitData({
        totalRevenue,
        totalExpenses: totalExpensesWithCOGS,
        netProfit,
        profitMargin,
        dailyProfits,
        monthlyComparison: {
          currentMonth: {
            revenue: currentMonthRevenue,
            expenses: currentMonthExpensesTotal,
            profit: currentMonthProfit
          },
          previousMonth: {
            revenue: previousMonthRevenue,
            expenses: previousMonthExpensesTotal,
            profit: previousMonthProfit
          },
          growth
        }
      });

    } catch (error) {
      console.error('Error fetching profit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportColumns = [
    { header: 'Date', accessor: 'date' },
    { header: 'Revenue (UGX)', accessor: 'revenue' },
    { header: 'Expenses (UGX)', accessor: 'expenses' },
    { header: 'Profit (UGX)', accessor: 'profit' }
  ];

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

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
        <h1 className="text-3xl font-bold">Profit Analysis</h1>
        <p className="text-blue-100 mt-2">Track your business profitability and growth</p>
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
            data={profitData.dailyProfits}
            columns={exportColumns}
            filename={`profit-analysis-${filterPeriod}`}
            title={`Profit Analysis - ${filterPeriod}`}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">UGX {profitData.totalRevenue.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-red-600">UGX {profitData.totalExpenses.toLocaleString()}</p>
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
              <p className={`text-2xl font-bold ${profitData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                UGX {profitData.netProfit.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${profitData.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className={`text-2xl font-bold ${profitData.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitData.profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className={`p-3 rounded-xl ${profitData.profitMargin >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Comparison</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Previous Month</p>
            <div className="space-y-2">
              <p className="text-lg text-gray-900">Revenue: UGX {profitData.monthlyComparison.previousMonth.revenue.toLocaleString()}</p>
              <p className="text-lg text-gray-900">Expenses: UGX {profitData.monthlyComparison.previousMonth.expenses.toLocaleString()}</p>
              <p className={`text-xl font-bold ${profitData.monthlyComparison.previousMonth.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Profit: UGX {profitData.monthlyComparison.previousMonth.profit.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Current Month</p>
            <div className="space-y-2">
              <p className="text-lg text-gray-900">Revenue: UGX {profitData.monthlyComparison.currentMonth.revenue.toLocaleString()}</p>
              <p className="text-lg text-gray-900">Expenses: UGX {profitData.monthlyComparison.currentMonth.expenses.toLocaleString()}</p>
              <p className={`text-xl font-bold ${profitData.monthlyComparison.currentMonth.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Profit: UGX {profitData.monthlyComparison.currentMonth.profit.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Growth</p>
            <div className="flex items-center justify-center space-x-2">
              {getGrowthIcon(profitData.monthlyComparison.growth)}
              <p className={`text-2xl font-bold ${getGrowthColor(profitData.monthlyComparison.growth)}`}>
                {Math.abs(profitData.monthlyComparison.growth).toFixed(1)}%
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {profitData.monthlyComparison.growth > 0 ? 'Increase' : 
               profitData.monthlyComparison.growth < 0 ? 'Decrease' : 'No Change'}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Profit Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Profit Breakdown</h2>
        
        {profitData.dailyProfits.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No profit data available for the selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Revenue</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Expenses</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Profit</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Margin</th>
                </tr>
              </thead>
              <tbody>
                {profitData.dailyProfits.map((day) => {
                  const margin = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;
                  return (
                    <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-green-600 font-semibold">
                        UGX {day.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-red-600 font-semibold">
                        UGX {day.expenses.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 font-bold ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        UGX {day.profit.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profits;