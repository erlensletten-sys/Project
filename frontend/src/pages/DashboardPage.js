import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { getDashboardStats, formatCurrency } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Users,
  Receipt,
  FolderKanban,
  ClipboardCheck,
  ShieldAlert,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, tVar } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="heading text-3xl font-bold text-slate-900">
            {t('dashboard.welcomeBack')}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 mt-1">
            {tVar('dashboard.todayOverview', { org: user?.group_name })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/invoices/new">
            <Button data-testid="new-invoice-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              {t('dashboard.newInvoice')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bento-grid">
        {/* Revenue Card */}
        <Card className="card col-span-2" data-testid="revenue-card">
          <CardContent className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">{t('dashboard.totalRevenue')}</span>
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <span className="stat-value">{formatCurrency(stats?.invoices?.revenue || 0)}</span>
            <p className="text-sm text-slate-500 mt-2">
              {tVar('dashboard.fromInvoices', { count: stats?.invoices?.total || 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Pending Invoices */}
        <Card className="card" data-testid="pending-invoices-card">
          <CardContent className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">{t('dashboard.pending')}</span>
              <Clock className="text-amber-500" size={20} />
            </div>
            <span className="stat-value">{formatCurrency(stats?.invoices?.pending_value || 0)}</span>
            <p className="text-sm text-slate-500 mt-2">
              {tVar('dashboard.awaitingPayment', { count: stats?.invoices?.pending || 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Payroll */}
        <Card className="card" data-testid="payroll-card">
          <CardContent className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">{t('dashboard.monthlyPayroll')}</span>
              <Users className="text-blue-500" size={20} />
            </div>
            <span className="stat-value">{formatCurrency(stats?.payroll?.monthly_total || 0)}</span>
            <p className="text-sm text-slate-500 mt-2">
              {tVar('dashboard.activeEmployees', { count: stats?.payroll?.employees || 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/invoices" data-testid="quick-invoices">
          <Card className="card hover:border-orange-200 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-orange-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{t('nav.invoices')}</h3>
                  <p className="text-sm text-slate-500">{stats?.invoices?.total || 0} {t('common.total').toLowerCase()}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/projects" data-testid="quick-projects">
          <Card className="card hover:border-orange-200 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FolderKanban className="text-purple-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{t('nav.projects')}</h3>
                  <p className="text-sm text-slate-500">{stats?.projects?.active || 0} {t('projects.active').toLowerCase()}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/expenses" data-testid="quick-expenses">
          <Card className="card hover:border-orange-200 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Receipt className="text-green-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{t('nav.expenses')}</h3>
                  <p className="text-sm text-slate-500">{stats?.expenses?.pending_approval || 0} {t('expenses.pending').toLowerCase()}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/checklists" data-testid="quick-checklists">
          <Card className="card hover:border-orange-200 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="text-blue-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{t('nav.checklists')}</h3>
                  <p className="text-sm text-slate-500">{stats?.checklists?.in_progress || 0} {t('projects.inProgress').toLowerCase()}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alerts Section */}
      {(stats?.hse?.expiring_soon > 0 || stats?.expenses?.pending_approval > 0) && (
        <Card className="card border-amber-200 bg-amber-50" data-testid="alerts-card">
          <CardHeader className="pb-2">
            <CardTitle className="heading text-lg flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              {t('dashboard.attentionRequired')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.hse?.expiring_soon > 0 && (
              <div className="flex items-center justify-between p-3 bg-white rounded-md border border-amber-100">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-amber-500" size={20} />
                  <span className="text-sm text-slate-700">
                    {tVar('dashboard.hseExpiring', { count: stats.hse.expiring_soon })}
                  </span>
                </div>
                <Link to="/hse">
                  <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700">
                    {t('dashboard.review')}
                  </Button>
                </Link>
              </div>
            )}
            {stats?.expenses?.pending_approval > 0 && (
              <div className="flex items-center justify-between p-3 bg-white rounded-md border border-amber-100">
                <div className="flex items-center gap-3">
                  <Receipt className="text-amber-500" size={20} />
                  <span className="text-sm text-slate-700">
                    {tVar('dashboard.expensesPending', { count: stats.expenses.pending_approval })}
                  </span>
                </div>
                <Link to="/expenses">
                  <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700">
                    {t('dashboard.review')}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
