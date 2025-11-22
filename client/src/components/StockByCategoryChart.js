import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Chart.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const StockByCategoryChart = ({ warehouseId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    asOf: new Date().toISOString().split('T')[0],
    metric: 'value',
    topN: 8
  });

  useEffect(() => {
    fetchData();
  }, [warehouseId, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        asOf: filters.asOf,
        metric: filters.metric,
        topN: filters.topN
      };
      if (warehouseId) params.warehouseId = warehouseId;

      const res = await axios.get('/api/reports/stock-by-category', { params });
      setData(res.data.buckets || []);
    } catch (error) {
      console.error('Error fetching stock by category:', error);
      toast.error('Failed to load category data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  if (data.length === 0) {
    return <div className="chart-empty">No data available</div>;
  }

  const chartData = data.map((item, index) => ({
    name: item.category,
    value: item.value,
    percent: item.percentOfTotal
  }));

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Stock by Category</h3>
        <div className="chart-filters">
          <select
            value={filters.metric}
            onChange={(e) => setFilters({ ...filters, metric: e.target.value })}
            className="chart-filter-select"
          >
            <option value="units">Units</option>
            <option value="value">Value (Rs)</option>
          </select>
          <input
            type="date"
            value={filters.asOf}
            onChange={(e) => setFilters({ ...filters, asOf: e.target.value })}
            className="chart-filter-input"
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockByCategoryChart;

