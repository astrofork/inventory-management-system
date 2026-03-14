import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  ArrowLeftRight,
  Menu,
  X,
  LogOut,
  Store,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });
  const { logout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/purchases', icon: ShoppingCart, label: 'Purchases' },
    { path: '/billing', icon: FileText, label: 'Billing' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  ];

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        role="navigation"
        aria-label="Main sidebar navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Store size={32} />
            <div>
              <h1 className="brand-title">Inventory</h1>
              <p className="brand-subtitle">Management System</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''}`
                }
                onClick={() => {
                  // close sidebar by default on mobile
                  if (window.innerWidth <= 768) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost w-full" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile screens */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay-visible' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
      />

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <button
            className="btn-icon menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="header-actions">
            <button
              className="btn-icon theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
