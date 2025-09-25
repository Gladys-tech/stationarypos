import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Eye,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import { supabase, Sale, SaleItem } from '../lib/supabase';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ExportButtons from '../components/ui/ExportButtons';
import { getDateRange } from '../utils/exportUtils';

interface SaleWithDetails extends Sale {
  cashier: { full_name: string };
  sale_items: (SaleItem & { product: { name: string } })[];
}

const Transactions: React.FC = () => {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      // First get sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (salesError) {
        console.error('Error fetching sales:', salesError);
        setSales([]);
        return;
      }

      if (!salesData || salesData.length === 0) {
        setSales([]);
        return;
      }

      // Get cashier details
      const cashierIds = [...new Set(salesData.map(sale => sale.cashier_id).filter(Boolean))];
      let cashiersData = [];
      
      if (cashierIds.length > 0) {
        const { data: cashiers, error: cashiersError } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', cashierIds);
        
        if (!cashiersError) {
          cashiersData = cashiers || [];
        }
      }

      // Get sale items for each sale
      const saleIds = salesData.map(sale => sale.id);
      let saleItemsData = [];
      let productsData = [];

      if (saleIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds);
        
        if (!itemsError && items) {
          saleItemsData = items;
          
          // Get product details
          const productIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];
          
          if (productIds.length > 0) {
            const { data: products, error: productsError } = await supabase
              .from('products')
              .select('id, name')
              .in('id', productIds);
            
            if (!productsError) {
              productsData = products || [];
            }
          }
        }
      }

      // Combine all data
      const salesWithDetails = salesData.map(sale => ({
        ...sale,
        cashier: cashiersData.find(cashier => cashier.id === sale.cashier_id) || { full_name: 'Unknown Cashier' },
        sale_items: saleItemsData
          .filter(item => item.sale_id === sale.id)
          .map(item => ({
            ...item,
            product: productsData.find(product => product.id === item.product_id) || { name: 'Unknown Product' }
          }))
      }));

      setSales(salesWithDetails);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sale.cashier?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterPeriod === 'all') return matchesSearch;
    
    const { start, end } = getDateRange(filterPeriod);
    const saleDate = new Date(sale.created_at);
    const matchesPeriod = saleDate >= start && saleDate < end;
    
    return matchesSearch && matchesPeriod;
  });

  const openDetailsModal = (sale: SaleWithDetails) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  // Prepare detailed export data with items
  const prepareDetailedExportData = () => {
    const detailedData: any[] = [];
    
    filteredSales.forEach(sale => {
      if (sale.sale_items && sale.sale_items.length > 0) {
        // Create a row for each item in the sale
        sale.sale_items.forEach((item, index) => {
          detailedData.push({
            sale_number: index === 0 ? sale.sale_number : '', // Only show sale number on first item
            cashier_name: index === 0 ? sale.cashier?.full_name || 'Unknown' : '',
            date: index === 0 ? new Date(sale.created_at).toLocaleDateString() : '',
            time: index === 0 ? new Date(sale.created_at).toLocaleTimeString() : '',
            product_name: item.product?.name || 'Unknown Product',
            quantity: item.quantity,
            unit_price: item.unit_price,
            item_total: item.total_price,
            sale_subtotal: index === 0 ? sale.subtotal : '',
            sale_tax: index === 0 ? sale.tax_amount : '',
            sale_total: index === 0 ? sale.total_amount : '',
            payment_method: index === 0 ? sale.payment_method : '',
            customer_paid: index === 0 ? sale.customer_paid : '',
            change_given: index === 0 ? sale.change_given : ''
          });
        });
      } else {
        // If no items, still show the sale
        detailedData.push({
          sale_number: sale.sale_number,
          cashier_name: sale.cashier?.full_name || 'Unknown',
          date: new Date(sale.created_at).toLocaleDateString(),
          time: new Date(sale.created_at).toLocaleTimeString(),
          product_name: 'No items',
          quantity: 0,
          unit_price: 0,
          item_total: 0,
          sale_subtotal: sale.subtotal,
          sale_tax: sale.tax_amount,
          sale_total: sale.total_amount,
          payment_method: sale.payment_method,
          customer_paid: sale.customer_paid,
          change_given: sale.change_given
        });
      }
    });
    
    return detailedData;
  };

  const exportColumns = [
    { header: 'Sale Number', accessor: 'sale_number' },
    { header: 'Cashier', accessor: 'cashier_name' },
    { header: 'Date', accessor: 'date' },
    { header: 'Time', accessor: 'time' },
    { header: 'Product Name', accessor: 'product_name' },
    { header: 'Quantity', accessor: 'quantity' },
    { header: 'Unit Price (UGX)', accessor: 'unit_price' },
    { header: 'Item Total (UGX)', accessor: 'item_total' },
    { header: 'Sale Subtotal (UGX)', accessor: 'sale_subtotal' },
    { header: 'Tax (UGX)', accessor: 'sale_tax' },
    { header: 'Sale Total (UGX)', accessor: 'sale_total' },
    { header: 'Payment Method', accessor: 'payment_method' },
    { header: 'Customer Paid (UGX)', accessor: 'customer_paid' },
    { header: 'Change Given (UGX)', accessor: 'change_given' }
  ];

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalTax = filteredSales.reduce((sum, sale) => sum + sale.tax_amount, 0);

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
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-blue-100 mt-2">View and manage all sales transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{filteredSales.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">UGX {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tax Collected</p>
              <p className="text-2xl font-bold text-gray-900">UGX {totalTax.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
            <div className="flex-1">
              <Input
                placeholder="Search by sale number or cashier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>
            <Select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'this-week', label: 'This Week' },
                { value: 'last-month', label: 'Last Month' },
                { value: 'last-year', label: 'Last Year' }
              ]}
            />
          </div>
          
          <ExportButtons
            data={prepareDetailedExportData()}
            columns={exportColumns}
            filename={`transactions-${filterPeriod}`}
            title="Detailed Transaction Report"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Sale #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Cashier</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Items</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Payment</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-blue-600">{sale.sale_number}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        {sale.cashier?.full_name}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-600">{sale.sale_items?.length || 0} items</span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-semibold text-gray-900">
                          UGX {sale.total_amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Tax: UGX {sale.tax_amount.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(sale.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => openDetailsModal(sale)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Sale Details - ${selectedSale?.sale_number}`}
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Sale Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Sale Number</label>
                <p className="text-lg font-semibold text-blue-600">{selectedSale.sale_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cashier</label>
                <p className="text-lg">{selectedSale.cashier?.full_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="text-lg">{new Date(selectedSale.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <p className="text-lg capitalize">{selectedSale.payment_method}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Items Purchased</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Qty</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Price</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.sale_items?.map((item) => (
                      <tr key={item.id} className="border-t border-gray-200">
                        <td className="py-3 px-4">{item.product?.name}</td>
                        <td className="py-3 px-4">{item.quantity}</td>
                        <td className="py-3 px-4">UGX {item.unit_price.toLocaleString()}</td>
                        <td className="py-3 px-4 font-semibold">UGX {item.total_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>UGX {selectedSale.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (18%):</span>
                <span>UGX {selectedSale.tax_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span>Total:</span>
                <span>UGX {selectedSale.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span>UGX {selectedSale.customer_paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Change Given:</span>
                <span>UGX {selectedSale.change_given.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Transactions;