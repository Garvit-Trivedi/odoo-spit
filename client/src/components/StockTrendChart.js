import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Chart.css';

const StockTrendChart = ({ warehouseId, productId, category }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    groupBy: 'day',
    metric: 'units'
  });

  useEffect(() => {
    fetchData();
  }, [warehouseId, productId, category, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        from: filters.from,
        to: filters.to,
        groupBy: filters.groupBy,
        metric: filters.metric
      };
      if (warehouseId) params.warehouseId = warehouseId;
      if (productId) params.productId = productId;
      if (category) params.category = category;

      const res = await axios.get('/api/reports/stock-trend', { params });
      setData(res.data.series || []);
    } catch (error) {
      console.error('Error fetching stock trend:', error);
      toast.error('Failed to load stock trend data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  if (data.length === 0) {
    return <div className="chart-empty">No data available for the selected period</div>;
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Stock Level Over Time</h3>
        <div className="chart-filters">
          <select
            value={filters.metric}
            onChange={(e) => setFilters({ ...filters, metric: e.target.value })}
            className="chart-filter-select"
          >
            <option value="units">Units</option>
            <option value="value">Value (Rs)</option>
          </select>
          <select
            value={filters.groupBy}
            onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
            className="chart-filter-select"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="chart-filter-input"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="chart-filter-input"
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            name={filters.metric === 'value' ? 'Value (Rs)' : 'Units'}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockTrendChart;

