import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MakeSale from './pages/MakeSale';
import Profile from './pages/Profile';
import Inventory from './pages/Inventory';
import Transactions from './pages/Transactions';
import Expenses from './pages/Expenses';
import AddCashier from './pages/AddCashier';
import Reports from './pages/Reports';
import Profits from './pages/Profits';
import OfflineIndicator from './components/ui/OfflineIndicator';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Route component that checks for admin role
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <OfflineIndicator />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <Layout requireAuth={false}>
              <Login />
            </Layout>
          } />
          
          {/* Admin signup - accessible without authentication */}
          <Route path="/signup" element={
            <Layout requireAuth={false}>
              <Signup />
            </Layout>
          } />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />

          <Route path="/make-sale" element={
            <Layout>
              <MakeSale />
            </Layout>
          } />

          <Route path="/profile" element={
            <Layout>
              <Profile />
            </Layout>
          } />

          {/* Admin-only routes */}
          <Route path="/inventory" element={
            <Layout>
              <AdminRoute>
                <Inventory />
              </AdminRoute>
            </Layout>
          } />

          <Route path="/add-cashier" element={
            <Layout>
              <AdminRoute>
                <AddCashier />
              </AdminRoute>
            </Layout>
          } />

          <Route path="/reports" element={
            <Layout>
              <AdminRoute>
                <Reports />
              </AdminRoute>
            </Layout>
          } />

          <Route path="/profits" element={
            <Layout>
              <AdminRoute>
                <Profits />
              </AdminRoute>
            </Layout>
          } />

          {/* Shared routes with different access levels */}
          <Route path="/transactions" element={
            <Layout>
              <Transactions />
            </Layout>
          } />

          <Route path="/expenses" element={
            <Layout>
              <Expenses />
            </Layout>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;