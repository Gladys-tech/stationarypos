import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ElectronAPI {
  getVersion: () => Promise<string>;
  showMessageBox: (options: any) => Promise<any>;
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;
  onNavigateTo: (callback: (event: any, path: string) => void) => void;
  removeNavigateToListener: () => void;
  onBackupData: (callback: (event: any, filePath: string) => void) => void;
  onImportData: (callback: (event: any, filePath: string) => void) => void;
  removeDataListeners: () => void;
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [version, setVersion] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkElectron = async () => {
      if (window.electronAPI) {
        setIsElectron(true);
        try {
          const appVersion = await window.electronAPI.getVersion();
          setVersion(appVersion);
        } catch (error) {
          console.error('Error getting app version:', error);
        }
      }
    };

    checkElectron();
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Handle navigation from menu
    const handleNavigate = (event: any, path: string) => {
      navigate(path);
    };

    // Handle data backup
    const handleBackup = async (event: any, filePath: string) => {
      try {
        // You can implement backup logic here
        // For now, we'll show a placeholder
        await window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Backup',
          message: 'Backup functionality will be implemented here',
          detail: `Backup would be saved to: ${filePath}`
        });
      } catch (error) {
        console.error('Backup error:', error);
      }
    };

    // Handle data import
    const handleImport = async (event: any, filePath: string) => {
      try {
        // You can implement import logic here
        await window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Import',
          message: 'Import functionality will be implemented here',
          detail: `Import from: ${filePath}`
        });
      } catch (error) {
        console.error('Import error:', error);
      }
    };

    window.electronAPI.onNavigateTo(handleNavigate);
    window.electronAPI.onBackupData(handleBackup);
    window.electronAPI.onImportData(handleImport);

    return () => {
      window.electronAPI?.removeNavigateToListener();
      window.electronAPI?.removeDataListeners();
    };
  }, [navigate]);

  const showMessageBox = async (options: any) => {
    if (window.electronAPI) {
      return await window.electronAPI.showMessageBox(options);
    }
    return null;
  };

  const showSaveDialog = async (options: any) => {
    if (window.electronAPI) {
      return await window.electronAPI.showSaveDialog(options);
    }
    return null;
  };

  const showOpenDialog = async (options: any) => {
    if (window.electronAPI) {
      return await window.electronAPI.showOpenDialog(options);
    }
    return null;
  };

  return {
    isElectron,
    version,
    showMessageBox,
    showSaveDialog,
    showOpenDialog,
    platform: window.electronAPI?.platform || 'web'
  };
};