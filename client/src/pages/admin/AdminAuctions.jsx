import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Plus, Edit, Trash2, StopCircle, Eye, Clock, Gavel } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusBadge = {
  upcoming: 'badge-upcoming',
  active: 'badge-active',
  ended: 'badge-ended',
};

export default function AdminAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/auctions', { params });
      setAuctions(data.auctions);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [page, statusFilter]);

  const handleEndAuction = async (id) => {
    if (!window.confirm('Are you sure you want to end this auction? This cannot be undone.')) return;
    try {
      await api.patch(`/auctions/${id}/end`);
      toast.success('Auction ended');
      fetchAuctions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to end auction');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this auction?')) return;
    try {
      await api.delete(`/auctions/${id}`);
      toast.success('Auction deleted');
      fetchAuctions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auctions</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total auctions</p>
        </div>
        <Link to="/admin/auctions/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Auction
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'upcoming', 'active', 'ended'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : auctions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Current Bid</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Bids</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Schedule</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Winner</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auctions.map(auction => (
                  <tr key={auction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {auction.product_image ? (
                            <img src={auction.product_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Gavel className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 line-clamp-1">{auction.product_title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={statusBadge[auction.status] || 'badge'}>
                        {auction.status === 'active' && <span className="live-dot mr-1.5 inline-block" />}
                        {auction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ${(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{auction.bid_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(auction.start_time), 'MMM d, h:mm a')}
                      </div>
                      <div className="text-xs text-gray-400">
                        to {format(new Date(auction.end_time), 'MMM d, h:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {auction.winner_name ? (
                        <span className="text-green-600 font-medium">{auction.winner_name}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/auctions/${auction.id}`}
                          target="_blank"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {auction.status !== 'ended' && (
                          <Link
                            to={`/admin/auctions/${auction.id}/edit`}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        )}
                        {auction.status === 'active' && (
                          <button
                            onClick={() => handleEndAuction(auction.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600"
                            title="End Auction"
                          >
                            <StopCircle className="h-4 w-4" />
                          </button>
                        )}
                        {auction.status !== 'active' && (
                          <button
                            onClick={() => handleDelete(auction.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Gavel className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No auctions found</p>
            <Link to="/admin/auctions/new" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
              Create your first auction
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
