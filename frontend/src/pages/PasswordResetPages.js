import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Loader2, Lock, CheckCircle, Building2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error(t('auth.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSent(true);
        toast.success(t('auth.resetLinkSent'));
      } else {
        toast.error(data.detail || 'Failed to send reset email');
      }
    } catch (error) {
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020817] relative overflow-hidden">
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

      {/* Back to login link */}
      <Link 
        to="/login" 
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group z-20"
        data-testid="back-login-link"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to login</span>
      </Link>

      <div className="w-full max-w-md mx-auto px-8 relative z-10">
        {sent ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h1 
                className="text-3xl font-bold text-white"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Check your email
              </h1>
              <p className="text-slate-400">
                If an account exists with <span className="text-white">{email}</span>, we've sent a password reset link.
              </p>
            </div>
            <div className="pt-4">
              <Link to="/login">
                <Button 
                  variant="outline" 
                  className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Logo & Brand */}
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-xl font-semibold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  ProjectDash
                </span>
              </div>
              
              <div className="space-y-2">
                <h1 
                  className="text-3xl md:text-4xl font-bold text-white"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Forgot password?
                </h1>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                  Email address
                </Label>
                <Input
                  id="email"
                  data-testid="forgot-email-input"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
                />
              </div>

              <Button 
                type="submit" 
                data-testid="forgot-submit-btn"
                className="h-12 w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} className="mr-2" />
                    Send reset link
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        toast.success(t('auth.passwordResetSuccess'));
        setTimeout(() => navigate('/login'), 3000);
      } else {
        toast.error(data.detail || t('auth.invalidResetToken'));
      }
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020817] relative overflow-hidden">
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md mx-auto px-8 relative z-10">
        {!token ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 
                className="text-3xl font-bold text-white"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Invalid link
              </h1>
              <p className="text-slate-400">
                This password reset link is invalid or has expired.
              </p>
            </div>
            <Link to="/forgot-password">
              <Button className="h-12 bg-green-600 hover:bg-green-700 text-white font-semibold">
                Request new link
              </Button>
            </Link>
          </div>
        ) : success ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h1 
                className="text-3xl font-bold text-white"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Password reset!
              </h1>
              <p className="text-slate-400">
                Your password has been successfully reset. Redirecting to login...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Logo & Brand */}
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-xl font-semibold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  ProjectDash
                </span>
              </div>
              
              <div className="space-y-2">
                <h1 
                  className="text-3xl md:text-4xl font-bold text-white"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Set new password
                </h1>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Enter your new password below.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                  New password
                </Label>
                <Input
                  id="password"
                  data-testid="reset-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-300">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  data-testid="reset-confirm-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
                />
              </div>

              <Button 
                type="submit" 
                data-testid="reset-submit-btn"
                className="h-12 w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Lock size={18} className="mr-2" />
                    Reset password
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
