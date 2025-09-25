import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Receipt,
  Calendar,
  User
} from 'lucide-react';
import { supabase, Expense } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ExportButtons from '../components/ui/ExportButtons';
import { getDateRange } from '../utils/exportUtils';

interface ExpenseWithUser extends Expense {
  creator: { full_name: string };
}

const Expenses: React.FC = () => {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithUser | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'general',
    receipt_url: ''
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'office-supplies', label: 'Office Supplies' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'rent', label: 'Rent' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'travel', label: 'Travel' },
    { value: 'meals', label: 'Meals' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // First get expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
        setExpenses([]);
        return;
      }

      // Then get user profiles for creators
      const userIds = [...new Set(expensesData?.map(expense => expense.created_by).filter(Boolean))];
      
      let usersData = [];
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (!usersError) {
          usersData = users || [];
        }
      }

      // Combine the data
      const expensesWithCreators = expensesData?.map(expense => ({
        ...expense,
        creator: usersData.find(user => user.id === expense.created_by) || { full_name: 'Unknown User' }
      })) || [];

      setExpenses(expensesWithCreators);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          ...expenseForm,
          amount: parseInt(expenseForm.amount),
          created_by: user.id,
          receipt_url: expenseForm.receipt_url || null
        });

      if (error) throw error;

      setShowAddModal(false);
      setExpenseForm({
        description: '',
        amount: '',
        category: 'general',
        receipt_url: ''
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Error adding expense');
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingExpense) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          ...expenseForm,
          amount: parseInt(expenseForm.amount),
          receipt_url: expenseForm.receipt_url || null
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense');
    }
  };

  const openEditModal = (expense: ExpenseWithUser) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || 'general',
      receipt_url: expense.receipt_url || ''
    });
    setShowEditModal(true);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.creator?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || expense.category === filterCategory;
    
    if (filterPeriod === 'all') return matchesSearch && matchesCategory;
    
    const { start, end } = getDateRange(filterPeriod);
    const expenseDate = new Date(expense.created_at);
    const matchesPeriod = expenseDate >= start && expenseDate < end;
    
    return matchesSearch && matchesCategory && matchesPeriod;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const exportColumns = [
    { header: 'Description', accessor: 'description' },
    { header: 'Amount (UGX)', accessor: 'amount' },
    { header: 'Category', accessor: 'category' },
    { header: 'Created By', accessor: 'creator.full_name' },
    { header: 'Date', accessor: 'created_at' }
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
        <h1 className="text-3xl font-bold">Expense Management</h1>
        <p className="text-blue-100 mt-2">Track and manage business expenses</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Expenses ({filterPeriod})</p>
            <p className="text-3xl font-bold text-red-600">UGX {totalExpenses.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{filteredExpenses.length} transactions</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
            <div className="flex-1">
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories
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
              data={filteredExpenses}
              columns={exportColumns}
              filename={`expenses-${filterPeriod}`}
              title="Expense Report"
            />
            <Button
              onClick={() => setShowAddModal(true)}
              icon={Plus}
            >
              Add Expense
            </Button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No expenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Created By</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{expense.description}</div>
                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center mt-1"
                        >
                          <Receipt className="h-3 w-3 mr-1" />
                          View Receipt
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {expense.category?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-red-600">
                      UGX {expense.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        {expense.creator?.full_name}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(expense.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        {(profile?.role === 'admin' || expense.created_by === user?.id) && (
                          <>
                            <button
                              onClick={() => openEditModal(expense)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Expense"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Input
            label="Description"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
            placeholder="Enter expense description"
            required
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount (UGX)"
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
              placeholder="Enter amount"
              required
            />
            <Select
              label="Category"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
              options={categories}
            />
          </div>

          <Input
            label="Receipt URL (Optional)"
            value={expenseForm.receipt_url}
            onChange={(e) => setExpenseForm({...expenseForm, receipt_url: e.target.value})}
            placeholder="Enter receipt URL"
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Expense</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Expense"
      >
        <form onSubmit={handleEditExpense} className="space-y-4">
          <Input
            label="Description"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
            placeholder="Enter expense description"
            required
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount (UGX)"
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
              placeholder="Enter amount"
              required
            />
            <Select
              label="Category"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
              options={categories}
            />
          </div>

          <Input
            label="Receipt URL (Optional)"
            value={expenseForm.receipt_url}
            onChange={(e) => setExpenseForm({...expenseForm, receipt_url: e.target.value})}
            placeholder="Enter receipt URL"
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;