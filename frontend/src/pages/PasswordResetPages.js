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

const PageShell = ({ children, rightContent }) => (
  <div className="min-h-screen w-full" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #0f172a 40%, #131d33 100%)' }}>
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen max-w-[1440px] mx-auto">
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-28 py-12 relative">
        {children}
      </div>
      <div className="hidden lg:flex items-center justify-center relative px-8">
        <div className="absolute w-[350px] h-[350px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', top: '30%', right: '15%' }} />
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-2xl p-8 backdrop-blur-sm" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Brand = () => (
  <div className="flex items-center gap-2.5 mb-14">
    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' }}>
      <span className="text-white font-bold text-xs">P</span>
    </div>
    <span className="text-base font-semibold text-slate-200 tracking-tight">ProjectDash</span>
  </div>
);

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
    <PageShell
      rightContent={
        <>
          <img src={ILLUSTRATION} alt="Password security" className="w-full mb-8" />
          <h2 className="text-xl font-semibold text-white mb-2">Your security matters</h2>
          <p className="text-slate-500 text-sm leading-relaxed">We'll send a secure link to your email so you can safely reset your password.</p>
        </>
      }
    >
      <Link to="/login" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors group" data-testid="back-login-link">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm">Back to login</span>
      </Link>

      <div className="w-full max-w-[400px] mx-auto">
        <Brand />

        {sent ? (
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Check your email</h1>
              <p className="text-slate-400 text-sm">If an account exists with <span className="text-white">{email}</span>, we've sent a reset link.</p>
            </div>
            <Link to="/login">
              <Button variant="outline" className="h-11 w-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white mt-4 rounded-lg">
                <ArrowLeft size={16} className="mr-2" /> Back to login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Forgot password?</h1>
            <p className="text-slate-500 text-sm mb-10">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email address</Label>
                <Input id="email" data-testid="forgot-email-input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg" />
              </div>
              <Button type="submit" data-testid="forgot-submit-btn" className="h-11 w-full rounded-lg font-semibold text-sm bg-white text-slate-900 hover:bg-slate-100 transition-all" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail size={16} className="mr-2" /> Send reset link</>}
              </Button>
            </form>
          </>
        )}
      </div>
    </PageShell>
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
    <PageShell
      rightContent={
        <>
          <img src={ILLUSTRATION} alt="Password security" className="w-full mb-8" />
          <h2 className="text-xl font-semibold text-white mb-2">Almost there</h2>
          <p className="text-slate-500 text-sm leading-relaxed">Choose a strong password to keep your account safe.</p>
        </>
      }
    >
      <div className="w-full max-w-[400px] mx-auto">
        <Brand />

        {!token ? (
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Lock className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Invalid link</h1>
              <p className="text-slate-400 text-sm">This password reset link is invalid or expired.</p>
            </div>
            <Link to="/forgot-password">
              <Button className="h-11 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-lg mt-2">Request new link</Button>
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Password reset!</h1>
              <p className="text-slate-400 text-sm">Redirecting to login...</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Set new password</h1>
            <p className="text-slate-500 text-sm mb-10">Choose a strong password for your account.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-400 uppercase tracking-wider">New password</Label>
                <Input id="password" data-testid="reset-password-input" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Confirm password</Label>
                <Input id="confirm" data-testid="reset-confirm-password-input" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg" />
              </div>
              <Button type="submit" data-testid="reset-submit-btn" className="h-11 w-full rounded-lg font-semibold text-sm bg-white text-slate-900 hover:bg-slate-100 transition-all" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock size={16} className="mr-2" /> Reset password</>}
              </Button>
            </form>
          </>
        )}
      </div>
    </PageShell>
  );
}
