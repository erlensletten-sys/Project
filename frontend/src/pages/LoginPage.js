import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
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
      toast.success(t('auth.welcomeBack') + '!');
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
              <pattern id="grid-login" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-login)" />
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
            {t('auth.heroTitle')}
          </h2>
          <p className="text-slate-300 text-lg max-w-md">
            {t('auth.heroSubtitle')}
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
              <h1 className="heading text-2xl font-bold text-white">ProjectDash</h1>
              <p className="text-slate-400 text-sm">Business Management Platform</p>
            </div>
          </div>

          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="heading text-xl text-white">{t('auth.signIn')}</CardTitle>
              <CardDescription className="text-slate-400">{t('auth.enterCredentials')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    data-testid="login-email-input"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-200">{t('auth.password')}</Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-xs text-orange-400 hover:text-orange-300"
                    >
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type="password"
                    placeholder={t('auth.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-slate-700 border-slate-600"
                  />
                </div>

                <Button
                  type="submit"
                  data-testid="login-submit-button"
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.signingIn')}
                    </>
                  ) : (
                    t('auth.signIn')
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  {t('auth.noAccount')}{' '}
                  <Link 
                    to="/register" 
                    data-testid="register-link"
                    className="text-orange-500 hover:text-orange-600 font-medium"
                  >
                    {t('auth.signUp')}
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
