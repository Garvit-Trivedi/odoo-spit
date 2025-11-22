import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiCheck, FiX } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import './Documents.css';

const Receipts = () => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const isStaff = user?.role === 'warehouse_staff';
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filters, setFilters] = useState({ status: '', warehouse: '' });
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchReceipts();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('/api/warehouses');
      setWarehouses(res.data.warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.warehouse) params.warehouse = filters.warehouse;

      const res = await axios.get('/api/receipts', { params });
      setReceipts(res.data.receipts);
    } catch (error) {
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedReceipt(null);
    setShowModal(true);
  };

  const handleView = async (id) => {
    try {
      const res = await axios.get(`/api/receipts/${id}`);
      setSelectedReceipt(res.data.receipt);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load receipt');
    }
  };

  const handleValidate = async (id) => {
    if (!window.confirm('Are you sure you want to validate this receipt? Stock will be updated.')) return;

    try {
      await axios.post(`/api/receipts/${id}/validate`);
      toast.success('Receipt validated successfully');
      fetchReceipts();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to validate receipt';
      console.error('Validation error:', error.response?.data);
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6b7280',
      waiting: '#f59e0b',
      ready: '#3b82f6',
      done: '#10b981',
      canceled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="documents-page">
      <div className="page-header">
        <div>
          <h1>Receipts</h1>
          <p>Manage incoming stock</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={handleCreate}>
            <FiPlus /> New Receipt
          </button>
        )}
      </div>

      <div className="filters-bar">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
        <select
          value={filters.warehouse}
          onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
        >
          <option value="">All Warehouses</option>
          {warehouses.map((wh) => (
            <option key={wh._id} value={wh._id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading receipts...</div>
      ) : (
        <div className="documents-table">
          <table>
            <thead>
              <tr>
                <th>Receipt Number</th>
                <th>Supplier</th>
                <th>Warehouse</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">No receipts found</td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt._id}>
                    <td>{receipt.receiptNumber}</td>
                    <td>{receipt.supplier}</td>
                    <td>{receipt.warehouse?.name || 'N/A'}</td>
                    <td>{receipt.items?.length || 0} items</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(receipt.status) + '20',
                          color: getStatusColor(receipt.status)
                        }}
                      >
                        {receipt.status}
                      </span>
                    </td>
                    <td>{new Date(receipt.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleView(receipt._id)} className="icon-btn">
                          <FiEye />
                        </button>
                        {receipt.status !== 'done' && isStaff && (
                          <button
                            onClick={() => handleValidate(receipt._id)}
                            className="icon-btn validate"
                            title="Validate"
                          >
                            <FiCheck />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => {
            setShowModal(false);
            setSelectedReceipt(null);
            fetchReceipts();
          }}
          warehouses={warehouses}
        />
      )}
    </div>
  );
};

export default Receipts;

