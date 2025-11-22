import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiPackage,
  FiAlertCircle,
  FiXCircle,
  FiInbox,
  FiTruck,
  FiMove,
  FiFilter
} from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import StockTrendChart from '../components/StockTrendChart';
import StockByCategoryChart from '../components/StockByCategoryChart';
import { exportStockTrend, exportStockByCategory, exportStockValuation } from '../utils/exportUtils';
import { FiDownload } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const [kpis, setKpis] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    documentType: '',
    status: '',
    warehouse: '',
    category: ''
  });
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchCategories();
    fetchKPIs();
    fetchActivities();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('/api/warehouses');
      setWarehouses(res.data.warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/products/categories/list');
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchKPIs = async () => {
    try {
      const params = {};
      if (filters.warehouse) params.warehouse = filters.warehouse;
      if (filters.category) params.category = filters.category;
      const res = await axios.get('/api/dashboard/kpis', { params });
      setKpis(res.data.kpis);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const params = {};
      if (filters.documentType) params.documentType = filters.documentType;
      if (filters.status) params.status = filters.status;
      if (filters.warehouse) params.warehouse = filters.warehouse;
      if (filters.category) params.category = filters.category;

      const res = await axios.get('/api/dashboard/recent-activities', { params });
      setActivities(res.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const kpiCards = [
    {
      title: 'Total Products in Stock',
      value: kpis?.totalProducts || 0,
      icon: FiPackage,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      title: 'Low Stock / Out of Stock Items',
      value: (kpis?.lowStockItems || 0) + (kpis?.outOfStockItems || 0),
      icon: FiAlertCircle,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      subtitle: `${kpis?.lowStockItems || 0} low, ${kpis?.outOfStockItems || 0} out`
    },
    {
      title: 'Pending Receipts',
      value: kpis?.pendingReceipts || 0,
      icon: FiInbox,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      title: 'Pending Deliveries',
      value: kpis?.pendingDeliveries || 0,
      icon: FiTruck,
      color: '#8b5cf6',
      bgColor: '#e9d5ff'
    },
    {
      title: 'Internal Transfers Scheduled',
      value: kpis?.scheduledTransfers || 0,
      icon: FiMove,
      color: '#06b6d4',
      bgColor: '#cffafe'
    }
  ];

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

  const getDocumentIcon = (type) => {
    const icons = {
      receipt: FiInbox,
      delivery: FiTruck,
      transfer: FiMove,
      adjustment: FiFilter
    };
    return icons[type] || FiPackage;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Inventory Overview</p>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Document Type</label>
          <select
            value={filters.documentType}
            onChange={(e) => handleFilterChange('documentType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="receipt">Receipts</option>
            <option value="delivery">Deliveries</option>
            <option value="transfer">Transfers</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="waiting">Waiting</option>
            <option value="ready">Ready</option>
            <option value="done">Done</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Warehouse</label>
          <select
            value={filters.warehouse}
            onChange={(e) => handleFilterChange('warehouse', e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Product Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: kpi.bgColor, color: kpi.color }}>
                <Icon />
              </div>
              <div className="kpi-content">
                <h3>{kpi.value}</h3>
                <p>{kpi.title}</p>
                {kpi.subtitle && (
                  <span className="kpi-subtitle">{kpi.subtitle}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isManager && (
        <div className="charts-section">
          <div className="charts-header">
            <h2>Analytics & Reports</h2>
            <div className="dashboard-export-actions">
              <button
                className="btn-export-small"
                onClick={async () => {
                  try {
                    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    const to = new Date().toISOString().split('T')[0];
                    await exportStockTrend(filters.warehouse || null, from, to);
                    toast.success('Stock trend exported to Excel');
                  } catch (error) {
                    toast.error('Failed to export stock trend');
                  }
                }}
              >
                <FiDownload /> Export Trend
              </button>
              <button
                className="btn-export-small"
                onClick={async () => {
                  try {
                    await exportStockByCategory(filters.warehouse || null);
                    toast.success('Category report exported to Excel');
                  } catch (error) {
                    toast.error('Failed to export category report');
                  }
                }}
              >
                <FiDownload /> Export Categories
              </button>
              <button
                className="btn-export-small"
                onClick={async () => {
                  try {
                    await exportStockValuation(filters.warehouse || null);
                    toast.success('Valuation report exported to Excel');
                  } catch (error) {
                    toast.error('Failed to export valuation report');
                  }
                }}
              >
                <FiDownload /> Export Valuation
              </button>
            </div>
          </div>
          <div className="charts-grid">
            <StockTrendChart warehouseId={filters.warehouse || null} />
            <StockByCategoryChart warehouseId={filters.warehouse || null} />
          </div>
        </div>
      )}

      <div className="activities-section">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {activities.length === 0 ? (
            <div className="no-activities">No activities found</div>
          ) : (
            activities.map((activity, index) => {
              const Icon = getDocumentIcon(activity.type);
              return (
                <div key={index} className="activity-item">
                  <div className="activity-icon" style={{ color: getStatusColor(activity.status) }}>
                    <Icon />
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <span className="activity-number">{activity.number}</span>
                      <span
                        className="activity-status"
                        style={{ backgroundColor: getStatusColor(activity.status) + '20', color: getStatusColor(activity.status) }}
                      >
                        {activity.status}
                      </span>
                    </div>
                    <div className="activity-details">
                      {activity.type === 'transfer' ? (
                        <span>
                          {activity.fromWarehouse} → {activity.toWarehouse}
                        </span>
                      ) : (
                        <span>{activity.warehouse}</span>
                      )}
                      <span>•</span>
                      <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{activity.createdBy}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

