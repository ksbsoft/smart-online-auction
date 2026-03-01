import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import { Save, ArrowLeft, Upload, X, Image } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    starting_price: '',
    status: 'draft',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
    
    if (isEdit) {
      api.get(`/products/${id}`).then(res => {
        const p = res.data;
        setForm({
          title: p.title,
          description: p.description || '',
          category_id: p.category_id || '',
          starting_price: p.starting_price,
          status: p.status,
        });
        if (p.image_url) setImagePreview(p.image_url);
        setFetching(false);
      }).catch(() => {
        toast.error('Product not found');
        navigate('/admin/products');
      });
    }
  }, [id, isEdit, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      toast.error('Title is required');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category_id', form.category_id);
      formData.append('starting_price', form.starting_price || 0);
      formData.append('status', form.status);
      if (imageFile) formData.append('image', imageFile);

      if (isEdit) {
        await api.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product created successfully');
      }
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
          <p className="text-gray-500 text-sm">{isEdit ? 'Update product details' : 'Create a new product listing'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Product Image</h2>
          <div className="flex items-start gap-4">
            <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border-2 border-dashed border-gray-300">
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Image className="h-8 w-8 text-gray-300" />
                </div>
              )}
            </div>
            <div>
              <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                {imagePreview ? 'Change Image' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF, WEBP up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Product Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              placeholder="Enter product title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field h-32 resize-none"
              placeholder="Detailed description of the product..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Price ($)</label>
              <input
                type="number"
                value={form.starting_price}
                onChange={(e) => setForm({ ...form, starting_price: e.target.value })}
                className="input-field"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="input-field"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link to="/admin/products" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
