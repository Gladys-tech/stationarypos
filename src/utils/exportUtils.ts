import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportToPDF = (data: any[], columns: any[], title: string, filename: string) => {
  console.log('PDF Export - Starting export...');
  console.log('PDF Export - Data length:', data?.length);
  console.log('PDF Export - Columns:', columns);
  
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const doc = new jsPDF();
    
    // Add header with better spacing
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text(title, 14, 20);
    
    // Add date and summary info
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99); // Gray color
    doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 28);
    doc.text(`Total Records: ${data.length}`, 14, 34);
    
    // Prepare table data with safe property access
    const tableData = data.map(row => {
      console.log('Processing row:', row);
      return columns.map(col => {
        const value = getNestedValue(row, col.accessor);
        const formatted = formatValue(value);
        console.log(`Column ${col.accessor}: ${value} -> ${formatted}`);
        return formatted;
      });
    });
    
    console.log('PDF Table Data prepared:', tableData);
    
    // Create table with better formatting
    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: tableData,
      startY: 42,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [37, 99, 235], // Blue color
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light blue-gray
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Sale Number
        1: { cellWidth: 25 }, // Cashier
        2: { cellWidth: 20 }, // Date
        3: { cellWidth: 20 }, // Time
        4: { cellWidth: 35 }, // Product Name
        5: { cellWidth: 15 }, // Quantity
        6: { cellWidth: 20 }, // Unit Price
        7: { cellWidth: 20 }, // Item Total
        8: { cellWidth: 25 }, // Sale Subtotal
        9: { cellWidth: 15 }, // Tax
        10: { cellWidth: 25 }, // Sale Total
        11: { cellWidth: 20 }, // Payment Method
        12: { cellWidth: 25 }, // Customer Paid
        13: { cellWidth: 25 }, // Change Given
      },
      margin: { top: 42, left: 10, right: 10 },
      pageBreak: 'auto',
      showHead: 'everyPage',
      didDrawPage: function (data) {
        // Add page numbers
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      },
      didParseCell: function (data) {
        // Highlight sale total rows
        if (data.column.index === 10 && data.cell.raw && data.cell.raw !== '') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 240, 255];
        }
        
        // Style empty cells (for grouped data)
        if (data.cell.raw === '') {
          data.cell.styles.fillColor = [245, 245, 245];
        }
      }
    });
    
    // Add footer with summary
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text('End of Report', 14, finalY + 15);
    
    // Save the PDF
    doc.save(`${filename}.pdf`);
    console.log('PDF exported successfully');
    
  } catch (error) {
    console.error('PDF Export Error:', error);
    console.error('Error stack:', error.stack);
    alert(`Error exporting PDF: ${error.message}`);
  }
};

export const exportToCSV = (data: any[], columns: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = getNestedValue(row, col.accessor);
        const formattedValue = formatValue(value);
        // Escape commas and quotes in CSV
        return typeof formattedValue === 'string' && (formattedValue.includes(',') || formattedValue.includes('"')) 
          ? `"${formattedValue.replace(/"/g, '""')}"` 
          : formattedValue;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  } catch (error) {
    console.error('CSV Export Error:', error);
    alert(`Error exporting CSV: ${error.message}`);
  }
};

export const exportToExcel = (data: any[], columns: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(
      data.map(row => {
        const newRow: any = {};
        columns.forEach(col => {
          const value = getNestedValue(row, col.accessor);
          newRow[col.header] = formatValue(value);
        });
        return newRow;
      })
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
    alert(`Error exporting Excel: ${error.message}`);
  }
};

// Helper function to safely get nested values
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return '';
  
  try {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return '';
      return current[key] !== undefined ? current[key] : '';
    }, obj);
  } catch (error) {
    console.error('Error accessing nested value:', error, 'Path:', path, 'Object:', obj);
    return '';
  }
};

// Helper function to format values for export
const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'string') return value;
  return String(value);
};

export const getDateRange = (period: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday,
        end: today
      };
    case 'this-week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: startOfWeek,
        end: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };
    case 'last-month':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: lastMonth,
        end: endOfLastMonth
      };
    case 'last-year':
      const lastYear = new Date(today.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
      return {
        start: lastYear,
        end: endOfLastYear
      };
    default:
      return {
        start: new Date(0),
        end: now
      };
  }
};