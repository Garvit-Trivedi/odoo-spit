import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import './Modal.css';

const ReceiptModal = ({ receipt, onClose, warehouses }) => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const [formData, setFormData] = useState({
    supplier: '',
    warehouse: '',
    notes: '',
    status: 'draft',
    items: []
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
    if (receipt) {
      setFormData({
        supplier: receipt.supplier || '',
        warehouse: receipt.warehouse?._id || receipt.warehouse || '',
        notes: receipt.notes || '',
        status: receipt.status || 'draft',
        items: receipt.items || []
      });
    }
  }, [receipt]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1, unitPrice: 0 }]
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

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      if (receipt) {
        await axios.put(`/api/receipts/${receipt._id}`, formData);
        toast.success('Receipt updated successfully');
      } else {
        await axios.post('/api/receipts', formData);
        toast.success('Receipt created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{receipt ? 'View/Edit Receipt' : 'Create Receipt'}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Supplier *</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                required
                disabled={receipt?.status === 'done' || !isManager}
              />
            </div>
            <div className="form-group">
              <label>Warehouse *</label>
              <select
                name="warehouse"
                value={formData.warehouse}
                onChange={handleChange}
                required
                disabled={receipt?.status === 'done' || !isManager}
              >
                <option value="">Select warehouse</option>
                {warehouses.map((wh) => (
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
                return (
                  <div key={index} className="item-row">
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      required
                      disabled={receipt?.status === 'done' || !isManager}
                    >
                      <option value="">Select product</option>
                      {filteredProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.sku})
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
                      required
                      disabled={receipt?.status === 'done' || !isManager}
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={receipt?.status === 'done' || !isManager}
                    />
                    <span className="unit-label">
                      {selectedProduct?.unitOfMeasure || ''}
                    </span>
                    {receipt?.status !== 'done' && (
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
              {receipt?.status !== 'done' && (
                <button type="button" onClick={handleAddItem} className="btn-add-item">
                  <FiPlus /> Add Item
                </button>
              )}
            </div>
            {formData.items.length > 0 && (
              <div className="receipt-total">
                <strong>Total Amount: Rs {formData.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0).toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              disabled={receipt?.status === 'done'}
            />
          </div>

          {receipt && (
            <div className="receipt-info">
              <p><strong>Receipt Number:</strong> {receipt.receiptNumber}</p>
              <p><strong>Status:</strong> {receipt.status}</p>
              {receipt.validatedBy && (
                <p><strong>Validated by:</strong> {receipt.validatedBy?.name}</p>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {receipt ? 'Close' : 'Cancel'}
            </button>
            {receipt?.status !== 'done' && isManager && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : receipt ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiptModal;

