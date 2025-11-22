import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiPackage } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import ProductModal from '../components/ProductModal';
import './Products.css';

const Products = () => {
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'inventory_manager';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchCategories();
    fetchProducts();
  }, [categoryFilter, warehouseFilter]);

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
      setCategories(res.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      // If warehouse selected, show stock for that warehouse, otherwise show total stock
      if (warehouseFilter) {
        params.warehouse = warehouseFilter;
      }
      // Backend now always returns stock (total if no warehouse, specific warehouse if selected)
      if (searchTerm) params.search = searchTerm;

      const res = await axios.get('/api/products', { params });
      setProducts(res.data.products);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`/api/products/${id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const [expandedProducts, setExpandedProducts] = useState({});

  const toggleExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search)
    );
  });

  return (
    <div className="products-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your inventory products</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={handleCreate}>
            <FiPlus /> Add Product
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={warehouseFilter}
          onChange={(e) => {
            setWarehouseFilter(e.target.value);
            // Trigger fetch when warehouse changes
          }}
        >
          <option value="">All Warehouses</option>
          {warehouses.map((wh) => (
            <option key={wh._id} value={wh._id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className="products-grid">
          {filteredProducts.length === 0 ? (
            <div className="no-data">No products found</div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product._id} className="product-card">
                <div className="product-header">
                  <div>
                    <h3>{product.name}</h3>
                    <p className="product-sku">SKU: {product.sku}</p>
                  </div>
                  {isManager && (
                    <div className="product-actions">
                      <button onClick={() => handleEdit(product)} className="icon-btn">
                        <FiEdit />
                      </button>
                      <button onClick={() => handleDelete(product._id)} className="icon-btn delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
                <div className="product-details">
                  <div className="detail-item">
                    <span className="label">Category:</span>
                    <span>{product.category}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Unit:</span>
                    <span>{product.unitOfMeasure}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Stock:</span>
                    <span className={product.stock !== undefined && product.stock <= (product.reorderLevel || 0) ? 'low-stock' : ''}>
                      {product.stock !== undefined ? `${product.stock} ${product.unitOfMeasure}` : '0 ' + (product.unitOfMeasure || 'pcs')}
                      {warehouseFilter && (
                        <span className="warehouse-filter-indicator"> (in selected warehouse)</span>
                      )}
                      {!warehouseFilter && product.warehouseBreakdown && product.warehouseBreakdown.length > 1 && (
                        <span className="warehouse-count"> (across {product.warehouseBreakdown.length} warehouses)</span>
                      )}
                    </span>
                  </div>
                  {product.costPrice > 0 && (
                    <div className="detail-item">
                      <span className="label">Cost Price:</span>
                      <span>Rs {product.costPrice.toFixed(2)} / {product.unitOfMeasure}</span>
                    </div>
                  )}
                  {product.costPrice > 0 && product.stock !== undefined && (
                    <div className="detail-item">
                      <span className="label">Product Worth:</span>
                      <span className="product-worth">Rs {((product.costPrice || 0) * (product.stock || 0)).toFixed(2)}</span>
                    </div>
                  )}
                  {product.reorderLevel > 0 && (
                    <div className="detail-item">
                      <span className="label">Reorder Level:</span>
                      <span>{product.reorderLevel}</span>
                    </div>
                  )}
                  {!warehouseFilter && product.warehouseBreakdown && product.warehouseBreakdown.length > 0 && (
                    <div className="warehouse-breakdown-toggle">
                      <button
                        className="expand-btn"
                        onClick={() => toggleExpand(product._id)}
                      >
                        {expandedProducts[product._id] ? (
                          <>
                            <FiChevronUp /> Hide Warehouse Breakdown
                          </>
                        ) : (
                          <>
                            <FiChevronDown /> Show Warehouse Breakdown ({product.warehouseBreakdown.length})
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {!warehouseFilter && expandedProducts[product._id] && product.warehouseBreakdown && (
                  <div className="warehouse-breakdown">
                    <div className="breakdown-header">
                      <FiPackage />
                      <strong>Stock by Warehouse:</strong>
                    </div>
                    <div className="breakdown-list">
                      {product.warehouseBreakdown.map((wh, idx) => (
                        <div key={idx} className="breakdown-item">
                          <span className="warehouse-name">{wh.warehouseName}</span>
                          <span className="warehouse-stock">
                            {wh.quantity} {product.unitOfMeasure}
                            {wh.reservedQuantity > 0 && (
                              <span className="reserved"> ({wh.reservedQuantity} reserved)</span>
                            )}
                          </span>
                          {product.costPrice > 0 && (
                            <span className="warehouse-worth">
                              Rs {((product.costPrice || 0) * (wh.quantity || 0)).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={handleModalClose}
          categories={categories}
        />
      )}
    </div>
  );
};

export default Products;

