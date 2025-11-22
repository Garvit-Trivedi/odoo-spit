import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';

/**
 * Export data to Excel
 */
export const exportToExcel = (data, filename = 'report', sheetName = 'Sheet1') => {
  try {
    if (!data || data.length === 0) {
      console.error('No data to export');
      throw new Error('No data to export');
    }

    // Filter out completely empty rows (rows where all values are empty)
    const filteredData = data.filter(row => {
      return Object.values(row).some(val => val !== '' && val !== null && val !== undefined);
    });

    if (filteredData.length === 0) {
      console.error('No valid data rows to export');
      throw new Error('No valid data rows to export');
    }

    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
  } catch (error) {
    console.error('Excel export error:', error);
    throw error;
  }
};

/**
 * Export stock valuation to Excel
 */
export const exportStockValuation = async (warehouseId = null, asOf = null) => {
  try {
    const params = {};
    if (warehouseId) params.warehouseId = warehouseId;
    if (asOf) params.asOf = asOf;

    const response = await axios.get('/api/reports/valuation', { params });
    const result = response.data;

    if (result.success && result.valuation) {
      const exportData = result.valuation.map(item => ({
        'Product Name': item.productName,
        'SKU': item.sku,
        'Category': item.category,
        'Warehouse': item.warehouseName,
        'Quantity': item.quantity,
        'Unit Price (Rs)': item.unitPrice,
        'Total Value (Rs)': item.totalValue
      }));

      // Add summary row
      exportData.push({});
      exportData.push({
        'Product Name': 'TOTAL',
        'Total Value (Rs)': result.summary.totalValue
      });

      const filename = `stock-valuation-${warehouseId || 'all'}-${asOf || new Date().toISOString().split('T')[0]}`;
      exportToExcel(exportData, filename, 'Stock Valuation');
    }
  } catch (error) {
    console.error('Error exporting stock valuation:', error);
    throw error;
  }
};

/**
 * Export stock trend to Excel
 */
export const exportStockTrend = async (warehouseId = null, from, to, groupBy = 'day', metric = 'units') => {
  try {
    const params = { from, to, groupBy, metric };
    if (warehouseId) params.warehouseId = warehouseId;

    const response = await axios.get('/api/reports/stock-trend', { params });
    const result = response.data;

    if (result.success && result.series) {
      const exportData = result.series.map(item => ({
        'Date': item.date,
        [metric === 'value' ? 'Value (Rs)' : 'Units']: item.value
      }));

      const filename = `stock-trend-${warehouseId || 'all'}-${from}-${to}`;
      exportToExcel(exportData, filename, 'Stock Trend');
    }
  } catch (error) {
    console.error('Error exporting stock trend:', error);
    throw error;
  }
};

/**
 * Export stock by category to Excel
 */
export const exportStockByCategory = async (warehouseId = null, asOf = null, metric = 'value') => {
  try {
    const params = { metric, topN: 20 };
    if (warehouseId) params.warehouseId = warehouseId;
    if (asOf) params.asOf = asOf;

    const response = await axios.get('/api/reports/stock-by-category', { params });
    const result = response.data;

    if (result.success && result.buckets) {
      const exportData = result.buckets.map(item => ({
        'Category': item.category,
        [metric === 'value' ? 'Value (Rs)' : 'Units']: item.value,
        'Percentage': `${item.percentOfTotal}%`
      }));

      exportData.push({});
      exportData.push({
        'Category': 'TOTAL',
        [metric === 'value' ? 'Value (Rs)' : 'Units']: result.total
      });

      const filename = `stock-by-category-${warehouseId || 'all'}-${asOf || new Date().toISOString().split('T')[0]}`;
      exportToExcel(exportData, filename, 'Stock by Category');
    }
  } catch (error) {
    console.error('Error exporting stock by category:', error);
    throw error;
  }
};

/**
 * Print report
 */
export const printReport = (title, data, columns) => {
  const printWindow = window.open('', '_blank');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background-color: #f9fafb; }
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(col => `<td>${row[col] || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.print();
};

