import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiCheck } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import AdjustmentModal from '../components/AdjustmentModal';
import './Documents.css';

const Adjustments = () => {
  const { user } = useContext(AuthContext);
  const isStaff = user?.role === 'warehouse_staff';
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [filters, setFilters] = useState({ status: '', warehouse: '' });
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchAdjustments();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('/api/warehouses');
      setWarehouses(res.data.warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.warehouse) params.warehouse = filters.warehouse;

      const res = await axios.get('/api/adjustments', { params });
      setAdjustments(res.data.adjustments);
    } catch (error) {
      toast.error('Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAdjustment(null);
    setShowModal(true);
  };

  const handleView = async (id) => {
    try {
      const res = await axios.get(`/api/adjustments/${id}`);
      setSelectedAdjustment(res.data.adjustment);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load adjustment');
    }
  };

  const handleValidate = async (id) => {
    if (!window.confirm('Are you sure you want to validate this adjustment? Stock will be updated.')) return;

    try {
      await axios.post(`/api/adjustments/${id}/validate`);
      toast.success('Adjustment validated successfully');
      fetchAdjustments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to validate adjustment');
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
          <h1>Stock Adjustments</h1>
          <p>Fix stock discrepancies</p>
        </div>
        {isStaff && (
          <button className="btn-primary" onClick={handleCreate}>
            <FiPlus /> New Adjustment
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
        <div className="loading">Loading adjustments...</div>
      ) : (
        <div className="documents-table">
          <table>
            <thead>
              <tr>
                <th>Adjustment #</th>
                <th>SKU</th>
                <th>Warehouse</th>
                <th>Before Count (Actual)</th>
                <th>Counted</th>
                <th>Difference</th>
                <th>Date</th>
                <th>Status</th>
                <th>Validated By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-data">No adjustments found</td>
                </tr>
              ) : (
                adjustments.flatMap((adjustment) =>
                  adjustment.items?.map((item, itemIndex) => (
                    <tr key={`${adjustment._id}-${itemIndex}`}>
                      <td>{itemIndex === 0 ? adjustment.adjustmentNumber : ''}</td>
                      <td>{item.product?.sku || 'N/A'}</td>
                      <td>{adjustment.warehouse?.name || 'N/A'}</td>
                      <td>{item.recordedQuantity || 0}</td>
                      <td>{item.countedQuantity || 0}</td>
                      <td className={item.difference > 0 ? 'positive' : item.difference < 0 ? 'negative' : ''}>
                        {item.difference > 0 ? '+' : ''}{item.difference || 0}
                      </td>
                      <td>{new Date(adjustment.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: getStatusColor(adjustment.status) + '20',
                            color: getStatusColor(adjustment.status)
                          }}
                        >
                          {adjustment.status}
                        </span>
                      </td>
                      <td>{adjustment.validatedBy?.name || '-'}</td>
                      <td>
                        {itemIndex === 0 && (
                          <div className="action-buttons">
                            <button onClick={() => handleView(adjustment._id)} className="icon-btn">
                              <FiEye />
                            </button>
                            {adjustment.status !== 'done' && isStaff && (
                              <button
                                onClick={() => handleValidate(adjustment._id)}
                                className="icon-btn validate"
                                title="Validate"
                              >
                                <FiCheck />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )) || []
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AdjustmentModal
          adjustment={selectedAdjustment}
          onClose={() => {
            setShowModal(false);
            setSelectedAdjustment(null);
            fetchAdjustments();
          }}
          warehouses={warehouses}
        />
      )}
    </div>
  );
};

export default Adjustments;

