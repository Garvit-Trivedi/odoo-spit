import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import './Modal.css';

const TransferModal = ({ transfer, onClose, warehouses }) => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const [formData, setFormData] = useState({
    fromWarehouse: '',
    toWarehouse: '',
    notes: '',
    status: 'draft',
    items: []
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transfer) {
      setFormData({
        fromWarehouse: transfer.fromWarehouse?._id || transfer.fromWarehouse || '',
        toWarehouse: transfer.toWarehouse?._id || transfer.toWarehouse || '',
        notes: transfer.notes || '',
        status: transfer.status || 'draft',
        items: transfer.items || []
      });
      if (transfer.fromWarehouse?._id || transfer.fromWarehouse) {
        fetchProducts(transfer.fromWarehouse?._id || transfer.fromWarehouse);
      }
    }
  }, [transfer]);

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
    if (e.target.name === 'fromWarehouse') {
      fetchProducts(e.target.value);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1 }]
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'product' ? value : parseFloat(value) || 0;
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.fromWarehouse === formData.toWarehouse) {
      toast.error('From and to warehouses cannot be the same');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      if (transfer) {
        await axios.put(`/api/transfers/${transfer._id}`, formData);
        toast.success('Transfer updated successfully');
      } else {
        await axios.post('/api/transfers', formData);
        toast.success('Transfer created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{transfer ? 'View/Edit Transfer' : 'Create Transfer'}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>From Warehouse *</label>
              <select
                name="fromWarehouse"
                value={formData.fromWarehouse}
                onChange={handleChange}
                required
                disabled={transfer?.status === 'done' || !isManager}
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
              <label>To Warehouse *</label>
              <select
                name="toWarehouse"
                value={formData.toWarehouse}
                onChange={handleChange}
                required
                disabled={transfer?.status === 'done' || !isManager}
              >
                <option value="">Select warehouse</option>
                {warehouses
                  .filter((wh) => wh._id !== formData.fromWarehouse)
                  .map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Items *</label>
            <div className="items-list">
              {formData.items.map((item, index) => {
                const selectedProduct = products.find((p) => p._id === item.product);
                const availableStock = selectedProduct?.stock || 0;
                return (
                  <div key={index} className="item-row">
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      required
                      disabled={transfer?.status === 'done' || !formData.fromWarehouse || !isManager}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.sku}) - Stock: {p.stock || 0}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="0.01"
                      step="0.01"
                      max={availableStock}
                      required
                      disabled={transfer?.status === 'done' || !isManager}
                    />
                    <span className="unit-label">
                      {selectedProduct?.unitOfMeasure || ''}
                    </span>
                    {selectedProduct && (
                      <span className="stock-info">
                        Available: {availableStock}
                      </span>
                    )}
                    {transfer?.status !== 'done' && (
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
              {transfer?.status !== 'done' && formData.fromWarehouse && (
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
              disabled={transfer?.status === 'done' || !isManager}
            />
          </div>

          {transfer && (
            <div className="receipt-info">
              <p><strong>Transfer Number:</strong> {transfer.transferNumber}</p>
              <p><strong>Status:</strong> {transfer.status}</p>
              {transfer.validatedBy && (
                <p><strong>Validated by:</strong> {transfer.validatedBy?.name}</p>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {transfer ? 'Close' : 'Cancel'}
            </button>
            {transfer?.status !== 'done' && isManager && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : transfer ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;

