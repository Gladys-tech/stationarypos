import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // Dialog methods
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Navigation
  onNavigateTo: (callback) => ipcRenderer.on('navigate-to', callback),
  removeNavigateToListener: () => ipcRenderer.removeAllListeners('navigate-to'),
  
  // Data operations
  onBackupData: (callback) => ipcRenderer.on('backup-data', callback),
  onImportData: (callback) => ipcRenderer.on('import-data', callback),
  removeDataListeners: () => {
    ipcRenderer.removeAllListeners('backup-data');
    ipcRenderer.removeAllListeners('import-data');
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true
});

// Prevent navigation away from the app
window.addEventListener('beforeunload', (event) => {
  // Allow navigation within the app
  return;
});