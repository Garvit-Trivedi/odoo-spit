import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  FiHome,
  FiPackage,
  FiInbox,
  FiTruck,
  FiMove,
  FiEdit3,
  FiFileText,
  FiSettings,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/products', icon: FiPackage, label: 'Products' },
    { path: '/receipts', icon: FiInbox, label: 'Receipts' },
    { path: '/deliveries', icon: FiTruck, label: 'Deliveries' },
    { path: '/transfers', icon: FiMove, label: 'Transfers' },
    { path: '/adjustments', icon: FiEdit3, label: 'Adjustments' },
    { path: '/ledger', icon: FiFileText, label: 'Move History' },
    { path: '/settings', icon: FiSettings, label: 'Settings' }
  ];

  return (
    <div className="layout">
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>StockMaster</h2>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <FiX />
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <Link to="/profile" className="nav-item">
            <FiUser />
            <span>My Profile</span>
          </Link>
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </div>
      <div className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <FiMenu />
          </button>
          <div className="topbar-right">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role === 'inventory_manager' ? 'Manager' : 'Staff'}</span>
          </div>
        </header>
        <div className="content-area">
          {children}
        </div>
      </div>
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default Layout;

