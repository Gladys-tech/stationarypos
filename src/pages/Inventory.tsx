import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Filter,
  Download
} from 'lucide-react';
import { supabase, Product, Category } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ExportButtons from '../components/ui/ExportButtons';
import { getDateRange } from '../utils/exportUtils';

const Inventory: React.FC = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterPeriod, setFilterPeriod] = useState('all');

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: '',
    barcode: '',
    buying_price: '',
    unit_price: '',
    stock_quantity: '',
    low_stock_threshold: '10'
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('products')
        .insert({
          ...productForm,
          buying_price: parseInt(productForm.buying_price),
          unit_price: parseInt(productForm.unit_price),
          stock_quantity: parseInt(productForm.stock_quantity),
          low_stock_threshold: parseInt(productForm.low_stock_threshold),
          category_id: productForm.category_id || null,
          barcode: productForm.barcode || null
        });

      if (error) throw error;

      setShowAddModal(false);
      setProductForm({
        name: '',
        description: '',
        category_id: '',
        barcode: '',
        buying_price: '',
        unit_price: '',
        stock_quantity: '',
        low_stock_threshold: '10'
      });
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product');
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...productForm,
          buying_price: parseInt(productForm.buying_price),
          unit_price: parseInt(productForm.unit_price),
          stock_quantity: parseInt(productForm.stock_quantity),
          low_stock_threshold: parseInt(productForm.low_stock_threshold),
          category_id: productForm.category_id || null,
          barcode: productForm.barcode || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('categories')
        .insert(categoryForm);

      if (error) throw error;

      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      barcode: product.barcode || '',
      buying_price: product.buying_price?.toString() || '0',
      unit_price: product.unit_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold?.toString() || '10'
    });
    setShowEditModal(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchTerm));
    
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    
    if (filterPeriod === 'all') return matchesSearch && matchesCategory;
    
    const { start, end } = getDateRange(filterPeriod);
    const productDate = new Date(product.created_at);
    const matchesPeriod = productDate >= start && productDate <= end;
    
    return matchesSearch && matchesCategory && matchesPeriod;
  });

  const exportColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Category', accessor: 'category.name' },
    { header: 'Buying Price (UGX)', accessor: 'buying_price' },
    { header: 'Price (UGX)', accessor: 'unit_price' },
    { header: 'Stock', accessor: 'stock_quantity' },
    { header: 'Low Stock Alert', accessor: 'low_stock_threshold' },
    { header: 'Created', accessor: 'created_at' }
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
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-blue-100 mt-2">Manage your products and categories</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
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
          
          <div className="flex space-x-2">
            <ExportButtons
              data={filteredProducts}
              columns={exportColumns}
              filename={`inventory-${filterPeriod}`}
              title="Inventory Report"
            />
            {profile?.role === 'admin' && (
              <>
                <Button
                  onClick={() => setShowCategoryModal(true)}
                  variant="outline"
                  icon={Plus}
                >
                  Add Category
                </Button>
                <Button
                  onClick={() => setShowAddModal(true)}
                  icon={Plus}
                >
                  Add Product
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Buying Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  {profile?.role === 'admin' && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500">{product.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {product.category?.name || 'Uncategorized'}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      UGX {product.buying_price?.toLocaleString() || '0'}
                    </td>
                    <td className="py-4 px-4 font-semibold text-blue-600">
                      UGX {product.unit_price.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium">{product.stock_quantity}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.stock_quantity === 0
                          ? 'bg-red-100 text-red-800'
                          : product.stock_quantity <= (product.low_stock_threshold || 10)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.stock_quantity === 0 ? (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Out of Stock
                          </>
                        ) : product.stock_quantity <= (product.low_stock_threshold || 10) ? (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </>
                        ) : (
                          'In Stock'
                        )}
                      </span>
                    </td>
                    {profile?.role === 'admin' && (
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
        size="lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              value={productForm.name}
              onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              required
            />
            <Select
              label="Category"
              value={productForm.category_id}
              onChange={(e) => setProductForm({...productForm, category_id: e.target.value})}
              options={[
                { value: '', label: 'Select Category' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
            <Input
              label="Barcode (Optional)"
              value={productForm.barcode}
              onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
            />
            <Input
              label="Buying Price (UGX)"
              type="number"
              value={productForm.buying_price}
              onChange={(e) => setProductForm({...productForm, buying_price: e.target.value})}
              required
            />
            <Input
              label="Unit Price (UGX)"
              type="number"
              value={productForm.unit_price}
              onChange={(e) => setProductForm({...productForm, unit_price: e.target.value})}
              required
            />
            <Input
              label="Stock Quantity"
              type="number"
              value={productForm.stock_quantity}
              onChange={(e) => setProductForm({...productForm, stock_quantity: e.target.value})}
              required
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              value={productForm.low_stock_threshold}
              onChange={(e) => setProductForm({...productForm, low_stock_threshold: e.target.value})}
            />
          </div>
          <Input
            label="Description (Optional)"
            value={productForm.description}
            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
          />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Product</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product"
        size="lg"
      >
        <form onSubmit={handleEditProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              value={productForm.name}
              onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              required
            />
            <Select
              label="Category"
              value={productForm.category_id}
              onChange={(e) => setProductForm({...productForm, category_id: e.target.value})}
              options={[
                { value: '', label: 'Select Category' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
            <Input
              label="Barcode (Optional)"
              value={productForm.barcode}
              onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
            />
            <Input
              label="Buying Price (UGX)"
              type="number"
              value={productForm.buying_price}
              onChange={(e) => setProductForm({...productForm, buying_price: e.target.value})}
              required
            />
            <Input
              label="Unit Price (UGX)"
              type="number"
              value={productForm.unit_price}
              onChange={(e) => setProductForm({...productForm, unit_price: e.target.value})}
              required
            />
            <Input
              label="Stock Quantity"
              type="number"
              value={productForm.stock_quantity}
              onChange={(e) => setProductForm({...productForm, stock_quantity: e.target.value})}
              required
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              value={productForm.low_stock_threshold}
              onChange={(e) => setProductForm({...productForm, low_stock_threshold: e.target.value})}
            />
          </div>
          <Input
            label="Description (Optional)"
            value={productForm.description}
            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
          />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Product</Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Add New Category"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <Input
            label="Category Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
            required
          />
          <Input
            label="Description (Optional)"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
          />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCategoryModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;