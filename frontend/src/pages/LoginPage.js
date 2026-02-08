import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen w-full" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #0f172a 40%, #131d33 100%)' }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen max-w-[1440px] mx-auto">

        {/* Left - Form */}
        <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-28 py-12">
          <div className="w-full max-w-[400px] mx-auto">

            {/* Brand */}
            <div className="flex items-center gap-2.5 mb-14">
              <img src="/logo.png" alt="ProjectDash" className="w-8 h-8 rounded-md object-contain" />
              <span className="text-base font-semibold text-slate-200 tracking-tight">ProjectDash</span>
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-slate-500 text-sm mb-10">
              Enter your credentials to access your workspace.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</Label>
                <Input
                  id="email"
                  data-testid="login-email-input"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
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
                  className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                data-testid="login-submit-btn"
                className="h-11 w-full rounded-lg font-semibold text-sm transition-all duration-200 mt-3 bg-white text-slate-900 hover:bg-slate-100"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-8">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors" data-testid="register-link">
                Create organization
              </Link>
            </p>
          </div>
        </div>

        {/* Right - Illustration */}
        <div className="hidden lg:flex items-center justify-center relative px-8">
          {/* Glow */}
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', top: '25%', right: '10%' }} />
          <div className="absolute w-[250px] h-[250px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)', bottom: '20%', left: '15%' }} />

          <div className="relative z-10 w-full max-w-md">
            {/* Card */}
            <div className="rounded-2xl p-8 backdrop-blur-sm" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <img
                src={ILLUSTRATION}
                alt="Project dashboard"
                className="w-full mb-8"
              />
              <h2 className="text-xl font-semibold text-white mb-2">Manage projects with clarity</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Invoicing, payroll, checklists, and HSE — all in one place for your team.
              </p>

              <div className="flex gap-6 mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { value: '2,500+', label: 'Businesses' },
                  { value: '50M+', label: 'Invoices' },
                  { value: '4.9/5', label: 'Rating' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center flex-1">
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
