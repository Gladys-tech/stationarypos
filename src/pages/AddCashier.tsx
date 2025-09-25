import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Users, 
  Search, 
  Edit, 
  Trash2,
  Mail,
  User,
  Shield
} from 'lucide-react';
import { supabase, UserProfile } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';

const AddCashier: React.FC = () => {
  const { signUp } = useAuth();
  const [cashiers, setCashiers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCashier, setEditingCashier] = useState<UserProfile | null>(null);

  const [cashierForm, setCashierForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'cashier' as 'admin' | 'cashier'
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'cashier' as 'admin' | 'cashier'
  });

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCashiers(data || []);
    } catch (error) {
      console.error('Error fetching cashiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await signUp(
        cashierForm.email,
        cashierForm.password,
        cashierForm.full_name,
        cashierForm.role
      );

      if (error) {
        console.error('Error creating user:', error);
        alert(`Error creating user: ${error}`);
        return;
      }

      setShowAddModal(false);
      setCashierForm({
        email: '',
        password: '',
        full_name: '',
        role: 'cashier'
      });
      
      alert('User created successfully!');
      // Refresh the list after a short delay to allow for user creation
      setTimeout(() => {
        fetchCashiers();
      }, 1000);
      
    } catch (error) {
      console.error('Error adding cashier:', error);
      alert('Error adding cashier');
    }
  };

  const handleEditCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCashier) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editForm.full_name,
          role: editForm.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCashier.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingCashier(null);
      fetchCashiers();
    } catch (error) {
      console.error('Error updating cashier:', error);
      alert('Error updating cashier');
    }
  };

  const handleDeleteCashier = async (cashierId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      // Delete from user_profiles first (this will cascade to auth.users due to foreign key)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', cashierId);

      if (error) throw error;
      fetchCashiers();
    } catch (error) {
      console.error('Error deleting cashier:', error);
      alert('Error deleting cashier');
    }
  };

  const openEditModal = (cashier: UserProfile) => {
    setEditingCashier(cashier);
    setEditForm({
      full_name: cashier.full_name,
      role: cashier.role
    });
    setShowEditModal(true);
  };

  const filteredCashiers = cashiers.filter(cashier =>
    cashier.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cashier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminCount = cashiers.filter(user => user.role === 'admin').length;
  const cashierCount = cashiers.filter(user => user.role === 'cashier').length;

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
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-blue-100 mt-2">Manage system users and their roles</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{cashiers.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Administrators</p>
              <p className="text-2xl font-bold text-gray-900">{adminCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cashiers</p>
              <p className="text-2xl font-bold text-gray-900">{cashierCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500">
              <User className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          
          <Button
            onClick={() => setShowAddModal(true)}
            icon={UserPlus}
          >
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {filteredCashiers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCashiers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="font-medium text-gray-900">{user.full_name}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {user.email}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'admin' ? (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            Administrator
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3 mr-1" />
                            Cashier
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString() + ' ' + 
                          new Date(user.last_login).toLocaleTimeString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCashier(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
      >
        <form onSubmit={handleAddCashier} className="space-y-4">
          <Input
            label="Full Name"
            value={cashierForm.full_name}
            onChange={(e) => setCashierForm({...cashierForm, full_name: e.target.value})}
            placeholder="Enter full name"
            required
          />
          
          <Input
            label="Email Address"
            type="email"
            value={cashierForm.email}
            onChange={(e) => setCashierForm({...cashierForm, email: e.target.value})}
            placeholder="Enter email address"
            required
          />

          <Input
            label="Password"
            type="password"
            value={cashierForm.password}
            onChange={(e) => setCashierForm({...cashierForm, password: e.target.value})}
            placeholder="Enter password"
            required
          />

          <Select
            label="Role"
            value={cashierForm.role}
            onChange={(e) => setCashierForm({...cashierForm, role: e.target.value as 'admin' | 'cashier'})}
            options={[
              { value: 'cashier', label: 'Cashier' },
              { value: 'admin', label: 'Administrator' }
            ]}
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add User</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
      >
        <form onSubmit={handleEditCashier} className="space-y-4">
          <Input
            label="Full Name"
            value={editForm.full_name}
            onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
            placeholder="Enter full name"
            required
          />

          <Select
            label="Role"
            value={editForm.role}
            onChange={(e) => setEditForm({...editForm, role: e.target.value as 'admin' | 'cashier'})}
            options={[
              { value: 'cashier', label: 'Cashier' },
              { value: 'admin', label: 'Administrator' }
            ]}
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AddCashier;