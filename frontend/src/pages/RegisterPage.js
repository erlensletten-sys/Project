import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Building2, Users, FileText, ClipboardCheck, ChevronRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Hero image for the visual panel
const HERO_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    groupName: ''
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
          name: formData.name,
          email: formData.email,
          password: formData.password,
          group_name: formData.groupName
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
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FileText, title: 'Invoicing', desc: 'Professional invoices in seconds' },
    { icon: Users, title: 'Team Management', desc: 'Manage employees and payroll' },
    { icon: ClipboardCheck, title: 'Checklists & HSE', desc: 'Compliance made simple' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full overflow-hidden bg-[#020817]">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden order-2 lg:order-1">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/70 to-[#020817]/30" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#020817]/50 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end h-full p-12">
          {/* Main Text */}
          <h2 
            className="text-4xl xl:text-5xl font-bold text-white mb-4 max-w-lg tracking-tight"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Join thousands of Nordic businesses.
          </h2>
          <p className="text-xl text-slate-400 max-w-md mb-12">
            Streamline your operations with our all-in-one platform.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 max-w-md"
              >
                <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-12 pt-8 border-t border-slate-700/50 max-w-md">
            <p className="text-slate-300 italic mb-4">
              "ProjectDash transformed how we manage our construction projects. The time we save on invoicing alone is incredible."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-semibold">
                EL
              </div>
              <div>
                <div className="font-medium text-white">Erik Larsen</div>
                <div className="text-sm text-slate-400">CEO, Bygg & Anlegg AS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="relative flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 h-full order-1 lg:order-2">
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
              Create an account
            </h1>
            <p className="text-slate-400 text-lg">
              Get started with ProjectDash today.
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="groupName" className="text-sm font-medium text-slate-300">
                Organization name
              </Label>
              <Input
                id="groupName"
                name="groupName"
                data-testid="register-org-input"
                type="text"
                placeholder="Acme Construction AS"
                value={formData.groupName}
                onChange={handleChange}
                required
                className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-300">
                Your full name
              </Label>
              <Input
                id="name"
                name="name"
                data-testid="register-name-input"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                Work email
              </Label>
              <Input
                id="email"
                name="email"
                data-testid="register-email-input"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                data-testid="register-password-input"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="h-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
              />
              <p className="text-xs text-slate-500">Minimum 8 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="register-submit-btn"
              className="h-12 w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating organization...
                </>
              ) : (
                <>
                  Create organization
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-green-500 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-green-500 hover:underline">Privacy Policy</a>
            </p>
          </form>

          {/* Login Link */}
          <div className="pt-6 border-t border-slate-800">
            <p className="text-center text-slate-400">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-green-500 hover:text-green-400 font-medium transition-colors"
                data-testid="login-link"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
