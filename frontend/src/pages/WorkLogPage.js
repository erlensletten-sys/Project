import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { 
  getMyWorkLogs, 
  getWorkLogs,
  createWorkLog, 
  deleteWorkLog,
  getProjects,
  getAkkordPricing,
  formatCurrency, 
  formatDate 
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  ClipboardList, 
  Loader2, 
  Trash2,
  Calculator,
  CalendarDays,
  FolderKanban,
  Square,
  Users,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function WorkLogPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  
  const [activeTab, setActiveTab] = useState('my');
  const [myLogs, setMyLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  
  // Form state
  const [newLog, setNewLog] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    area: '',
    base_operation: '',
    addons: [],
    hours_worked: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [myLogsData, projectsData, pricingData] = await Promise.all([
        getMyWorkLogs(),
        getProjects(),
        getAkkordPricing()
      ]);
      setMyLogs(myLogsData);
      setProjects(projectsData);
      setPricing(pricingData);
      
      if (isAdmin) {
        const allLogsData = await getWorkLogs();
        setAllLogs(allLogsData);
      }
    } catch (error) {
      toast.error(t('workLog.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const calculateRate = () => {
    if (!pricing || !newLog.base_operation) return 0;
    const basePrice = pricing.base_operations.find(b => b.id === newLog.base_operation)?.price || 0;
    const addonTotal = newLog.addons.reduce((sum, addonId) => {
      const addon = pricing.addons.find(a => a.id === addonId);
      return sum + (addon?.price || 0);
    }, 0);
    return basePrice + addonTotal;
  };

  const calculateTotal = () => {
    const area = parseFloat(newLog.area) || 0;
    return area * calculateRate();
  };

  const handleAddonToggle = (addonId) => {
    setNewLog(prev => {
      const addons = prev.addons.includes(addonId)
        ? prev.addons.filter(id => id !== addonId)
        : [...prev.addons, addonId];
      return { ...prev, addons };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!newLog.project_id || !newLog.base_operation || !newLog.area || !newLog.hours_worked) {
      toast.error(t('workLog.fillRequired'));
      return;
    }

    setCreating(true);
    try {
      await createWorkLog({
        ...newLog,
        date: new Date(newLog.date).toISOString(),
        area: parseFloat(newLog.area),
        hours_worked: parseFloat(newLog.hours_worked)
      });
      toast.success(t('workLog.created'));
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (workId) => {
    if (!window.confirm(t('workLog.confirmDelete'))) return;
    
    try {
      await deleteWorkLog(workId);
      toast.success(t('workLog.deleted'));
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setNewLog({
      project_id: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      area: '',
      base_operation: '',
      addons: [],
      hours_worked: ''
    });
  };

  const getOperationLabel = (id) => {
    const op = pricing?.base_operations.find(b => b.id === id);
    return op?.name || id;
  };

  const getAddonsLabel = (addons) => {
    if (!pricing || addons.length === 0) return '-';
    return addons.map(id => {
      const addon = pricing.addons.find(a => a.id === id);
      return addon?.name || id;
    }).join(', ');
  };

  const filteredMyLogs = selectedProject 
    ? myLogs.filter(log => log.project_id === selectedProject)
    : myLogs;

  const filteredAllLogs = selectedProject 
    ? allLogs.filter(log => log.project_id === selectedProject)
    : allLogs;

  // Calculate totals for my logs
  const myTotals = {
    area: filteredMyLogs.reduce((sum, log) => sum + log.area, 0),
    hours: filteredMyLogs.reduce((sum, log) => sum + log.hours_worked, 0),
    payment: filteredMyLogs.reduce((sum, log) => sum + log.total_payment, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading text-3xl font-bold">{t('workLog.title')}</h1>
          <p className="text-slate-400 mt-1">{t('workLog.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-work-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              {t('workLog.addWork')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="heading">{t('workLog.addWork')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label>{t('workLog.project')} *</Label>
                <Select
                  value={newLog.project_id}
                  onValueChange={(value) => setNewLog({...newLog, project_id: value})}
                >
                  <SelectTrigger data-testid="work-project-select" className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder={t('workLog.selectProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(proj => (
                      <SelectItem key={proj.project_id} value={proj.project_id}>
                        {proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="work-date">{t('common.date')} *</Label>
                <Input
                  id="work-date"
                  data-testid="work-date-input"
                  type="date"
                  value={newLog.date}
                  onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                  required
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              {/* Base Operation */}
              <div className="space-y-2">
                <Label>{t('workLog.baseOperation')} *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {pricing?.base_operations.map(op => (
                    <Button
                      key={op.id}
                      type="button"
                      variant={newLog.base_operation === op.id ? "default" : "outline"}
                      className={`h-auto py-3 flex flex-col ${newLog.base_operation === op.id ? 'bg-orange-500 hover:bg-orange-600' : 'border-slate-700 hover:bg-slate-800'}`}
                      onClick={() => setNewLog({...newLog, base_operation: op.id})}
                    >
                      <span className="font-medium">{op.name}</span>
                      <span className="text-xs opacity-70">{op.price} kr/m²</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-2">
                <Label>{t('workLog.addons')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {pricing?.addons.map(addon => (
                    <label 
                      key={addon.id}
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-colors ${
                        newLog.addons.includes(addon.id) 
                          ? 'bg-orange-500/20 border-orange-500/50' 
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <Checkbox
                        checked={newLog.addons.includes(addon.id)}
                        onCheckedChange={() => handleAddonToggle(addon.id)}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{addon.name}</span>
                        <span className="text-xs text-slate-400 ml-2">+{addon.price} kr/m²</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label htmlFor="work-area">{t('workLog.area')} (m²) *</Label>
                <Input
                  id="work-area"
                  data-testid="work-area-input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newLog.area}
                  onChange={(e) => setNewLog({...newLog, area: e.target.value})}
                  placeholder="0"
                  required
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              {/* Hours Worked */}
              <div className="space-y-2">
                <Label htmlFor="work-hours">{t('workLog.hoursWorked')} *</Label>
                <Input
                  id="work-hours"
                  data-testid="work-hours-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={newLog.hours_worked}
                  onChange={(e) => setNewLog({...newLog, hours_worked: e.target.value})}
                  placeholder="0"
                  required
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="work-desc">{t('common.description')}</Label>
                <Input
                  id="work-desc"
                  data-testid="work-desc-input"
                  value={newLog.description}
                  onChange={(e) => setNewLog({...newLog, description: e.target.value})}
                  placeholder={t('common.description')}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              {/* Calculated Total */}
              {newLog.base_operation && newLog.area && (
                <Card className="bg-orange-500/10 border-orange-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator size={18} className="text-orange-400" />
                        <span className="text-slate-300">{t('workLog.calculatedPayment')}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{calculateRate()} kr/m² × {newLog.area} m²</p>
                        <p className="heading text-xl font-bold text-orange-400">{formatCurrency(calculateTotal())}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('workLog.addWork')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card">
          <CardContent className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Square size={16} className="text-blue-400" />
              <span className="stat-label">{t('workLog.totalArea')}</span>
            </div>
            <span className="stat-value">{myTotals.area.toFixed(1)} m²</span>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-purple-400" />
              <span className="stat-label">{t('workLog.totalHours')}</span>
            </div>
            <span className="stat-value">{myTotals.hours.toFixed(1)} {t('workLog.hours')}</span>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={16} className="text-green-400" />
              <span className="stat-label">{t('workLog.totalEarnings')}</span>
            </div>
            <span className="stat-value">{formatCurrency(myTotals.payment)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="my" data-testid="tab-my-work" className="data-[state=active]:bg-orange-500">
              <ClipboardList size={16} className="mr-2" />
              {t('workLog.myWork')}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="all" data-testid="tab-all-work" className="data-[state=active]:bg-orange-500">
                <Users size={16} className="mr-2" />
                {t('workLog.allWork')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Project Filter */}
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger data-testid="filter-project" className="w-[200px] bg-slate-800 border-slate-700">
              <SelectValue placeholder={t('workLog.allProjects')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('workLog.allProjects')}</SelectItem>
              {projects.map(proj => (
                <SelectItem key={proj.project_id} value={proj.project_id}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* My Work Tab */}
        <TabsContent value="my" className="space-y-4">
          {filteredMyLogs.length === 0 ? (
            <Card className="card">
              <CardContent>
                <div className="empty-state py-16">
                  <ClipboardList size={48} className="text-slate-600" strokeWidth={1} />
                  <h3 className="font-medium mt-4">{t('workLog.noLogs')}</h3>
                  <p className="text-sm mt-1 text-slate-500">{t('workLog.addFirst')}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="card">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('workLog.project')}</th>
                      <th>{t('workLog.operation')}</th>
                      <th>{t('workLog.area')}</th>
                      <th>{t('workLog.rate')}</th>
                      <th>{t('workLog.hoursWorked')}</th>
                      <th className="text-right">{t('workLog.payment')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMyLogs.map((log) => (
                      <tr key={log.work_id} data-testid={`work-row-${log.work_id}`}>
                        <td className="text-slate-400">{formatDate(log.date)}</td>
                        <td>
                          <span className="flex items-center gap-1 text-purple-400">
                            <FolderKanban size={14} />
                            {log.project_name}
                          </span>
                        </td>
                        <td>
                          <div>
                            <p className="font-medium">{getOperationLabel(log.base_operation)}</p>
                            {log.addons.length > 0 && (
                              <p className="text-xs text-slate-500">+ {getAddonsLabel(log.addons)}</p>
                            )}
                          </div>
                        </td>
                        <td>{log.area} m²</td>
                        <td className="text-slate-400">{log.rate_per_sqm} kr/m²</td>
                        <td>{log.hours_worked}t</td>
                        <td className="text-right font-mono font-medium text-green-400">
                          {formatCurrency(log.total_payment)}
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(log.work_id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Work Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="all" className="space-y-4">
            {filteredAllLogs.length === 0 ? (
              <Card className="card">
                <CardContent>
                  <div className="empty-state py-16">
                    <Users size={48} className="text-slate-600" strokeWidth={1} />
                    <h3 className="font-medium mt-4">{t('workLog.noTeamLogs')}</h3>
                    <p className="text-sm mt-1 text-slate-500">{t('workLog.teamLogsAppear')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="card">
                <CardContent className="p-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('common.date')}</th>
                        <th>{t('workLog.employee')}</th>
                        <th>{t('workLog.project')}</th>
                        <th>{t('workLog.operation')}</th>
                        <th>{t('workLog.area')}</th>
                        <th>{t('workLog.hoursWorked')}</th>
                        <th className="text-right">{t('workLog.payment')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllLogs.map((log) => (
                        <tr key={log.work_id} data-testid={`work-row-${log.work_id}`}>
                          <td className="text-slate-400">{formatDate(log.date)}</td>
                          <td className="font-medium">{log.user_name}</td>
                          <td>
                            <span className="flex items-center gap-1 text-purple-400">
                              <FolderKanban size={14} />
                              {log.project_name}
                            </span>
                          </td>
                          <td>
                            <div>
                              <p className="font-medium">{getOperationLabel(log.base_operation)}</p>
                              {log.addons.length > 0 && (
                                <p className="text-xs text-slate-500">+ {getAddonsLabel(log.addons)}</p>
                              )}
                            </div>
                          </td>
                          <td>{log.area} m²</td>
                          <td>{log.hours_worked}t</td>
                          <td className="text-right font-mono font-medium text-green-400">
                            {formatCurrency(log.total_payment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
