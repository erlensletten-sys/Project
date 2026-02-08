import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, FileText, Users, ClipboardCheck } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const ILLUSTRATION = "https://static.prod-images.emergentagent.com/jobs/e092c34e-e184-480c-9705-0791d2782d66/images/e4e3c714150c760f4a51bac490a8eb01e967d33afe28314454b6d9e285fd0ed8.png";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', groupName: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password, group_name: formData.groupName }),
      });
      const data = await response.json();
      if (response.ok && data.ok) { login(data.user); toast.success('Organization created!'); navigate('/'); }
      else { toast.error(data.detail || 'Registration failed'); }
    } catch { toast.error('Registration failed.'); }
    finally { setLoading(false); }
  };

  const features = [
    { icon: FileText, title: 'Invoicing', desc: 'Professional invoices in seconds' },
    { icon: Users, title: 'Team Management', desc: 'Roles, payroll, and scheduling' },
    { icon: ClipboardCheck, title: 'Checklists & HSE', desc: 'Compliance made simple' },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #0f172a 40%, #131d33 100%)' }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen max-w-[1440px] mx-auto">

        {/* Left - Illustration */}
        <div className="hidden lg:flex items-center justify-center relative px-8 order-2 lg:order-1">
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', top: '20%', left: '10%' }} />

          <div className="relative z-10 w-full max-w-md">
            <div className="rounded-2xl p-8 backdrop-blur-sm" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <img src={ILLUSTRATION} alt="Team collaboration" className="w-full mb-8" />

              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                      <f.icon className="text-blue-400" size={16} />
                    </div>
                    <div>
                      <h3 className="font-medium text-white text-sm">{f.title}</h3>
                      <p className="text-[11px] text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-slate-400 text-xs italic leading-relaxed">
                  "ProjectDash transformed how we manage our construction projects."
                </p>
                <div className="flex items-center gap-2.5 mt-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>EL</div>
                  <div>
                    <div className="text-xs font-medium text-slate-300">Erik Larsen</div>
                    <div className="text-[10px] text-slate-600">CEO, Bygg & Anlegg AS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Form */}
        <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-28 py-12 order-1 lg:order-2">
          <div className="w-full max-w-[400px] mx-auto">

            <div className="flex items-center gap-2.5 mb-14">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' }}>
                <span className="text-white font-bold text-xs">P</span>
              </div>
              <span className="text-base font-semibold text-slate-200 tracking-tight">ProjectDash</span>
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create your account</h1>
            <p className="text-slate-500 text-sm mb-10">Get your team started with ProjectDash.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="groupName" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Organization</Label>
                <Input id="groupName" name="groupName" data-testid="register-org-input" placeholder="Acme Construction AS" value={formData.groupName} onChange={handleChange} required className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Full name</Label>
                <Input id="name" name="name" data-testid="register-name-input" placeholder="John Doe" value={formData.name} onChange={handleChange} required className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Work email</Label>
                <Input id="email" name="email" data-testid="register-email-input" type="email" placeholder="john@company.com" value={formData.email} onChange={handleChange} required className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</Label>
                <Input id="password" name="password" data-testid="register-password-input" type="password" placeholder="Min. 8 characters" value={formData.password} onChange={handleChange} required minLength={8} className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg" />
              </div>

              <Button type="submit" disabled={loading} data-testid="register-submit-btn" className="h-11 w-full rounded-lg font-semibold text-sm transition-all duration-200 mt-2 bg-white text-slate-900 hover:bg-slate-100">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create organization <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors" data-testid="login-link">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
