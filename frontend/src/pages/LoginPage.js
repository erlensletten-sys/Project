import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Building2, Shield, Zap, ChevronRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Hero image for the visual panel
const HERO_IMAGE = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80";

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
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.ok) {
        login(data.user);
        toast.success(t('auth.loginSuccess'));
        navigate('/');
      } else {
        toast.error(data.detail || t('auth.invalidCredentials'));
      }
    } catch (error) {
      toast.error(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full overflow-hidden bg-[#020817]">
      {/* Left Panel - Form */}
      <div className="relative flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 h-full">
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Back to home link */}
        <Link 
          to="/" 
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          data-testid="back-home-link"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Home</span>
        </Link>

        <div className="w-full max-w-md mx-auto space-y-8 relative z-10">
          {/* Logo & Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-xl font-semibold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                ProjectDash
              </span>
            </div>
            
            <h1 
              className="text-4xl md:text-5xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Welcome back
            </h1>
            <p className="text-slate-400 text-lg">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email address
              </Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Password
                </Label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-green-500 hover:text-green-400 transition-colors"
                  data-testid="forgot-password-link"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="h-12 w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="pt-6 border-t border-slate-800">
            <p className="text-center text-slate-400">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-green-500 hover:text-green-400 font-medium transition-colors"
                data-testid="register-link"
              >
                Create organization
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/70 to-[#020817]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/50 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end h-full p-12">
          {/* Trust Badges */}
          <div className="flex gap-6 mb-8">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm font-medium">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
          </div>

          {/* Main Text */}
          <h2 
            className="text-4xl xl:text-5xl font-bold text-white mb-4 max-w-lg tracking-tight"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Building the future of Nordic enterprise.
          </h2>
          <p className="text-xl text-slate-400 max-w-md">
            Secure. Efficient. Reliable.
          </p>

          {/* Stats */}
          <div className="flex gap-12 mt-12 pt-8 border-t border-slate-700/50">
            <div>
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>2,500+</div>
              <div className="text-sm text-slate-400">Active businesses</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>50M+</div>
              <div className="text-sm text-slate-400">Invoices processed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>4.9/5</div>
              <div className="text-sm text-slate-400">Customer rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
