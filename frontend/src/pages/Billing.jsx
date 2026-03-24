import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Trash2, User, ShoppingBag } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, handleApiError } from '../utils/helpers';
import './Billing.css';

const Billing = () => {
  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRequestId = useRef(0);

  const searchItems = useCallback(async (term) => {
    if (!term) {
      setSearchResults([]);
      return;
    }
    const requestId = ++searchRequestId.current;
    try {
      const data = await api.getAvailableItems({ search: term });
      if (requestId === searchRequestId.current) {
        setSearchResults(data.data.items || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, []);

  const debounceTimer = useRef(null);
  const debouncedSearch = useCallback((term) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchItems(term), 300);
  }, [searchItems]);

  const addToCart = (item) => {
    const existingItem = cart.find(i => i.item_id === item.id);
    if (existingItem) {
      updateQuantity(existingItem.item_id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: item.selling_price,
        max_stock: item.current_stock
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const updateQuantity = (itemId, newQuantity) => {
    const item = cart.find(i => i.item_id === itemId);
    if (newQuantity > item.max_stock) {
      alert(`Only ${item.max_stock} units available in stock`);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(i => 
      i.item_id === itemId ? { ...i, quantity: newQuantity } : i
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i.item_id !== itemId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - discount;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        customer_id: customer?.id || null,
        sale_date: new Date().toISOString(),
        items: cart.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          total: parseFloat(item.quantity * item.unit_price)
        })),
        discount,
        total_amount: parseFloat(calculateSubtotal()),
        final_amount: parseFloat(calculateTotal()), 
        payment_method: paymentMethod,
        payment_status: 'paid',
        paid_amount: calculateTotal()
      };

      console.log(saleData);

      const response = await api.createSale(saleData);
      alert('Bill created successfully!');
      
      // Reset form
      setCart([]);
      setDiscount(0);
      setCustomer(null);
      setPaymentMethod('cash');
    } catch (error) {
      alert(handleApiError(error));
    }
    setLoading(false);
  };

  return (
    <div className="billing-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing / Point of Sale</h1>
          <p className="page-subtitle">Create customer bills and process sales</p>
        </div>
      </div>

      <div className="billing-grid">
        {/* Left Panel - Cart */}
        <div className="cart-panel">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <ShoppingBag size={20} />
                Shopping Cart ({cart.length} items)
              </h3>
            </div>

            {/* Customer Info */}
            <CustomerSearch customer={customer} setCustomer={setCustomer} />

            {/* Item Search */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Search Items</label>
              <input
                type="text"
                className="input"
                placeholder="Search by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      className="search-result-item"
                      onClick={() => addToCart(item)}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        <div className="text-muted">SKU: {item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-success">{formatCurrency(item.selling_price)}</div>
                        <div className="text-muted">Stock: {item.current_stock}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <div className="empty-state-icon">
                    <ShoppingBag size={48} />
                  </div>
                  <p className="empty-state-description">
                    Search and add items to create a bill
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.item_id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.item_name}</div>
                      <div className="cart-item-price">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </div>
                    </div>
                    <div className="cart-item-controls">
                      <input
                        type="number"
                        className="input"
                        style={{ width: '80px' }}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.item_id, parseFloat(e.target.value) || 0)}
                        min="0.01"
                        step="0.01"
                      />
                      <div className="cart-item-total">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </div>
                      <button
                        className="btn-icon"
                        onClick={() => removeFromCart(item.item_id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Summary */}
        <div className="summary-panel">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bill Summary</h3>
            </div>

            <div className="summary-row">
              <span>Subtotal</span>
              <span className="summary-value">{formatCurrency(calculateSubtotal())}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Discount (₹)</label>
              <input
                type="number"
                className="input"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="summary-row summary-total">
              <span>Total Amount</span>
              <span className="summary-value">{formatCurrency(calculateTotal())}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <button
              className="btn btn-primary w-full btn-lg"
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
            >
              {loading ? 'Processing...' : `Generate Bill • ${formatCurrency(calculateTotal())}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerSearch = ({ customer, setCustomer }) => {
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const custRequestId = useRef(0);

  const searchCustomers = useCallback(async (name) => {
    if (!name || name.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const requestId = ++custRequestId.current;
    setSearching(true);
    try {
      const data = await api.getCustomers({ search: name });
      if (requestId === custRequestId.current) {
        setSearchResults(data.data.customers || []);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  const custDebounceTimer = useRef(null);
  const debouncedCustomerSearch = useCallback((name) => {
    clearTimeout(custDebounceTimer.current);
    custDebounceTimer.current = setTimeout(() => searchCustomers(name), 300);
  }, [searchCustomers]);

  const selectCustomer = (selectedCustomer) => {
    setCustomer(selectedCustomer);
    setSearchName('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleAddNewCustomer = () => {
    setShowAddModal(true);
    setShowDropdown(false);
  };

  return (
    <>
      <div className="customer-section">
        {customer ? (
          <div className="customer-info">
            <User size={20} />
            <div>
              <div className="customer-name">{customer.name}</div>
              <div className="customer-phone">{customer.phone_number}</div>
            </div>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setCustomer(null)}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="customer-search" style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder="Search customer by name..."
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                debouncedCustomerSearch(e.target.value);
              }}
              onFocus={() => searchName.length >= 2 && setShowDropdown(true)}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddNewCustomer}
              title="Add New Customer"
            >
              <Plus size={16} />
            </button>
            
            {showDropdown && (
              <div className="search-results customer-search-results">
                {searching ? (
                  <div className="search-result-item" style={{ justifyContent: 'center', cursor: 'default' }}>
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((cust) => (
                      <button
                        key={cust.id}
                        className="search-result-item"
                        onClick={() => selectCustomer(cust)}
                      >
                        <div>
                          <strong>{cust.name}</strong>
                          <div className="text-muted">{cust.phone_number}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted">{cust.email || 'No email'}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      className="search-result-item add-customer-btn"
                      onClick={handleAddNewCustomer}
                    >
                      <Plus size={16} />
                      <span>Add New Customer</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="search-result-item" style={{ justifyContent: 'center', cursor: 'default' }}>
                      No customers found for "{searchName}"
                    </div>
                    <button
                      className="search-result-item add-customer-btn"
                      onClick={handleAddNewCustomer}
                    >
                      <Plus size={16} />
                      <span>Add New Customer "{searchName}"</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCustomerModal
          initialName={searchName}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newCustomer) => {
            setCustomer(newCustomer);
            setShowAddModal(false);
            setSearchName('');
          }}
        />
      )}
    </>
  );
};

const AddCustomerModal = ({ initialName = '', onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: initialName,
    phone_number: '',
    email: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.addCustomer(formData);
      onSuccess(response.data.customer);
    } catch (error) {
      alert(handleApiError(error));
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Add New Customer</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                type="tel"
                className="input"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                required
                maxLength="10"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                className="textarea"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Billing;
