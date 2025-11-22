import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiCheck } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import DeliveryModal from '../components/DeliveryModal';
import './Documents.css';

const Deliveries = () => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const isStaff = user?.role === 'warehouse_staff';
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [filters, setFilters] = useState({ status: '', warehouse: '' });
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchDeliveries();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('/api/warehouses');
      setWarehouses(res.data.warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.warehouse) params.warehouse = filters.warehouse;

      const res = await axios.get('/api/deliveries', { params });
      setDeliveries(res.data.deliveries);
    } catch (error) {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedDelivery(null);
    setShowModal(true);
  };

  const handleView = async (id) => {
    try {
      const res = await axios.get(`/api/deliveries/${id}`);
      setSelectedDelivery(res.data.delivery);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load delivery');
    }
  };

  const handleValidate = async (id) => {
    if (!window.confirm('Are you sure you want to validate this delivery? Stock will be decreased.')) return;

    try {
      await axios.post(`/api/deliveries/${id}/validate`);
      toast.success('Delivery validated successfully');
      fetchDeliveries();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to validate delivery';
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
          <h1>Delivery Orders</h1>
          <p>Manage outgoing stock</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={handleCreate}>
            <FiPlus /> New Delivery
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
        <div className="loading">Loading deliveries...</div>
      ) : (
        <div className="documents-table">
          <table>
            <thead>
              <tr>
                <th>Delivery Number</th>
                <th>Customer</th>
                <th>Warehouse</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">No deliveries found</td>
                </tr>
              ) : (
                deliveries.map((delivery) => (
                  <tr key={delivery._id}>
                    <td>{delivery.deliveryNumber}</td>
                    <td>{delivery.customer}</td>
                    <td>{delivery.warehouse?.name || 'N/A'}</td>
                    <td>{delivery.items?.length || 0} items</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(delivery.status) + '20',
                          color: getStatusColor(delivery.status)
                        }}
                      >
                        {delivery.status}
                      </span>
                    </td>
                    <td>{new Date(delivery.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleView(delivery._id)} className="icon-btn">
                          <FiEye />
                        </button>
                        {delivery.status !== 'done' && isStaff && (
                          <button
                            onClick={() => handleValidate(delivery._id)}
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
        <DeliveryModal
          delivery={selectedDelivery}
          onClose={() => {
            setShowModal(false);
            setSelectedDelivery(null);
            fetchDeliveries();
          }}
          warehouses={warehouses}
        />
      )}
    </div>
  );
};

export default Deliveries;

