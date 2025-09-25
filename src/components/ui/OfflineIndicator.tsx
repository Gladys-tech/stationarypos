import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && window.electronAPI?.isElectron);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isElectron) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">Desktop Mode</span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <Wifi className="h-4 w-4" />
        <span className="text-sm font-medium">Online</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;