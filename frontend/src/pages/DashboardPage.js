import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { getDashboardStats, formatCurrency } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  TrendingDown,
  Clock,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Timer,
  Target,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, tVar } = useLanguage();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'hr';

  useEffect(() => {
    loadStats();
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/analytics/dashboard?period=${period}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
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
          <h1 className="heading text-3xl font-bold">
            {t('dashboard.welcomeBack')}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 mt-1">
            {tVar('dashboard.todayOverview', { org: user?.group_name })}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('dashboard.thisWeek')}</SelectItem>
              <SelectItem value="month">{t('dashboard.thisMonth')}</SelectItem>
              <SelectItem value="year">{t('dashboard.thisYear')}</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Link to="/invoices/new">
              <Button data-testid="new-invoice-btn" className="bg-orange-500 hover:bg-orange-600">
                <Plus size={16} className="mr-2" />
                {t('dashboard.newInvoice')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Analytics Section - Different for Admin vs Employee */}
      {analytics?.type === 'admin' ? (
        <AdminAnalytics analytics={analytics} t={t} />
      ) : (
        <EmployeeAnalytics analytics={analytics} t={t} />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/work-log" data-testid="quick-worklog">
          <Card className="card hover:border-orange-500/50 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Timer className="text-orange-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{t('nav.workLog')}</h3>
                  <p className="text-sm text-slate-500">{t('dashboard.logWork')}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/projects" data-testid="quick-projects">
          <Card className="card hover:border-purple-500/50 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <FolderKanban className="text-purple-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{t('nav.projects')}</h3>
                  <p className="text-sm text-slate-500">{stats?.projects?.active || 0} {t('projects.active').toLowerCase()}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/expenses" data-testid="quick-expenses">
          <Card className="card hover:border-green-500/50 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Receipt className="text-green-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{t('nav.expenses')}</h3>
                  <p className="text-sm text-slate-500">{stats?.expenses?.pending_approval || 0} {t('expenses.pending').toLowerCase()}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/checklists" data-testid="quick-checklists">
          <Card className="card hover:border-blue-500/50 cursor-pointer transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="text-blue-500" size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{t('nav.checklists')}</h3>
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
        <Card className="card border-amber-500/30 bg-amber-500/5" data-testid="alerts-card">
          <CardHeader className="pb-2">
            <CardTitle className="heading text-lg flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              {t('dashboard.attentionRequired')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.hse?.expiring_soon > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-md border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-amber-500" size={20} />
                  <span className="text-sm">
                    {tVar('dashboard.hseExpiring', { count: stats.hse.expiring_soon })}
                  </span>
                </div>
                <Link to="/hse">
                  <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400">
                    {t('dashboard.review')}
                  </Button>
                </Link>
              </div>
            )}
            {stats?.expenses?.pending_approval > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-md border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Receipt className="text-amber-500" size={20} />
                  <span className="text-sm">
                    {tVar('dashboard.expensesPending', { count: stats.expenses.pending_approval })}
                  </span>
                </div>
                <Link to="/expenses">
                  <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400">
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

// Admin Analytics Component
function AdminAnalytics({ analytics, t }) {
  const marginColor = analytics?.margin?.is_positive ? 'text-green-400' : 'text-red-400';
  const marginBg = analytics?.margin?.is_positive ? 'bg-green-500/10' : 'bg-red-500/10';
  const marginBorder = analytics?.margin?.is_positive ? 'border-green-500/30' : 'border-red-500/30';

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card className="card" data-testid="revenue-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.revenue')}</span>
              <DollarSign className="text-green-500" size={20} />
            </div>
            <span className="text-2xl font-bold text-green-400">
              {formatCurrency(analytics?.revenue?.total || 0)}
            </span>
            <p className="text-xs text-slate-500 mt-2">
              {formatCurrency(analytics?.revenue?.pending || 0)} {t('dashboard.pending').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        {/* Costs */}
        <Card className="card" data-testid="costs-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.totalCosts')}</span>
              <TrendingDown className="text-red-400" size={20} />
            </div>
            <span className="text-2xl font-bold text-red-400">
              {formatCurrency(analytics?.costs?.total || 0)}
            </span>
            <p className="text-xs text-slate-500 mt-2">
              {t('dashboard.labor')}: {formatCurrency(analytics?.costs?.labor || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Margin */}
        <Card className={`card ${marginBorder} ${marginBg}`} data-testid="margin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.grossMargin')}</span>
              {analytics?.margin?.is_positive ? (
                <TrendingUp className="text-green-400" size={20} />
              ) : (
                <TrendingDown className="text-red-400" size={20} />
              )}
            </div>
            <span className={`text-2xl font-bold ${marginColor}`}>
              {formatCurrency(analytics?.margin?.gross || 0)}
            </span>
            <p className={`text-xs mt-2 ${marginColor}`}>
              {analytics?.margin?.percentage?.toFixed(1)}% {t('dashboard.margin')}
            </p>
          </CardContent>
        </Card>

        {/* Work Stats */}
        <Card className="card" data-testid="work-stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.workStats')}</span>
              <BarChart3 className="text-blue-400" size={20} />
            </div>
            <span className="text-2xl font-bold">
              {analytics?.work_stats?.total_jobs || 0}
            </span>
            <p className="text-xs text-slate-500 mt-2">
              {analytics?.work_stats?.total_hours?.toFixed(1) || 0} {t('workLog.hours')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Producers */}
      {analytics?.top_producers?.length > 0 && (
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg flex items-center gap-2">
              <Award size={20} className="text-amber-400" />
              {t('dashboard.topProducers')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('dashboard.topProducersDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_producers.slice(0, 5).map((producer, index) => (
                <div 
                  key={producer.user_id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-amber-500/20 text-amber-400' :
                      index === 1 ? 'bg-slate-400/20 text-slate-300' :
                      index === 2 ? 'bg-orange-700/20 text-orange-400' :
                      'bg-slate-700/50 text-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{producer.user_name}</p>
                      <p className="text-xs text-slate-500">
                        {producer.job_count} {t('dashboard.jobs')} • {producer.total_hours?.toFixed(1)} {t('workLog.hours')}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-green-400">
                    {formatCurrency(producer.total_earnings)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Employee Analytics Component  
function EmployeeAnalytics({ analytics, t }) {
  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Period Earnings */}
        <Card className="card col-span-2" data-testid="earnings-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.yourEarnings')}</span>
              <DollarSign className="text-green-500" size={20} />
            </div>
            <span className="text-3xl font-bold text-green-400">
              {formatCurrency(analytics?.period_earnings || 0)}
            </span>
            <p className="text-sm text-slate-500 mt-2">
              {analytics?.job_count || 0} {t('dashboard.jobsCompleted')}
            </p>
          </CardContent>
        </Card>

        {/* Hours Worked */}
        <Card className="card" data-testid="hours-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.hoursWorked')}</span>
              <Clock className="text-blue-400" size={20} />
            </div>
            <span className="text-2xl font-bold">
              {analytics?.period_hours?.toFixed(1) || 0}
            </span>
            <p className="text-xs text-slate-500 mt-2">{t('workLog.hours')}</p>
          </CardContent>
        </Card>

        {/* Area Completed */}
        <Card className="card" data-testid="area-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.areaCompleted')}</span>
              <Target className="text-purple-400" size={20} />
            </div>
            <span className="text-2xl font-bold">
              {analytics?.period_area?.toFixed(1) || 0}
            </span>
            <p className="text-xs text-slate-500 mt-2">m²</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.avgPerJob')}</span>
              <BarChart3 className="text-orange-400" size={20} />
            </div>
            <span className="text-xl font-bold">
              {formatCurrency(analytics?.avg_per_job || 0)}
            </span>
          </CardContent>
        </Card>

        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.avgPerHour')}</span>
              <Timer className="text-cyan-400" size={20} />
            </div>
            <span className="text-xl font-bold">
              {formatCurrency(analytics?.avg_per_hour || 0)}
            </span>
          </CardContent>
        </Card>

        <Card className="card bg-amber-500/5 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{t('dashboard.medianIncome')}</span>
              <Award className="text-amber-400" size={20} />
            </div>
            <span className="text-xl font-bold text-amber-400">
              {formatCurrency(analytics?.median_income || 0)}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
