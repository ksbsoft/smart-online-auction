import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import { Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAuctionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    product_id: '',
    start_time: '',
    end_time: '',
    starting_bid: '',
    reserve_price: '',
    bid_increment: '10',
    status: 'upcoming',
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    // Fetch products for dropdown
    api.get('/products', { params: { limit: 100 } }).then(res => {
      setProducts(res.data.products);
    }).catch(() => {});

    if (isEdit) {
      api.get(`/auctions/${id}`).then(res => {
        const a = res.data;
        setForm({
          product_id: a.product_id,
          start_time: formatDateTimeLocal(a.start_time),
          end_time: formatDateTimeLocal(a.end_time),
          starting_bid: a.starting_bid,
          reserve_price: a.reserve_price || '',
          bid_increment: a.bid_increment,
          status: a.status,
        });
        setFetching(false);
      }).catch(() => {
        toast.error('Auction not found');
        navigate('/admin/auctions');
      });
    }
  }, [id, isEdit, navigate]);

  function formatDateTimeLocal(isoString) {
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.start_time || !form.end_time || !form.starting_bid) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startDate = new Date(form.start_time);
    const endDate = new Date(form.end_time);
    if (endDate <= startDate) {
      toast.error('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        product_id: parseInt(form.product_id),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        starting_bid: parseFloat(form.starting_bid),
        reserve_price: form.reserve_price ? parseFloat(form.reserve_price) : 0,
        bid_increment: parseFloat(form.bid_increment) || 10,
      };

      if (isEdit) {
        payload.status = form.status;
        await api.put(`/auctions/${id}`, payload);
        toast.success('Auction updated');
      } else {
        await api.post('/auctions', payload);
        toast.success('Auction created');
      }
      navigate('/admin/auctions');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save auction');
    } finally {
      setLoading(false);
    }
  };

  // Set default dates
  useEffect(() => {
    if (!isEdit && !form.start_time) {
      const now = new Date();
      const start = new Date(now.getTime() + 5 * 60 * 1000); // 5 min from now
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 24 hrs
      setForm(f => ({
        ...f,
        start_time: formatDateTimeLocal(start.toISOString()),
        end_time: formatDateTimeLocal(end.toISOString()),
      }));
    }
  }, [isEdit]);

  // Auto-fill starting bid from product
  useEffect(() => {
    if (form.product_id && !isEdit) {
      const product = products.find(p => p.id === parseInt(form.product_id));
      if (product) {
        setForm(f => ({
          ...f,
          starting_bid: product.starting_price || '',
          reserve_price: product.starting_price ? (product.starting_price * 1.2).toFixed(2) : '',
        }));
      }
    }
  }, [form.product_id, products, isEdit]);

  if (fetching) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/auctions" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Auction' : 'Create New Auction'}</h1>
          <p className="text-gray-500 text-sm">{isEdit ? 'Update auction settings' : 'Set up a new auction for a product'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Auction Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="input-field"
              required
              disabled={isEdit}
            >
              <option value="">Select a product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} - ${p.starting_price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Bid ($) *</label>
              <input
                type="number"
                value={form.starting_bid}
                onChange={(e) => setForm({ ...form, starting_bid: e.target.value })}
                className="input-field"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reserve Price ($)</label>
              <input
                type="number"
                value={form.reserve_price}
                onChange={(e) => setForm({ ...form, reserve_price: e.target.value })}
                className="input-field"
                min="0"
                step="0.01"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bid Increment ($)</label>
              <input
                type="number"
                value={form.bid_increment}
                onChange={(e) => setForm({ ...form, bid_increment: e.target.value })}
                className="input-field"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input-field"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link to="/admin/auctions" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Update Auction' : 'Create Auction'}
          </button>
        </div>
      </form>
    </div>
  );
}
