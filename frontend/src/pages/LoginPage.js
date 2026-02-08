import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ChevronRight } from 'lucide-react';

const ILLUSTRATION = "https://static.prod-images.emergentagent.com/jobs/e092c34e-e184-480c-9705-0791d2782d66/images/4b5f3346085e2645ce6ef6cf85c3584863e49f47533be14838c9ee6e39592491.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t('auth.loginSuccess'));
      navigate('/');
    } catch (error) {
      toast.error(error.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
      {/* Left - Form */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 bg-[#020817]">
        <div className="w-full max-w-[420px] mx-auto space-y-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-10">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">ProjectDash</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Welcome back
            </h1>
            <p className="text-slate-400 mt-2 text-base">
              Sign in to continue to your workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  data-testid="forgot-password-link"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="h-11 w-full text-white font-semibold rounded-lg transition-all duration-200 mt-2"
              style={{ backgroundColor: '#f97316' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#ea580c'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f97316'}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Sign in <ChevronRight className="ml-1.5 h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="pt-6 border-t border-slate-800">
            <p className="text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-orange-400 hover:text-orange-300 font-medium" data-testid="register-link">
                Create organization
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right - Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)', backgroundSize: '20px 20px'}} />
        <div className="relative z-10 flex flex-col items-center px-12 max-w-lg text-center">
          <img
            src={ILLUSTRATION}
            alt="Project dashboard"
            className="w-full max-w-md mb-10 drop-shadow-xl"
          />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Manage projects with clarity</h2>
          <p className="text-slate-500 leading-relaxed">
            Invoicing, payroll, checklists, and HSE documentation — all in one place.
          </p>
          <div className="flex gap-8 mt-8 pt-6 border-t border-slate-200 w-full justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">2,500+</div>
              <div className="text-xs text-slate-500">Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">50M+</div>
              <div className="text-xs text-slate-500">Invoices</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">4.9/5</div>
              <div className="text-xs text-slate-500">Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
