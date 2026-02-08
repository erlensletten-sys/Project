import React, { useState, useEffect } from 'react';
import { getPaymentSummary, formatCurrency } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await getPaymentSummary(period);
      setData(res);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading text-2xl font-bold text-slate-900">Payment Summary</h1>
          <p className="text-sm text-slate-500 mt-1">Earnings breakdown per worker</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]" data-testid="period-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Labor Cost</p>
              <p className="text-lg font-bold">{formatCurrency(data?.total_labor_cost || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Hours</p>
              <p className="text-lg font-bold">{data?.total_hours || 0}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Workers</p>
              <p className="text-lg font-bold">{data?.worker_count || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg per Hour</p>
              <p className="text-lg font-bold">{data?.total_hours > 0 ? formatCurrency((data.total_labor_cost || 0) / data.total_hours) : '0'}/h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Table */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading text-lg flex items-center gap-2">
            <BarChart3 size={18} className="text-orange-500" />
            Per Worker Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.workers?.length ? (
            <p className="text-center py-12 text-slate-500">No work logged for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="payment-summary-table">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-3 text-xs text-slate-500 uppercase">#</th>
                    <th className="text-left py-3 px-3 text-xs text-slate-500 uppercase">Worker</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 uppercase">Hours</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 uppercase">Jobs</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 uppercase">Akkord</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 uppercase">Hourly</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 uppercase">Area (m²)</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 uppercase">Avg/h</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workers.map((w, i) => (
                    <tr key={w.user_id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors" data-testid={`worker-row-${w.user_id}`}>
                      <td className="py-3 px-3 text-slate-500">{i + 1}</td>
                      <td className="py-3 px-3 font-medium">{w.user_name}</td>
                      <td className="py-3 px-3 text-right text-slate-400">{w.total_hours}h</td>
                      <td className="py-3 px-3 text-right text-slate-400">{w.job_count}</td>
                      <td className="py-3 px-3 text-right">
                        {w.akkord_earnings > 0 ? (
                          <Badge variant="outline" className="text-xs font-mono">{formatCurrency(w.akkord_earnings)}</Badge>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {w.hourly_earnings > 0 ? (
                          <Badge variant="outline" className="text-xs font-mono">{formatCurrency(w.hourly_earnings)}</Badge>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">{w.area_completed > 0 ? `${w.area_completed}` : '-'}</td>
                      <td className="py-3 px-3 text-right text-slate-400">{formatCurrency(w.avg_per_hour)}/h</td>
                      <td className="py-3 px-3 text-right font-bold text-green-400">{formatCurrency(w.total_earnings)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600">
                    <td colSpan={2} className="py-3 px-3 font-bold">Total</td>
                    <td className="py-3 px-3 text-right font-bold">{data.total_hours}h</td>
                    <td className="py-3 px-3 text-right font-bold">{data.workers.reduce((s, w) => s + w.job_count, 0)}</td>
                    <td colSpan={4} />
                    <td className="py-3 px-3 text-right font-bold text-green-400">{formatCurrency(data.total_labor_cost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
