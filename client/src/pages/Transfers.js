import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiCheck } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import TransferModal from '../components/TransferModal';
import './Documents.css';

const Transfers = () => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [filters, setFilters] = useState({ status: '', fromWarehouse: '', toWarehouse: '' });
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchTransfers();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('/api/warehouses');
      setWarehouses(res.data.warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.fromWarehouse) params.fromWarehouse = filters.fromWarehouse;
      if (filters.toWarehouse) params.toWarehouse = filters.toWarehouse;

      const res = await axios.get('/api/transfers', { params });
      setTransfers(res.data.transfers);
    } catch (error) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTransfer(null);
    setShowModal(true);
  };

  const handleView = async (id) => {
    try {
      const res = await axios.get(`/api/transfers/${id}`);
      setSelectedTransfer(res.data.transfer);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load transfer');
    }
  };

  const handleValidate = async (id) => {
    if (!window.confirm('Are you sure you want to validate this transfer? Stock will be moved.')) return;

    try {
      await axios.post(`/api/transfers/${id}/validate`);
      toast.success('Transfer validated successfully');
      fetchTransfers();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to validate transfer';
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
          <h1>Internal Transfers</h1>
          <p>Move stock between warehouses</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={handleCreate}>
            <FiPlus /> New Transfer
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
          value={filters.fromWarehouse}
          onChange={(e) => setFilters({ ...filters, fromWarehouse: e.target.value })}
        >
          <option value="">From Warehouse</option>
          {warehouses.map((wh) => (
            <option key={wh._id} value={wh._id}>
              {wh.name}
            </option>
          ))}
        </select>
        <select
          value={filters.toWarehouse}
          onChange={(e) => setFilters({ ...filters, toWarehouse: e.target.value })}
        >
          <option value="">To Warehouse</option>
          {warehouses.map((wh) => (
            <option key={wh._id} value={wh._id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading transfers...</div>
      ) : (
        <div className="documents-table">
          <table>
            <thead>
              <tr>
                <th>Transfer Number</th>
                <th>From</th>
                <th>To</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">No transfers found</td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer._id}>
                    <td>{transfer.transferNumber}</td>
                    <td>{transfer.fromWarehouse?.name || 'N/A'}</td>
                    <td>{transfer.toWarehouse?.name || 'N/A'}</td>
                    <td>{transfer.items?.length || 0} items</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(transfer.status) + '20',
                          color: getStatusColor(transfer.status)
                        }}
                      >
                        {transfer.status}
                      </span>
                    </td>
                    <td>{new Date(transfer.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleView(transfer._id)} className="icon-btn">
                          <FiEye />
                        </button>
                        {transfer.status !== 'done' && isManager && (
                          <button
                            onClick={() => handleValidate(transfer._id)}
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
        <TransferModal
          transfer={selectedTransfer}
          onClose={() => {
            setShowModal(false);
            setSelectedTransfer(null);
            fetchTransfers();
          }}
          warehouses={warehouses}
        />
      )}
    </div>
  );
};

export default Transfers;

