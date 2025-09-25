import React from 'react';
import { useElectron } from '../../hooks/useElectron';

const ElectronTitleBar: React.FC = () => {
  const { isElectron, version } = useElectron();

  if (!isElectron) return null;

  return (
    <div className="bg-gray-800 text-white px-4 py-1 text-xs flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <span className="font-semibold">StaPOS Desktop</span>
        <span className="text-gray-300">v{version}</span>
      </div>
      <div className="text-gray-300">
        Offline Mode
      </div>
    </div>
  );
};

export default ElectronTitleBar;