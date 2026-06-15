import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { loginUser } from '../services/firebaseService';
import { useToast } from '../hooks/useToast';
import Button from '../components/UI/Button';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { currentUser, loading: authLoading, isAdmin } = useAuth();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (currentUser && !authLoading) {
      if (isAdmin && from === '/') {
        navigate('/dashboard', { replace: true });
      } else if (from === '/') {
        navigate('/profile', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [currentUser, authLoading, isAdmin, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    setLoading(true);
    try {
      await loginUser(email, password);
      showToast('Logged in successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to log in', 'error');
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[28px] bg-white p-8 shadow-card sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy text-white shadow-sm">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-navy">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-primary-300 focus:outline-none"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-primary-300 focus:outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
