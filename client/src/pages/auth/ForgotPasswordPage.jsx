import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const { requestBidderPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const data = await requestBidderPasswordReset(email);
      toast.success(data.message || 'Reset instructions sent');
      if (data.resetToken) {
        setGeneratedToken(data.resetToken);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your account email to generate a reset token.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary py-3">
            {loading ? 'Generating...' : 'Generate Reset Token'}
          </button>
        </form>

        {generatedToken && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700 font-medium mb-1">Reset Token (demo mode)</p>
            <p className="text-xs text-amber-900 break-all font-mono">{generatedToken}</p>
            <Link
              to={`/reset-password?token=${generatedToken}`}
              className="text-primary-700 hover:text-primary-800 text-sm font-medium mt-2 inline-block"
            >
              Continue to reset password →
            </Link>
          </div>
        )}

        <p className="mt-6 text-sm text-gray-500 text-center">
          Back to{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
