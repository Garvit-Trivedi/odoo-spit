import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiFilter } from 'react-icons/fi';
import './Ledger.css';

const Ledger = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    product: '',
    warehouse: '',
    documentType: '',
    startDate: '',
    endDate: ''
  });
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    fetchLedger();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('/api/warehouses');
      setWarehouses(res.data.warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.product) params.product = filters.product;
      if (filters.warehouse) params.warehouse = filters.warehouse;
      if (filters.documentType) params.documentType = filters.documentType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await axios.get('/api/ledger', { params });
      setLedger(res.data.ledger);
    } catch (error) {
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const getDocumentTypeColor = (type) => {
    const colors = {
      receipt: '#10b981',
      delivery: '#ef4444',
      transfer_in: '#3b82f6',
      transfer_out: '#8b5cf6',
      adjustment: '#f59e0b',
      initial: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      receipt: 'Receipt',
      delivery: 'Delivery',
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
      adjustment: 'Adjustment',
      initial: 'Initial'
    };
    return labels[type] || type;
  };

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <h1>Stock Ledger</h1>
          <p>Complete movement history</p>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Product</label>
          <select
            value={filters.product}
            onChange={(e) => handleFilterChange('product', e.target.value)}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Warehouse</label>
          <select
            value={filters.warehouse}
            onChange={(e) => handleFilterChange('warehouse', e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Document Type</label>
          <select
            value={filters.documentType}
            onChange={(e) => handleFilterChange('documentType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="receipt">Receipt</option>
            <option value="delivery">Delivery</option>
            <option value="transfer_in">Transfer In</option>
            <option value="transfer_out">Transfer Out</option>
            <option value="adjustment">Adjustment</option>
            <option value="initial">Initial</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading ledger...</div>
      ) : (
        <div className="ledger-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Document Type</th>
                <th>Document Number</th>
                <th>Quantity</th>
                <th>Balance</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data">No ledger entries found</td>
                </tr>
              ) : (
                ledger.map((entry) => (
                  <tr key={entry._id}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>
                      {entry.product?.name || 'N/A'}
                      <br />
                      <small>{entry.product?.sku || ''}</small>
                    </td>
                    <td>{entry.warehouse?.name || 'N/A'}</td>
                    <td>
                      <span
                        className="document-type-badge"
                        style={{
                          backgroundColor: getDocumentTypeColor(entry.documentType) + '20',
                          color: getDocumentTypeColor(entry.documentType)
                        }}
                      >
                        {getDocumentTypeLabel(entry.documentType)}
                      </span>
                    </td>
                    <td>{entry.documentNumber}</td>
                    <td className={entry.quantity > 0 ? 'positive' : entry.quantity < 0 ? 'negative' : ''}>
                      {entry.quantity > 0 ? '+' : ''}{entry.quantity} {entry.product?.unitOfMeasure || ''}
                    </td>
                    <td className="balance">{entry.balance} {entry.product?.unitOfMeasure || ''}</td>
                    <td>{entry.reference || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Ledger;

