import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Package, Gavel, TrendingUp, DollarSign, Users, ArrowUpRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'from-blue-500 to-blue-600', link: '/admin/products' },
    { label: 'Active Auctions', value: stats?.activeAuctions || 0, icon: Gavel, color: 'from-green-500 to-green-600', link: '/admin/auctions' },
    { label: 'Total Bids', value: stats?.totalBids || 0, icon: TrendingUp, color: 'from-purple-500 to-purple-600', link: '/admin/auctions' },
    { label: 'Total Revenue', value: `$${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'from-amber-500 to-amber-600', link: '/admin/auctions' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your auction platform</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/products/new" className="btn-primary flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" /> Add Product
          </Link>
          <Link to="/admin/auctions/new" className="btn-success flex items-center gap-2 text-sm">
            <Gavel className="h-4 w-4" /> Create Auction
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <Link
            key={i}
            to={card.link}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`bg-gradient-to-br ${card.color} p-3 rounded-xl`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions & Recent Bids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/products/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-blue-100 p-2 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Add New Product</p>
                <p className="text-sm text-gray-500">Create a new product listing</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
            </Link>
            <Link
              to="/admin/auctions/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-green-100 p-2 rounded-lg">
                <Gavel className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Create New Auction</p>
                <p className="text-sm text-gray-500">Set up a new auction for a product</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
            </Link>
            <Link
              to="/admin/products"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Manage Products</p>
                <p className="text-sm text-gray-500">View and manage all products</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
            </Link>
          </div>
        </div>

        {/* Recent Bids */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Bids</h2>
          {stats?.recentBids?.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-auto">
              {stats.recentBids.map((bid, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                      {bid.bidder_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bid.bidder_name}</p>
                      <p className="text-xs text-gray-500">{bid.product_title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">${bid.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {format(new Date(bid.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No bids yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
