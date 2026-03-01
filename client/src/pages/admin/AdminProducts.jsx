import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import {
  Plus, Edit, Trash2, Archive, RotateCcw, Search, Filter,
  Image, MoreVertical, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const statusBadge = {
  draft: 'badge-draft',
  active: 'badge-active',
  archived: 'badge-archived',
  sold: 'badge-sold',
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMenu, setActionMenu] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const { data } = await api.get('/products', { params });
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleArchive = async (id) => {
    try {
      await api.patch(`/products/${id}/archive`);
      toast.success('Product archived');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to archive');
    }
    setActionMenu(null);
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/products/${id}/restore`);
      toast.success('Product restored');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to restore');
    }
    setActionMenu(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this product? This cannot be undone.')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
    setActionMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total products</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['', 'draft', 'active', 'archived', 'sold'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Starting Price</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Image className="h-5 w-5 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{product.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.category_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ${product.starting_price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={statusBadge[product.status] || 'badge'}>{product.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          {product.status !== 'archived' ? (
                            <button
                              onClick={() => handleArchive(product.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition-colors"
                              title="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(product.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors"
                              title="Restore"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 15 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * 15 + 1}-{Math.min(page * 15, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">
                    Previous
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total} className="btn-secondary text-sm disabled:opacity-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Image className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No products found</p>
            <Link to="/admin/products/new" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
              Add your first product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
