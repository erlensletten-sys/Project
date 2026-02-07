import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    groupName: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, formData.groupName);
      toast.success('Organization created successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Abstract illustration */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 relative overflow-hidden"
      >
        {/* Abstract geometric shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-orange-400/15 rounded-full blur-2xl"></div>
          
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Decorative lines */}
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>
          <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>
        </div>
        
        {/* Content */}
        <div className="relative w-full h-full flex flex-col justify-end p-12 z-10">
          {/* Icon/Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-orange-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-orange-500/30">
              <Building2 className="text-orange-400" size={40} strokeWidth={1.5} />
            </div>
          </div>
          
          <h2 className="heading text-4xl font-bold text-white mb-4">
            Built for Nordic businesses
          </h2>
          <p className="text-slate-300 text-lg max-w-md">
            Complete business management tailored for construction, field services, and SMBs.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-900">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <Building2 className="text-white" size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="heading text-2xl font-bold text-white">NordicForge</h1>
              <p className="text-slate-400 text-sm">Business Management Platform</p>
            </div>
          </div>

          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="heading text-xl text-white">Create your organization</CardTitle>
              <CardDescription className="text-slate-400">Set up your business management account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-slate-200">Organization Name</Label>
                  <Input
                    id="groupName"
                    name="groupName"
                    data-testid="register-org-input"
                    type="text"
                    placeholder="Your Company AS"
                    value={formData.groupName}
                    onChange={handleChange}
                    required
                    className="h-11 bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">Your Name</Label>
                  <Input
                    id="name"
                    name="name"
                    data-testid="register-name-input"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-11 bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    data-testid="register-email-input"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-11 bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    data-testid="register-password-input"
                    type="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-11 bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-200">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    data-testid="register-confirm-password-input"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="h-11 bg-slate-700 border-slate-600"
                  />
                </div>

                <Button
                  type="submit"
                  data-testid="register-submit-button"
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating organization...
                    </>
                  ) : (
                    'Create organization'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    data-testid="login-link"
                    className="text-orange-500 hover:text-orange-600 font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
