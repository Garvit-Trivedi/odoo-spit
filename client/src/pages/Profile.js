import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h1>{user?.name}</h1>
          <p className="user-role">
            {user?.role === 'inventory_manager' ? 'Inventory Manager' : 'Warehouse Staff'}
          </p>
        </div>
        <div className="profile-details">
          <div className="detail-section">
            <h3>Account Information</h3>
            <div className="detail-item">
              <span className="label">Name:</span>
              <span>{user?.name}</span>
            </div>
            <div className="detail-item">
              <span className="label">Email:</span>
              <span>{user?.email}</span>
            </div>
            <div className="detail-item">
              <span className="label">Role:</span>
              <span>{user?.role === 'inventory_manager' ? 'Inventory Manager' : 'Warehouse Staff'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

