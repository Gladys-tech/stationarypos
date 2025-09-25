import React from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import Button from './Button';
import { exportToPDF, exportToCSV, exportToExcel } from '../../utils/exportUtils';

interface ExportButtonsProps {
  data: any[];
  columns: any[];
  filename: string;
  title: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ 
  data, 
  columns, 
  filename, 
  title 
}) => {
  const handleExportPDF = () => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    console.log('Exporting PDF with data:', data.length, 'rows');
    exportToPDF(data, columns, title, filename);
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    exportToCSV(data, columns, filename);
  };

  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    exportToExcel(data, columns, filename);
  };

  return (
    <div className="flex space-x-2">
      <Button
        onClick={handleExportPDF}
        variant="outline"
        size="sm"
        icon={FileText}
        className="border-blue-600 text-blue-600 hover:bg-blue-50"
      >
        PDF
      </Button>
      <Button
        onClick={handleExportCSV}
        variant="outline"
        size="sm"
        icon={File}
        className="border-green-600 text-green-600 hover:bg-green-50"
      >
        CSV
      </Button>
      <Button
        onClick={handleExportExcel}
        variant="outline"
        size="sm"
        icon={FileSpreadsheet}
        className="border-orange-600 text-orange-600 hover:bg-orange-50"
      >
        Excel
      </Button>
    </div>
  );
};

export default ExportButtons;