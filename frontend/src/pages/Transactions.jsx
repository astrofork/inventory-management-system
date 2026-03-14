import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Calendar, Search, Download, RefreshCw, Package, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDateTime, formatDate, getPaymentStatusColor, handleApiError } from '../utils/helpers';
import './Transactions.css';

const Transactions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = ['sales', 'purchases'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'sales';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(searchTimer.current);
  }, []);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
    setError(null);
    if (activeTab === 'sales') {
      loadSales(searchTerm, dateFilter);
    } else if (activeTab === 'purchases') {
      loadPurchases(searchTerm, dateFilter);
    }
  }, [activeTab, dateFilter]);

  const loadSales = async (search, dateFilt) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (dateFilt && dateFilt !== 'all') params.dateFilter = dateFilt;
      const data = await api.getSales(params);
      setSales(data.data.sales || []);
    } catch (err) {
      setError('Failed to load sales. Please try again.');
      console.error('Failed to load sales:', err);
    }
    setLoading(false);
  };

  const loadPurchases = async (search, dateFilt) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (dateFilt && dateFilt !== 'all') params.dateFilter = dateFilt;
      const data = await api.getPurchaseOrders(params);
      setPurchases(data.data.purchase_orders || []);
    } catch (err) {
      setError('Failed to load purchases. Please try again.');
      console.error('Failed to load purchases:', err);
    }
    setLoading(false);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (activeTab === 'sales') {
        loadSales(value, dateFilter);
      } else {
        loadPurchases(value, dateFilter);
      }
    }, 400);
  };

  const handleRefresh = () => {
    setError(null);
    if (activeTab === 'sales') {
      loadSales(searchTerm, dateFilter);
    } else {
      loadPurchases(searchTerm, dateFilter);
    }
  };

  const dateFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  return (
    <div className="transactions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction History</h1>
          <p className="page-subtitle">Review sales, purchases and payments</p>
        </div>
      </div>

      <div className="command-panel">
        <div className="command-panel-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by bill number, customer..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search transactions"
          />
        </div>

        <div className="command-panel-filters">
          <div className="date-filter-wrapper">
            <button
              className={`command-panel-btn ${dateFilter !== 'all' ? 'active' : ''}`}
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              aria-expanded={showDateDropdown}
              aria-label="Select date range"
            >
              <Calendar size={16} />
              {dateFilterOptions.find(opt => opt.value === dateFilter)?.label}
            </button>
            {showDateDropdown && (
              <div className="date-dropdown" role="listbox">
                {dateFilterOptions.map(option => (
                  <button
                    key={option.value}
                    role="option"
                    aria-selected={dateFilter === option.value}
                    className={`date-dropdown-item ${dateFilter === option.value ? 'active' : ''}`}
                    onClick={() => {
                      setDateFilter(option.value);
                      setShowDateDropdown(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="command-panel-divider" />

          <button className="command-panel-btn" onClick={handleRefresh} aria-label="Refresh data">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button className="export-btn" aria-label="Export data">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'sales' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <FileText size={18} />
          Sales History
        </button>
        <button
          className={`tab ${activeTab === 'purchases' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('purchases')}
        >
          <Package size={18} />
          Purchase History
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={handleRefresh} className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      <div className="tab-content">
        {activeTab === 'sales' && (
          <SalesHistory sales={sales} loading={loading} />
        )}
        {activeTab === 'purchases' && (
          <PurchaseHistory purchases={purchases} loading={loading} onStatusUpdate={handleRefresh} />
        )}
      </div>
    </div>
  );
};

const SalesHistory = ({ sales, loading }) => {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <FileText size={48} />
        </div>
        <h3 className="empty-state-title">No Sales Yet</h3>
        <p className="empty-state-description">
          Sales transactions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Bill Number</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Items</th>
            <th>Amount</th>
            <th>Discount</th>
            <th>Final Amount</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td>
                <strong>{sale.bill_number}</strong>
              </td>
              <td>{sale.customer_name || 'Walk-in'}</td>
              <td className="text-muted">{formatDateTime(sale.sale_date)}</td>
              <td>{sale.items_count} items</td>
              <td>{formatCurrency(sale.total_amount)}</td>
              <td className="text-muted">
                {sale.discount > 0 ? formatCurrency(sale.discount) : '-'}
              </td>
              <td>
                <strong className="text-success">{formatCurrency(sale.final_amount)}</strong>
              </td>
              <td>
                <span className="badge badge-blue">{sale.payment_method}</span>
              </td>
              <td>
                <span className={`badge badge-${getPaymentStatusColor(sale.payment_status)}`}>
                  {sale.payment_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PurchaseHistory = ({ purchases, loading, onStatusUpdate }) => {
  const handleStatusChange = async (purchaseId, newStatus) => {
    try {
      await api.updatePurchaseOrderStatus(purchaseId, { status: newStatus });
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      alert(handleApiError(error));
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Package size={48} />
        </div>
        <h3 className="empty-state-title">No Purchases Yet</h3>
        <p className="empty-state-description">
          Purchase transactions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Supplier</th>
            <th>Date</th>
            <th>Items</th>
            <th>Total Amount</th>
            <th>Paid Amount</th>
            <th>Pending</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td>
                <strong>PO-{purchase.id}</strong>
              </td>
              <td>{purchase.supplier_name}</td>
              <td className="text-muted">{formatDate(purchase.order_date)}</td>
              <td>{purchase.items_count} items</td>
              <td>
                <strong>{formatCurrency(purchase.total_amount)}</strong>
              </td>
              <td className="text-success">{formatCurrency(purchase.paid_amount)}</td>
              <td className="text-danger">
                {purchase.pending_amount > 0 ? formatCurrency(purchase.pending_amount) : '-'}
              </td>
              <td>
                <span className={`badge badge-${
                  purchase.status === 'received' ? 'green' :
                  purchase.status === 'pending' ? 'orange' : 'red'
                }`}>
                  {purchase.status}
                </span>
              </td>
              <td>
                <span className={`badge badge-${
                  purchase.payment_status === 'paid' ? 'green' :
                  purchase.payment_status === 'partial' ? 'orange' : 'red'
                }`}>
                  {purchase.payment_status}
                </span>
              </td>
              <td>
                {purchase.status === 'pending' && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleStatusChange(purchase.id, 'received')}
                    aria-label={`Mark order PO-${purchase.id} as received`}
                  >
                    <Check size={14} />
                    Received
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Transactions;
