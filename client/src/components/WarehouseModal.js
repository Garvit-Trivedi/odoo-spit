import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiX } from 'react-icons/fi';
import LocationPicker from './LocationPicker';
import './Modal.css';

const WarehouseModal = ({ warehouse, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    isActive: true,
    coordinates: null,
    formattedAddress: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (warehouse) {
      setFormData({
        name: warehouse.name || '',
        location: warehouse.formattedAddress || warehouse.location || '',
        description: warehouse.description || '',
        isActive: warehouse.isActive !== undefined ? warehouse.isActive : true,
        coordinates: warehouse.coordinates || null,
        formattedAddress: warehouse.formattedAddress || warehouse.location || ''
      });
    }
  }, [warehouse]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleLocationChange = (location) => {
    setFormData({ ...formData, location, formattedAddress: location });
  };

  const handleCoordinatesChange = (coordinates) => {
    setFormData({ ...formData, coordinates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        name: formData.name,
        location: formData.formattedAddress || formData.location,
        formattedAddress: formData.formattedAddress || formData.location,
        coordinates: formData.coordinates,
        description: formData.description,
        isActive: formData.isActive
      };

      if (warehouse) {
        await axios.put(`/api/warehouses/${warehouse._id}`, submitData);
        toast.success('Warehouse updated successfully');
      } else {
        await axios.post('/api/warehouses', submitData);
        toast.success('Warehouse created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save warehouse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{warehouse ? 'Edit Warehouse' : 'Create Warehouse'}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Warehouse Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Location *</label>
            <LocationPicker
              location={formData.location}
              coordinates={formData.coordinates}
              onLocationChange={handleLocationChange}
              onCoordinatesChange={handleCoordinatesChange}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              Active
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : warehouse ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarehouseModal;

