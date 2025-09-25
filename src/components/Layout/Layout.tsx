import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from './Navbar';
import ElectronTitleBar from './ElectronTitleBar';
import LoadingSpinner from '../ui/LoadingSpinner';

interface LayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  requireAuth = true, 
  requireAdmin = false 
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!requireAuth) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectronTitleBar />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;