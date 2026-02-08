import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ChevronRight, FileText, Users, ClipboardCheck } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const ILLUSTRATION = "https://static.prod-images.emergentagent.com/jobs/e092c34e-e184-480c-9705-0791d2782d66/images/e4e3c714150c760f4a51bac490a8eb01e967d33afe28314454b6d9e285fd0ed8.png";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', groupName: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name, email: formData.email,
          password: formData.password, group_name: formData.groupName
        }),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        login(data.user);
        toast.success('Organization created successfully!');
        navigate('/');
      } else {
        toast.error(data.detail || 'Registration failed');
      }
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FileText, title: 'Invoicing', desc: 'Professional invoices in seconds' },
    { icon: Users, title: 'Team Management', desc: 'Roles, payroll and scheduling' },
    { icon: ClipboardCheck, title: 'Checklists & HSE', desc: 'Compliance made simple' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
      {/* Left - Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 relative overflow-hidden order-2 lg:order-1">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)', backgroundSize: '20px 20px'}} />
        <div className="relative z-10 flex flex-col items-center px-12 max-w-lg">
          <img
            src={ILLUSTRATION}
            alt="Team collaboration"
            className="w-full max-w-md mb-10 drop-shadow-xl"
          />
          <div className="space-y-3 w-full">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 bg-white/70 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
                <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-orange-500" size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{f.title}</h3>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Testimonial */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 w-full">
            <p className="text-slate-600 text-sm italic leading-relaxed">
              "ProjectDash transformed how we manage our construction projects. The time saved on invoicing alone is incredible."
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-semibold">EL</div>
              <div>
                <div className="text-sm font-medium text-slate-800">Erik Larsen</div>
                <div className="text-xs text-slate-500">CEO, Bygg & Anlegg AS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 bg-[#020817] order-1 lg:order-2">
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
              Create your account
            </h1>
            <p className="text-slate-400 mt-2 text-base">Get started with ProjectDash today.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="groupName" className="text-sm font-medium text-slate-300">Organization name</Label>
              <Input id="groupName" name="groupName" data-testid="register-org-input" type="text" placeholder="Acme Construction AS" value={formData.groupName} onChange={handleChange} required className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-slate-300">Your full name</Label>
              <Input id="name" name="name" data-testid="register-name-input" type="text" placeholder="John Doe" value={formData.name} onChange={handleChange} required className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">Work email</Label>
              <Input id="email" name="email" data-testid="register-email-input" type="email" placeholder="john@company.com" value={formData.email} onChange={handleChange} required className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">Password</Label>
              <Input id="password" name="password" data-testid="register-password-input" type="password" placeholder="Min. 8 characters" value={formData.password} onChange={handleChange} required minLength={8} className="h-11 bg-slate-900/60 border-slate-700/60 text-white placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg" />
            </div>

            <Button type="submit" disabled={loading} data-testid="register-submit-btn" className="h-11 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all duration-200 mt-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create organization <ChevronRight className="ml-1.5 h-4 w-4" /></>}
            </Button>

            <p className="text-xs text-slate-500 text-center pt-1">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-orange-400 hover:underline">Terms</a>{' '}and{' '}
              <a href="#" className="text-orange-400 hover:underline">Privacy Policy</a>
            </p>
          </form>

          <div className="pt-6 border-t border-slate-800">
            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium" data-testid="login-link">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
