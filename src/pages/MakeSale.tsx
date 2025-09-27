import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Calculator,
  Scan,
  Receipt,
  X
} from 'lucide-react';
import { supabase, Product, Sale } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

interface CartItem extends Product {
  quantity: number;
  total: number;
}

const MakeSale: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Calculator modal state
  const [showCalculator, setShowCalculator] = useState(false);
  const [customerPaid, setCustomerPaid] = useState('');
  const [calculatorTotal, setCalculatorTotal] = useState(0);
  
  // Receipt modal state
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Tax rate (18% VAT in Uganda)
  const TAX_RATE = 0.0; // Set to 0% as requested

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    setCalculatorTotal(total);
  }, [cart]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name)
        `)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  ).slice(0, 10); // Limit to 10 results for better performance

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        updateQuantity(product.id, existingItem.quantity + 1);
      } else {
        alert('Insufficient stock!');
      }
    } else {
      if (product.stock_quantity > 0) {
        const cartItem: CartItem = {
          ...product,
          quantity: 1,
          total: product.unit_price
        };
        setCart([...cart, cartItem]);
      } else {
        alert('Product out of stock!');
      }
    }
    setSearchTerm('');
    setShowProductList(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      addToCart(filteredProducts[0]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === productId) {
        const maxQuantity = item.stock_quantity;
        const quantity = Math.min(newQuantity, maxQuantity);
        return {
          ...item,
          quantity,
          total: quantity * item.unit_price
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = Math.round(subtotal * TAX_RATE);
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const processSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (!user) {
      alert('User not authenticated!');
      return;
    }

    setProcessing(true);

    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const saleNumber = `SALE-${Date.now()}`;
      
      const paidAmount = parseFloat(customerPaid) || total;
      const change = Math.max(0, paidAmount - total);

      // Create sale record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_number: saleNumber,
          cashier_id: user.id,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          customer_paid: paidAmount,
          change_given: change,
          payment_method: 'cash'
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of cart) {
        await supabase
          .from('products')
          .update({
            stock_quantity: item.stock_quantity - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }

      // Show receipt and reset
      setLastSale(sale);
      setShowReceipt(true);
      setCart([]);
      setCustomerPaid('');
      setShowCalculator(false);
      await fetchProducts(); // Refresh products to update stock

    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error processing sale. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Make a Sale</h1>
        
        {/* Search Bar */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                placeholder="Search products by name or barcode..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowProductList(e.target.value.length > 0);
                }}
                onKeyPress={handleKeyPress}
                icon={Search}
              />
              
              {/* Product Search Results */}
              {showProductList && searchTerm && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            Stock: {product.stock_quantity} | UGX {product.unit_price.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.stock_quantity > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button icon={Scan} variant="outline">
            Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Products</h3>
              <p className="text-gray-500">
                Use the search bar above to find products by name or barcode.
                <br />
                Click on a product or press Enter to add it to your cart.
              </p>
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Cart</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">UGX {item.unit_price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 rounded-full hover:bg-red-100 text-red-600 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>UGX {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (18%):</span>
                    <span>UGX {taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total:</span>
                    <span>UGX {total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <Button
                    onClick={() => setShowCalculator(true)}
                    icon={Calculator}
                    variant="outline"
                    className="w-full"
                  >
                    Calculator
                  </Button>
                  <Button
                    onClick={processSale}
                    loading={processing}
                    icon={Receipt}
                    className="w-full"
                  >
                    Process Sale
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Change Calculator</h3>
              <button
                onClick={() => setShowCalculator(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Amount</div>
                <div className="text-2xl font-bold text-blue-600">
                  UGX {(calculatorTotal + Math.round(calculatorTotal * TAX_RATE)).toLocaleString()}
                </div>
              </div>

              <Input
                label="Amount Customer Paid"
                type="number"
                value={customerPaid}
                onChange={(e) => setCustomerPaid(e.target.value)}
                placeholder="Enter amount paid"
              />

              {customerPaid && parseFloat(customerPaid) >= calculatorTotal && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Change to Give</div>
                  <div className="text-2xl font-bold text-green-700">
                    UGX {(parseFloat(customerPaid) - (calculatorTotal + Math.round(calculatorTotal * TAX_RATE))).toLocaleString()}
                  </div>
                </div>
              )}

              {customerPaid && parseFloat(customerPaid) < calculatorTotal && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600">Insufficient Payment</div>
                  <div className="text-lg font-semibold text-red-700">
                    Need UGX {((calculatorTotal + Math.round(calculatorTotal * TAX_RATE)) - parseFloat(customerPaid)).toLocaleString()} more
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Sale Complete!</h3>
              <p className="text-gray-600">Receipt #{lastSale.sale_number}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>UGX {lastSale.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>UGX {lastSale.tax_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>UGX {lastSale.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span>UGX {lastSale.customer_paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Change:</span>
                <span>UGX {lastSale.change_given.toLocaleString()}</span>
              </div>
            </div>

            <Button
              onClick={() => {
                window.print();
                setShowReceipt(false);
              }}
              className="w-full mt-6"
            >
              Print Receipt
            </Button>
            <Button
              onClick={() => setShowReceipt(false)}
              variant="outline"
              className="w-full mt-2"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MakeSale;