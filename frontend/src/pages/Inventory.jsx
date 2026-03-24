import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, Edit2, Plus, X } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate, handleApiError } from '../utils/helpers';
import './Inventory.css';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadInventory();
    loadCategories();
  }, [filter]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params = filter === 'low-stock' ? { low_stock: true } : {};
      const data = await api.getItemsInventory(params);
      setItems(data.data.items);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
    setLoading(false);
  };

  // const loadCategories = async () => {
  //   try {
  //     const data = await api.getCategories();
  //     setCategories(data.data.categories);
  //   } catch (error) {
  //     console.error('Failed to load categories:', error);
  //   }
  // };
  
  const loadCategories = () => {
  setCategories([
    { name: 'Grocery' },
    { name: 'Dairy' },
    { name: 'Snacks' },
    { name: 'Beverages' },
    { name: 'Household' },
    { name: 'Personal Care' },
    { name: 'Frozen' },
    { name: 'Bakery' },
    { name: 'Spices' },
    { name: 'Oil & Ghee' },
    { name: 'Pulses' },
    { name: 'Rice & Wheat' },
  ]);
};

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = items.filter(item => item.is_low_stock).length;
  const outOfStockCount = items.filter(item => item.current_stock === 0).length;

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Monitor stock levels and track movements</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add New Item
        </button>
      </div>

      {/* Stats */}
      <div className="inventory-stats">
        <div className="stat-box">
          <div className="stat-icon stat-icon-blue">
            <Package size={24} />
          </div>
          <div>
            <div className="stat-label">Total Items</div>
            <div className="stat-number">{items.length}</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon stat-icon-yellow">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-label">Low Stock</div>
            <div className="stat-number text-warning">{lowStockCount}</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon stat-icon-red">
            <Package size={24} />
          </div>
          <div>
            <div className="stat-label">Out of Stock</div>
            <div className="stat-number text-danger">{outOfStockCount}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inventory-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'filter-btn-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Items
          </button>
          <button
            className={`filter-btn ${filter === 'low-stock' ? 'filter-btn-active' : ''}`}
            onClick={() => setFilter('low-stock')}
          >
            Low Stock
          </button>
        </div>
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Threshold</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>Last Sale</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className={item.current_stock === 0 ? 'out-of-stock' : ''}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.is_low_stock && (
                      <span className="badge badge-orange" style={{ marginLeft: '0.5rem' }}>
                        Low
                      </span>
                    )}
                  </td>
                  <td className="text-muted">{item.sku}</td>
                  <td>{item.category}</td>
                  <td>
                    <span className={item.is_low_stock ? 'text-warning' : item.current_stock === 0 ? 'text-danger' : ''}>
                      {item.current_stock} {item.unit}
                    </span>
                  </td>
                  <td className="text-muted">{item.min_stock_threshold} {item.unit}</td>
                  <td>{formatCurrency(item.purchase_price)}</td>
                  <td className="text-success">{formatCurrency(item.selling_price)}</td>
                  <td className="text-muted">
                    {item.last_sale_date ? formatDate(item.last_sale_date) : 'Never'}
                  </td>
                  <td>
                    <button className="btn-icon btn-sm" onClick={() => handleEditItem(item)}>
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadInventory();
          }}
        />
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <EditItemModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingItem(null);
            loadInventory();
          }}
        />
      )}
    </div>
  );
};

// Add Item Modal Component
const AddItemModal = ({ categories, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    unit: 'piece',
    purchase_price: '',
    selling_price: '',
    current_stock: '',
    min_stock_threshold: '',
    reorder_point: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.addItem({
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        selling_price: parseFloat(formData.selling_price),
        current_stock: parseFloat(formData.current_stock),
        min_stock_threshold: parseFloat(formData.min_stock_threshold),
        reorder_point: parseFloat(formData.reorder_point) || parseFloat(formData.min_stock_threshold),
      });
      onSuccess();
    } catch (err) {
      setError(handleApiError(err));
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Add New Item</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Barcode</label>
                <input
                  type="text"
                  className="input"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <select
                  className="select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="liter">Liter</option>
                  <option value="packet">Packet</option>
                  <option value="box">Box</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Purchase Price *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3">
              <div className="form-group">
                <label className="form-label">Current Stock *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Min Threshold *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.min_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, min_stock_threshold: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reorder Point</label>
                <input
                  type="number"
                  className="input"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Item Modal Component
const EditItemModal = ({ item, categories, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: item.name || '',
    sku: item.sku || '',
    barcode: item.barcode || '',
    category: item.category || '',
    unit: item.unit || 'piece',
    purchase_price: item.purchase_price || '',
    selling_price: item.selling_price || '',
    current_stock: item.current_stock || '',
    min_stock_threshold: item.min_stock_threshold || '',
    reorder_point: item.reorder_point || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.updateItem(item.id, {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        selling_price: parseFloat(formData.selling_price),
        current_stock: parseFloat(formData.current_stock),
        min_stock_threshold: parseFloat(formData.min_stock_threshold),
        reorder_point: parseFloat(formData.reorder_point) || parseFloat(formData.min_stock_threshold),
      });
      onSuccess();
    } catch (err) {
      setError(handleApiError(err));
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Edit Item</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Barcode</label>
                <input
                  type="text"
                  className="input"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <select
                  className="select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="liter">Liter</option>
                  <option value="packet">Packet</option>
                  <option value="box">Box</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Purchase Price *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3">
              <div className="form-group">
                <label className="form-label">Current Stock *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Min Threshold *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.min_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, min_stock_threshold: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reorder Point</label>
                <input
                  type="number"
                  className="input"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
