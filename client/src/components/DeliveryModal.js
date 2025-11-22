import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import './Modal.css';

const DeliveryModal = ({ delivery, onClose, warehouses }) => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const [formData, setFormData] = useState({
    customer: '',
    warehouse: '',
    notes: '',
    status: 'draft',
    items: []
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async (warehouseId = null) => {
    try {
      // Always fetch all products, but include stock info if warehouse is selected
      const params = warehouseId ? { warehouse: warehouseId } : {};
      const res = await axios.get('/api/products', { params });
      console.log('Fetched products:', res.data.products.length);
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    if (delivery) {
      const warehouseId = delivery.warehouse?._id || delivery.warehouse || '';
      setFormData({
        customer: delivery.customer || '',
        warehouse: warehouseId,
        notes: delivery.notes || '',
        status: delivery.status || 'draft',
        items: delivery.items || []
      });
      if (warehouseId) {
        fetchProducts(warehouseId);
      }
    }
  }, [delivery]);

  useEffect(() => {
    // Fetch products when warehouse changes to update stock info
    fetchProducts(formData.warehouse || null);
  }, [formData.warehouse]);

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
      if (delivery) {
        await axios.put(`/api/deliveries/${delivery._id}`, formData);
        toast.success('Delivery updated successfully');
      } else {
        await axios.post('/api/deliveries', formData);
        toast.success('Delivery created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save delivery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{delivery ? 'View/Edit Delivery' : 'Create Delivery'}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Customer *</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                required
                disabled={delivery?.status === 'done' || !isManager}
              />
            </div>
            <div className="form-group">
              <label>Warehouse *</label>
              <select
                name="warehouse"
                value={formData.warehouse}
                onChange={handleChange}
                required
                disabled={delivery?.status === 'done' || !isManager}
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
                const availableStock = selectedProduct?.stock || 0;
                return (
                  <div key={index} className="item-row">
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      required
                      disabled={delivery?.status === 'done' || !isManager}
                    >
                      <option value="">Select product</option>
                      {products.length === 0 ? (
                        <option disabled>No products available</option>
                      ) : (
                        products.map((p) => {
                          const stock = p.stock !== undefined ? p.stock : (p.totalStock || 0);
                          const stockText = formData.warehouse ? `Stock: ${stock}` : '';
                          return (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.sku}) {stockText && `- ${stockText}`}
                            </option>
                          );
                        })
                      )}
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
                      disabled={delivery?.status === 'done' || !isManager}
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice || 0}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={delivery?.status === 'done' || !isManager}
                    />
                    <span className="unit-label">
                      {selectedProduct?.unitOfMeasure || ''}
                    </span>
                    {selectedProduct && (
                      <span className="stock-info">
                        Available: {availableStock}
                      </span>
                    )}
                    {delivery?.status !== 'done' && (
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
              {delivery?.status !== 'done' && (
                <button type="button" onClick={handleAddItem} className="btn-add-item">
                  <FiPlus /> Add Item
                </button>
              )}
            </div>
            {formData.items.length > 0 && (
              <div className="delivery-total">
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
              disabled={delivery?.status === 'done' || !isManager}
            />
          </div>

          {delivery && (
            <div className="receipt-info">
              <p><strong>Delivery Number:</strong> {delivery.deliveryNumber}</p>
              <p><strong>Status:</strong> {delivery.status}</p>
              {delivery.validatedBy && (
                <p><strong>Validated by:</strong> {delivery.validatedBy?.name}</p>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {delivery ? 'Close' : 'Cancel'}
            </button>
            {delivery?.status !== 'done' && isManager && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : delivery ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryModal;

