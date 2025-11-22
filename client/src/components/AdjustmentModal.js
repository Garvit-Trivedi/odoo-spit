import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import './Modal.css';

const AdjustmentModal = ({ adjustment, onClose, warehouses }) => {
  const { user } = useContext(AuthContext);
  const isStaff = user?.role === 'warehouse_staff';
  const [formData, setFormData] = useState({
    warehouse: '',
    notes: '',
    status: 'draft',
    items: []
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adjustment) {
      setFormData({
        warehouse: adjustment.warehouse?._id || adjustment.warehouse || '',
        notes: adjustment.notes || '',
        status: adjustment.status || 'draft',
        items: adjustment.items || []
      });
      if (adjustment.warehouse?._id || adjustment.warehouse) {
        fetchProducts(adjustment.warehouse?._id || adjustment.warehouse);
      }
    }
  }, [adjustment]);

  const fetchProducts = async (warehouseId) => {
    if (!warehouseId) return;
    try {
      const res = await axios.get('/api/products', { params: { warehouse: warehouseId } });
      setProducts(res.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleChange = (e) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newFormData);
    if (e.target.name === 'warehouse') {
      fetchProducts(e.target.value);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', countedQuantity: 0, reason: '' }]
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'product' ? value : value;
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      if (adjustment) {
        await axios.put(`/api/adjustments/${adjustment._id}`, formData);
        toast.success('Adjustment updated successfully');
      } else {
        await axios.post('/api/adjustments', formData);
        toast.success('Adjustment created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{adjustment ? 'View/Edit Adjustment' : 'Create Adjustment'}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Warehouse *</label>
            <select
              name="warehouse"
              value={formData.warehouse}
              onChange={handleChange}
              required
              disabled={adjustment?.status === 'done' || !isStaff}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Items *</label>
            <div className="items-list">
              {formData.items.map((item, index) => {
                const selectedProduct = products.find((p) => p._id === item.product);
                const recordedQuantity = selectedProduct?.stock || 0;
                const difference = item.countedQuantity - recordedQuantity;
                return (
                  <div key={index} className="item-row adjustment-item">
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      required
                      disabled={adjustment?.status === 'done' || !isStaff}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.sku}) - Recorded: {p.stock || 0}
                        </option>
                      ))}
                    </select>
                    <div className="quantity-group">
                      <div>
                        <label>Recorded:</label>
                        <input
                          type="number"
                          value={recordedQuantity}
                          disabled
                          className="readonly"
                        />
                      </div>
                      <div>
                        <label>Counted:</label>
                        <input
                          type="number"
                          value={item.countedQuantity}
                          onChange={(e) => handleItemChange(index, 'countedQuantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          required
                          disabled={adjustment?.status === 'done' || !isStaff}
                        />
                      </div>
                      <div>
                        <label>Difference:</label>
                        <input
                          type="number"
                          value={difference}
                          disabled
                          className={`readonly ${difference > 0 ? 'positive' : difference < 0 ? 'negative' : ''}`}
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={item.reason}
                      onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                      disabled={adjustment?.status === 'done' || !isStaff}
                    />
                    {adjustment?.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="icon-btn delete"
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                );
              })}
              {adjustment?.status !== 'done' && formData.warehouse && (
                <button type="button" onClick={handleAddItem} className="btn-add-item">
                  <FiPlus /> Add Item
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              disabled={adjustment?.status === 'done' || !isStaff}
            />
          </div>

          {adjustment && (
            <div className="receipt-info">
              <p><strong>Adjustment Number:</strong> {adjustment.adjustmentNumber}</p>
              <p><strong>Status:</strong> {adjustment.status}</p>
              {adjustment.validatedBy && (
                <p><strong>Validated by:</strong> {adjustment.validatedBy?.name}</p>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {adjustment ? 'Close' : 'Cancel'}
            </button>
            {adjustment?.status !== 'done' && isStaff && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : adjustment ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustmentModal;

