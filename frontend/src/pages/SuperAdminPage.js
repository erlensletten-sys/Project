import React, { useState, useEffect } from 'react';
import { getSuperAdminStats, getSuperAdminGroups, getSuperAdminUsers, toggleGroupFeatures, banUser, verifyGroup, disableGroup, impersonateUser, getAdminActivityLogs } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Building2, BarChart3, Search, Ban, CheckCircle, XCircle, Loader2, Clock, Power, UserCheck, Eye, Activity, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const ALL_FEATURES = [
  { id: 'akkord', label: 'Akkord' },
  { id: 'invoicing', label: 'Invoicing' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'hse', label: 'HSE' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'reports', label: 'Reports' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'projects', label: 'Projects' },
  { id: 'work_log', label: 'Work Log' },
  { id: 'forms', label: 'Forms' },
];

export default function SuperAdminPage() {
  const { checkAuth } = useAuth();
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [saving, setSaving] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, g, u, logs] = await Promise.all([
        getSuperAdminStats(), getSuperAdminGroups(), getSuperAdminUsers(), getAdminActivityLogs(50)
      ]);
      setStats(s); setGroups(g); setUsers(u); setActivityLogs(logs.logs || []);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally { setLoading(false); }
  };

  const handleFeatureToggle = async (groupId, featureId, currentDisabled) => {
    const group = groups.find(g => g.group_id === groupId);
    if (!group) return;
    const disabled = group.disabled_features || [];
    const newDisabled = currentDisabled ? disabled.filter(f => f !== featureId) : [...disabled, featureId];
    setSaving(prev => ({ ...prev, [`${groupId}-${featureId}`]: true }));
    try {
      await toggleGroupFeatures(groupId, newDisabled);
      setGroups(prev => prev.map(g => g.group_id === groupId ? { ...g, disabled_features: newDisabled } : g));
      toast.success(`${featureId} ${currentDisabled ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(prev => ({ ...prev, [`${groupId}-${featureId}`]: false })); }
  };

  const handleVerifyGroup = async (groupId, currentVerified) => {
    setSaving(prev => ({ ...prev, [`verify-${groupId}`]: true }));
    try {
      await verifyGroup(groupId, !currentVerified);
      setGroups(prev => prev.map(g => g.group_id === groupId ? { ...g, is_verified: !currentVerified } : g));
      toast.success(currentVerified ? 'Group unverified' : 'Group verified');
      loadData();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(prev => ({ ...prev, [`verify-${groupId}`]: false })); }
  };

  const handleDisableGroup = async (groupId, currentDisabled) => {
    setSaving(prev => ({ ...prev, [`disable-${groupId}`]: true }));
    try {
      await disableGroup(groupId, !currentDisabled);
      setGroups(prev => prev.map(g => g.group_id === groupId ? { ...g, is_disabled: !currentDisabled } : g));
      toast.success(currentDisabled ? 'Group enabled' : 'Group disabled');
      loadData();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(prev => ({ ...prev, [`disable-${groupId}`]: false })); }
  };

  const handleImpersonate = async (userId, userName) => {
    if (!window.confirm(`Impersonate "${userName}"? You will be logged in as this user.`)) return;
    setSaving(prev => ({ ...prev, [`imp-${userId}`]: true }));
    try {
      await impersonateUser(userId);
      toast.success(`Now impersonating ${userName}`);
      if (checkAuth) await checkAuth();
      window.location.href = '/';
    } catch (err) { toast.error(err.message || 'Failed to impersonate'); }
    finally { setSaving(prev => ({ ...prev, [`imp-${userId}`]: false })); }
  };

  const handleBan = async (userId, currentBanned) => {
    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      await banUser(userId, !currentBanned);
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_banned: !currentBanned, is_active: currentBanned } : u));
      toast.success(currentBanned ? 'User unbanned' : 'User banned');
      loadData();
    } catch { toast.error('Failed to update user'); }
    finally { setSaving(prev => ({ ...prev, [userId]: false })); }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.group_name?.toLowerCase().includes(userSearch.toLowerCase())
  ).filter(u => !selectedGroup || u.group_id === selectedGroup);

  const getGroupStatusBadge = (group) => {
    if (group.is_disabled) return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Disabled</Badge>;
    if (!group.is_verified && group.trial_expired) return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Trial Expired</Badge>;
    if (!group.is_verified) return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Trial ({group.trial_hours_remaining}h left)</Badge>;
    return <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Verified</Badge>;
  };

  const formatLogTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getActionIcon = (action) => {
    if (action?.includes('ban')) return <Ban size={12} className="text-red-400" />;
    if (action?.includes('verify')) return <UserCheck size={12} className="text-green-400" />;
    if (action?.includes('disable') || action?.includes('enable')) return <Power size={12} className="text-amber-400" />;
    if (action?.includes('impersonate')) return <Eye size={12} className="text-purple-400" />;
    if (action?.includes('feature')) return <BarChart3 size={12} className="text-blue-400" />;
    return <Activity size={12} className="text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
          <Shield size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="heading text-2xl font-bold">Super Admin</h1>
          <p className="text-sm text-slate-500">Platform management & governance</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Groups', value: stats.groups, icon: Building2, color: 'blue' },
            { label: 'Users', value: stats.users, icon: Users, color: 'green' },
            { label: 'Active', value: stats.active_users, icon: CheckCircle, color: 'emerald' },
            { label: 'Banned', value: stats.banned_users, icon: Ban, color: 'red' },
            { label: 'Invoices', value: stats.invoices, icon: BarChart3, color: 'purple' },
            { label: 'Work Logs', value: stats.work_logs, icon: BarChart3, color: 'orange' },
            { label: 'Pending', value: stats.pending_verification, icon: Clock, color: 'amber' },
            { label: 'Disabled', value: stats.disabled_groups, icon: Power, color: 'rose' },
          ].map(s => (
            <Card key={s.label} className="card">
              <CardContent className="p-3 text-center">
                <s.icon size={16} className={`mx-auto mb-1 text-${s.color}-500`} />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups" data-testid="admin-groups-tab">
            <Building2 size={14} className="mr-2" />Groups
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-users-tab">
            <Users size={14} className="mr-2" />Users
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="admin-activity-tab">
            <Activity size={14} className="mr-2" />Activity
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          {groups.map(group => (
            <Card key={group.group_id} className={`card ${group.is_disabled ? 'opacity-60' : ''}`} data-testid={`group-card-${group.group_id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <CardTitle className="heading text-base truncate">{group.name}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{group.group_id} | {group.member_count} members</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getGroupStatusBadge(group)}
                    <Badge variant="outline" className="text-[10px]">
                      {(group.disabled_features || []).length > 0
                        ? `${(group.disabled_features || []).length} off`
                        : 'All on'}
                    </Badge>
                  </div>
                </div>
                {/* Group Actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    size="sm"
                    variant={group.is_verified ? "outline" : "default"}
                    className={`h-7 text-xs ${!group.is_verified ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    disabled={saving[`verify-${group.group_id}`]}
                    onClick={() => handleVerifyGroup(group.group_id, group.is_verified)}
                    data-testid={`verify-btn-${group.group_id}`}
                  >
                    {saving[`verify-${group.group_id}`] ? <Loader2 size={12} className="animate-spin mr-1" /> : <UserCheck size={12} className="mr-1" />}
                    {group.is_verified ? 'Revoke Verification' : 'Verify Group'}
                  </Button>
                  <Button
                    size="sm"
                    variant={group.is_disabled ? "outline" : "destructive"}
                    className="h-7 text-xs"
                    disabled={saving[`disable-${group.group_id}`]}
                    onClick={() => handleDisableGroup(group.group_id, group.is_disabled)}
                    data-testid={`disable-btn-${group.group_id}`}
                  >
                    {saving[`disable-${group.group_id}`] ? <Loader2 size={12} className="animate-spin mr-1" /> : <Power size={12} className="mr-1" />}
                    {group.is_disabled ? 'Enable Group' : 'Disable Group'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {ALL_FEATURES.map(feature => {
                    const isDisabled = (group.disabled_features || []).includes(feature.id);
                    const key = `${group.group_id}-${feature.id}`;
                    return (
                      <div key={feature.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                        <span className={`text-xs font-medium ${isDisabled ? 'text-slate-500 line-through' : ''}`}>
                          {feature.label}
                        </span>
                        {saving[key] ? (
                          <Loader2 size={14} className="animate-spin text-slate-500" />
                        ) : (
                          <Switch
                            checked={!isDisabled}
                            onCheckedChange={() => handleFeatureToggle(group.group_id, feature.id, isDisabled)}
                            data-testid={`toggle-${group.group_id}-${feature.id}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search by name, email, or group..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-10"
                data-testid="admin-user-search"
              />
            </div>
            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value || null)}
              className="h-10 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300"
              data-testid="admin-group-filter"
            >
              <option value="">All Groups</option>
              {groups.map(g => (
                <option key={g.group_id} value={g.group_id}>{g.name}</option>
              ))}
            </select>
          </div>

          <Card className="card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="admin-users-table">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase">Group</th>
                      <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase">Role</th>
                      <th className="text-center py-3 px-4 text-xs text-slate-500 uppercase">Status</th>
                      <th className="text-right py-3 px-4 text-xs text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.user_id} className="border-b border-slate-800 hover:bg-slate-800/30" data-testid={`user-row-${u.user_id}`}>
                        <td className="py-3 px-4">
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs">{u.group_name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.is_banned ? (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Banned</Badge>
                          ) : u.is_active !== false ? (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">Inactive</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                              disabled={saving[`imp-${u.user_id}`]}
                              onClick={() => handleImpersonate(u.user_id, u.name)}
                              data-testid={`impersonate-btn-${u.user_id}`}
                            >
                              {saving[`imp-${u.user_id}`] ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} className="mr-1" />}
                              View As
                            </Button>
                            <Button
                              size="sm"
                              variant={u.is_banned ? "outline" : "destructive"}
                              className="h-7 text-xs"
                              disabled={saving[u.user_id]}
                              onClick={() => handleBan(u.user_id, u.is_banned)}
                              data-testid={`ban-btn-${u.user_id}`}
                            >
                              {saving[u.user_id] ? <Loader2 size={12} className="animate-spin" /> : u.is_banned ? 'Unban' : 'Ban'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p className="text-center py-8 text-slate-500">No users found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="card">
            <CardHeader className="pb-2">
              <CardTitle className="heading text-base flex items-center gap-2">
                <Activity size={16} className="text-orange-500" />
                Admin Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No activity recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log, i) => (
                    <div key={log.log_id || i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50" data-testid={`activity-log-${i}`}>
                      <div className="mt-0.5">{getActionIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{log.details}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          by {log.admin_name} &middot; {formatLogTime(log.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0 capitalize">
                        {log.action?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
