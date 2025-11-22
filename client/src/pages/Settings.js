import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import WarehouseModal from '../components/WarehouseModal';
import './Products.css';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isManager = user?.role === 'inventory_manager';
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/warehouses');
      setWarehouses(res.data.warehouses);
    } catch (error) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingWarehouse(null);
    setShowModal(true);
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      await axios.delete(`/api/warehouses/${id}`);
      toast.success('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete warehouse');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingWarehouse(null);
    fetchWarehouses();
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <div>
          <h1>Warehouse Settings</h1>
          <p>Manage your warehouses and locations</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={handleCreate}>
            <FiPlus /> Add Warehouse
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading warehouses...</div>
      ) : (
        <div className="products-grid">
          {warehouses.length === 0 ? (
            <div className="no-data">No warehouses found</div>
          ) : (
            warehouses.map((warehouse) => (
              <div
                key={warehouse._id}
                className="product-card"
                style={{ cursor: isManager ? 'pointer' : 'default' }}
                onClick={() => {
                  if (isManager) {
                    navigate(`/stock/${warehouse._id}`);
                  }
                }}
              >
                <div className="product-header">
                  <div>
                    <h3>{warehouse.name}</h3>
                    <p className="product-sku">{warehouse.formattedAddress || warehouse.location}</p>
                  </div>
                  {isManager && (
                    <div className="product-actions" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEdit(warehouse)} className="icon-btn">
                        <FiEdit />
                      </button>
                      <button onClick={() => handleDelete(warehouse._id)} className="icon-btn delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
                <div className="product-details">
                  {warehouse.description && (
                    <div className="detail-item">
                      <span className="label">Description:</span>
                      <span>{warehouse.description}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span>{warehouse.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <WarehouseModal
          warehouse={editingWarehouse}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Settings;

