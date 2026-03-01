import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, Gavel, LogOut, ChevronRight,
  Menu, X, Home
} from 'lucide-react';
import { useState } from 'react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/admin/products', icon: Package, label: 'Products' },
    { to: '/admin/auctions', icon: Gavel, label: 'Auctions' },
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary-500 to-purple-500 p-2 rounded-lg">
            <Gavel className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg">Smart Auction</div>
            <div className="text-gray-400 text-xs">Admin Panel</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive(item)
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {isActive(item) && <ChevronRight className="h-4 w-4 ml-auto" />}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-700">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors mb-2"
        >
          <Home className="h-4 w-4" />
          View Site
        </Link>
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <div className="text-white text-sm font-medium">{user?.username}</div>
            <div className="text-gray-400 text-xs">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-gray-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 flex flex-col z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4 lg:px-8 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-4"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-800">
              {navItems.find(item => isActive(item))?.label || 'Admin'}
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
