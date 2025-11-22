import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiEdit, FiMapPin, FiDownload, FiPrinter } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import LocationPicker from '../components/LocationPicker';
import { exportToExcel, printReport } from '../utils/exportUtils';
import './Stock.css';

const Stock = () => {
  const { warehouseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  
  const [warehouse, setWarehouse] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState(false);
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (!isManager) {
      toast.error('Access denied. Only managers can view warehouse details.');
      navigate('/settings');
      return;
    }
    fetchWarehouse();
    fetchStocks();
  }, [warehouseId, isManager, navigate]);

  const fetchWarehouse = async () => {
    try {
      const res = await axios.get(`/api/warehouses/${warehouseId}`);
      const warehouseData = res.data.warehouse;
      setWarehouse(warehouseData);
      setLocation(warehouseData.formattedAddress || warehouseData.location || '');
      setCoordinates(warehouseData.coordinates || null);
    } catch (error) {
      toast.error('Failed to load warehouse details');
      navigate('/settings');
    }
  };

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/warehouses/${warehouseId}/stock`);
      setStocks(res.data.stocks || []);
    } catch (error) {
      toast.error('Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (stockId, newQuantity) => {
    try {
      await axios.put(`/api/stock/${stockId}`, { quantity: newQuantity });
      toast.success('Stock updated successfully');
      fetchStocks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    }
  };

  const handleSaveLocation = async () => {
    try {
      setSavingLocation(true);
      await axios.put(`/api/warehouses/${warehouseId}`, {
        location,
        coordinates,
        formattedAddress: location
      });
      toast.success('Location updated successfully');
      setEditingLocation(false);
      fetchWarehouse();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update location');
    } finally {
      setSavingLocation(false);
    }
  };

  if (!warehouse) {
    return <div className="loading">Loading warehouse details...</div>;
  }

  return (
    <div className="stock-page">
      <div className="stock-header">
        <button className="back-btn" onClick={() => navigate('/settings')}>
          <FiArrowLeft /> Back to Warehouses
        </button>
        <div className="warehouse-info">
          <h1>{warehouse.name}</h1>
          <div className="location-section">
            {!editingLocation ? (
              <div className="location-display">
                <FiMapPin />
                <span>{location || 'No location set'}</span>
                <button className="edit-location-btn" onClick={() => setEditingLocation(true)}>
                  <FiEdit /> Edit Location
                </button>
              </div>
            ) : (
              <div className="location-edit">
                <LocationPicker
                  location={location}
                  coordinates={coordinates}
                  onLocationChange={setLocation}
                  onCoordinatesChange={setCoordinates}
                />
                <div className="location-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditingLocation(false);
                      setLocation(warehouse.formattedAddress || warehouse.location || '');
                      setCoordinates(warehouse.coordinates || null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSaveLocation}
                    disabled={savingLocation || !location}
                  >
                    {savingLocation ? 'Saving...' : 'Save Location'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stock-info-note">
        <p>This page contains the warehouse details & location.</p>
        <div className="report-actions">
          <button
            className="btn-export"
            onClick={() => {
              try {
                if (!stocks || stocks.length === 0) {
                  toast.error('No stock data to export');
                  return;
                }

                // Prepare export data matching the table format exactly
                const exportData = stocks.map(stock => {
                  const unitPrice = stock.product?.costPrice || 0;
                  const quantity = stock.quantity || 0;
                  const reservedQuantity = stock.reservedQuantity || 0;
                  const totalWorth = quantity * unitPrice;
                  const freeToUse = quantity - reservedQuantity;
                  const unitOfMeasure = stock.product?.unitOfMeasure || '';
                  
                  return {
                    'Product': stock.product?.name || 'N/A',
                    'SKU': stock.product?.sku || 'N/A',
                    'Per Unit Cost': `Rs ${unitPrice.toFixed(2)}`,
                    'On Hand': `${quantity} ${unitOfMeasure}`,
                    'Free to Use': `${freeToUse} ${unitOfMeasure}`,
                    'Total Worth': `Rs ${totalWorth.toFixed(2)}`
                  };
                });

                // Add summary row
                const totalWorth = stocks.reduce((sum, stock) => {
                  const unitPrice = stock.product?.costPrice || 0;
                  return sum + ((stock.quantity || 0) * unitPrice);
                }, 0);

                exportData.push({});
                exportData.push({
                  'Product': 'TOTAL',
                  'SKU': '',
                  'Per Unit Cost': '',
                  'On Hand': '',
                  'Free to Use': '',
                  'Total Worth': `Rs ${totalWorth.toFixed(2)}`
                });

                const filename = `stock-report-${warehouse.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`;
                exportToExcel(exportData, filename, 'Stock Report');
                toast.success('Report exported to Excel');
              } catch (error) {
                console.error('Export error:', error);
                toast.error('Failed to export report: ' + (error.message || 'Unknown error'));
              }
            }}
          >
            <FiDownload /> Export to Excel
          </button>
          <button
            className="btn-print"
            onClick={() => {
              const columns = ['Product', 'SKU', 'Per Unit Cost', 'On Hand', 'Free to Use', 'Total Worth'];
              const printData = stocks.map(stock => ({
                'Product': stock.product?.name || 'N/A',
                'SKU': stock.product?.sku || 'N/A',
                'Per Unit Cost': `Rs ${(stock.product?.costPrice || 0).toFixed(2)}`,
                'On Hand': `${stock.quantity || 0} ${stock.product?.unitOfMeasure || ''}`,
                'Free to Use': `${stock.quantity - (stock.reservedQuantity || 0)} ${stock.product?.unitOfMeasure || ''}`,
                'Total Worth': `Rs ${((stock.quantity || 0) * (stock.product?.costPrice || 0)).toFixed(2)}`
              }));
              printReport(`Stock Report - ${warehouse.name}`, printData, columns);
            }}
          >
            <FiPrinter /> Print Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading stock...</div>
      ) : (
        <div className="stock-table-container">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Per Unit Cost</th>
                <th>On Hand</th>
                <th>Free to Use</th>
                <th>Total Worth</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No stock found for this warehouse</td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const unitPrice = stock.product?.costPrice || 0;
                  const totalWorth = (stock.quantity || 0) * unitPrice;
                  return (
                    <tr key={stock._id}>
                      <td>
                        <div className="product-info">
                          <strong>{stock.product?.name || 'N/A'}</strong>
                          <span className="sku">{stock.product?.sku || ''}</span>
                        </div>
                      </td>
                      <td>Rs {unitPrice.toFixed(2)}</td>
                      <td>{stock.quantity || 0} {stock.product?.unitOfMeasure || ''}</td>
                      <td>{stock.quantity - (stock.reservedQuantity || 0)} {stock.product?.unitOfMeasure || ''}</td>
                      <td className="product-worth">Rs {totalWorth.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={stock.quantity || 0}
                          onBlur={(e) => {
                            const newQuantity = parseFloat(e.target.value);
                            if (!isNaN(newQuantity) && newQuantity >= 0 && newQuantity !== stock.quantity) {
                              handleUpdateStock(stock._id, newQuantity);
                            }
                          }}
                          className="stock-input"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Stock;

