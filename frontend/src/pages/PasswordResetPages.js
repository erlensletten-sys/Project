import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Loader2, Lock, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const ILLUSTRATION = "https://static.prod-images.emergentagent.com/jobs/e092c34e-e184-480c-9705-0791d2782d66/images/70e60358258c736aa61db3ec1966558d7e6b8ef18cbd5978a4667b1d2f4940b5.png";

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error(t('auth.emailRequired')); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) { setSent(true); toast.success(t('auth.resetLinkSent')); }
      else { const data = await response.json(); toast.error(data.detail || 'Failed to send reset email'); }
    } catch { toast.error('Failed to send reset email'); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
      {/* Left - Form */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 bg-[#020817]">
        <Link to="/login" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group z-20" data-testid="back-login-link">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to login</span>
        </Link>

        <div className="w-full max-w-[420px] mx-auto space-y-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">ProjectDash</span>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Check your email</h1>
                <p className="text-slate-400">If an account exists with <span className="text-white">{email}</span>, we've sent a password reset link.</p>
              </div>
              <Link to="/login">
                <Button variant="outline" className="h-11 w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white mt-4">
                  <ArrowLeft size={16} className="mr-2" /> Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Forgot password?</h1>
                <p className="text-slate-400 mt-2">Enter your email and we'll send you a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-300">Email address</Label>
                  <Input id="email" data-testid="forgot-email-input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg" />
                </div>
                <Button type="submit" data-testid="forgot-submit-btn" className="h-11 w-full text-white font-semibold rounded-lg transition-all duration-200" style={{ backgroundColor: '#f97316' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#ea580c'} onMouseLeave={(e) => e.target.style.backgroundColor = '#f97316'} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail size={16} className="mr-2" /> Send reset link</>}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right - Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)', backgroundSize: '20px 20px'}} />
        <div className="relative z-10 flex flex-col items-center px-12 max-w-lg text-center">
          <img src={ILLUSTRATION} alt="Password security" className="w-full max-w-sm mb-10 drop-shadow-xl" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Your security matters</h2>
          <p className="text-slate-500 leading-relaxed">We'll send a secure link to your email so you can safely reset your password.</p>
        </div>
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
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });
      if (response.ok) { setSuccess(true); toast.success(t('auth.passwordResetSuccess')); setTimeout(() => navigate('/login'), 3000); }
      else { const data = await response.json(); toast.error(data.detail || t('auth.invalidResetToken')); }
    } catch { toast.error('Failed to reset password'); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 bg-[#020817]">
        <div className="w-full max-w-[420px] mx-auto space-y-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">ProjectDash</span>
          </div>

          {!token ? (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Invalid link</h1>
                <p className="text-slate-400">This password reset link is invalid or has expired.</p>
              </div>
              <Link to="/forgot-password">
                <Button className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold mt-2">Request new link</Button>
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Password reset!</h1>
                <p className="text-slate-400">Your password has been successfully reset. Redirecting to login...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Set new password</h1>
                <p className="text-slate-400 mt-2">Choose a strong password for your account.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-300">New password</Label>
                  <Input id="password" data-testid="reset-password-input" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-sm font-medium text-slate-300">Confirm password</Label>
                  <Input id="confirm" data-testid="reset-confirm-password-input" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg" />
                </div>
                <Button type="submit" data-testid="reset-submit-btn" className="h-11 w-full text-white font-semibold rounded-lg transition-all duration-200" style={{ backgroundColor: '#f97316' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#ea580c'} onMouseLeave={(e) => e.target.style.backgroundColor = '#f97316'} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock size={16} className="mr-2" /> Reset password</>}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right - Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)', backgroundSize: '20px 20px'}} />
        <div className="relative z-10 flex flex-col items-center px-12 max-w-lg text-center">
          <img src={ILLUSTRATION} alt="Password security" className="w-full max-w-sm mb-10 drop-shadow-xl" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Your security matters</h2>
          <p className="text-slate-500 leading-relaxed">Choose a strong password to keep your account safe and secure.</p>
        </div>
      </div>
    </div>
  );
}
