import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getGroup, getGroupMembers, inviteUser } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Building2, Users, UserPlus, Loader2, Copy, Check, Mail, Globe, CheckCircle, XCircle, Save, Edit, Palette, Sun, Moon, Clock, MoreVertical, UserCog, Power, Eye, EyeOff, Shield, Briefcase, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ACCENT_COLOR_NAMES = {
  black: { en: 'Black', nb: 'Svart' },
  green: { en: 'Green', nb: 'Grønn' },
  yellow: { en: 'Yellow', nb: 'Gul' },
  purple: { en: 'Purple', nb: 'Lilla' },
  blue: { en: 'Blue', nb: 'Blå' },
  orange: { en: 'Orange', nb: 'Oransje' },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const { mode, setMode, accentColor, setAccentColor, availableColors } = useTheme();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    name: '',
    role: 'member'
  });

  // Email settings
  const [emailConfig, setEmailConfig] = useState(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_use_tls: true,
    sender_email: '',
    sender_name: 'ProjectDash'
  });
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  
  // Group-specific sender name
  const [groupSenderName, setGroupSenderName] = useState('');
  const [savingSenderName, setSavingSenderName] = useState(false);

  // Hourly rate settings
  const [hourlyRate, setHourlyRate] = useState(0);
  const [akkordEnabled, setAkkordEnabled] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  
  // User management
  const [editingUser, setEditingUser] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'employee' });

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [showInactiveUsers]);

  const loadData = async () => {
    try {
      const [groupData, membersData] = await Promise.all([
        getGroup(),
        getGroupMembers()
      ]);
      setGroup(groupData);
      setMembers(membersData);
      
      // Load email config and group settings if admin
      if (isAdmin) {
        loadEmailConfig();
        loadGroupSettings();
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/group`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setHourlyRate(data.hourly_rate || 0);
      }
    } catch (error) {
      console.error('Failed to load group settings:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/group/users?include_inactive=${showInactiveUsers}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    setUpdatingRole(true);
    try {
      const response = await fetch(`${API_URL}/api/group/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        toast.success(t('settings.roleUpdated'));
        setEditingUser(null);
        loadUsers();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    const endpoint = isActive ? 'deactivate' : 'activate';
    try {
      const response = await fetch(`${API_URL}/api/group/users/${userId}/${endpoint}`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success(isActive ? t('settings.userDeactivated') : t('settings.userActivated'));
        loadUsers();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to update user status');
      }
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      toast.error(t('settings.fillAllFields'));
      return;
    }
    
    setCreatingUser(true);
    try {
      const response = await fetch(`${API_URL}/api/group/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUserData)
      });
      
      if (response.ok) {
        toast.success(t('settings.userCreatedSuccess'));
        setCreateUserDialogOpen(false);
        setNewUserData({ name: '', email: '', password: '', role: 'employee' });
        loadUsers();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveHourlyRate = async () => {
    setSavingRate(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hourly_rate: parseFloat(hourlyRate) || 0 })
      });
      
      if (response.ok) {
        toast.success(t('settings.hourlyRateSaved'));
      } else {
        toast.error('Failed to save hourly rate');
      }
    } catch (error) {
      toast.error('Failed to save hourly rate');
    } finally {
      setSavingRate(false);
    }
  };

  const loadEmailConfig = async () => {
    setLoadingEmail(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/email`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setEmailConfig(data);
        // Pre-fill the form with existing values (except password)
        setEmailForm({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: '', // Clear user display mask
          smtp_password: '',
          smtp_use_tls: data.smtp_use_tls !== false,
          sender_email: data.sender_email || '',
          sender_name: data.sender_name || 'ProjectDash'
        });
        // Set group sender name
        setGroupSenderName(data.sender_name || '');
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleSaveGroupSenderName = async () => {
    if (!groupSenderName.trim()) {
      toast.error(t('settings.fillAllFields'));
      return;
    }

    setSavingSenderName(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/email/sender-name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sender_name: groupSenderName })
      });
      
      if (response.ok) {
        toast.success(t('settings.senderNameSaved'));
        loadEmailConfig();
      } else {
        toast.error('Failed to save sender name');
      }
    } catch (error) {
      toast.error('Failed to save sender name');
    } finally {
      setSavingSenderName(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!emailForm.smtp_host || !emailForm.smtp_user || !emailForm.sender_email) {
      toast.error(t('settings.fillAllFields'));
      return;
    }

    setSavingEmail(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(emailForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || t('settings.emailSaved'));
        setEditingEmail(false);
        loadEmailConfig();
      } else {
        toast.error(data.detail || 'Failed to save email settings');
      }
    } catch (error) {
      toast.error('Failed to save email settings');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/email/test?test_email=${encodeURIComponent(testEmail)}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Test email sent successfully');
        setTestEmail('');
      } else {
        toast.error(data.detail || 'Failed to send test email');
      }
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!newMember.email || !newMember.name) {
      toast.error('Email and name are required');
      return;
    }

    setInviting(true);
    try {
      const result = await inviteUser(newMember);
      setTempPassword(result.temp_password);
      toast.success('User invited successfully');
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setInviting(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setTempPassword(null);
    setNewMember({ email: '', name: '', role: 'member' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="heading text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-slate-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Theme */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading text-lg flex items-center gap-2">
            <Palette size={20} />
            {t('settings.theme')}
          </CardTitle>
          <CardDescription className="text-slate-400">{t('settings.themeSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Toggle */}
          <div className="space-y-3">
            <Label>{t('settings.mode')}</Label>
            <div className="flex gap-2">
              <Button
                variant={mode === 'dark' ? 'default' : 'outline'}
                onClick={() => setMode('dark')}
                className={mode === 'dark' ? 'bg-accent' : 'border-slate-700'}
              >
                <Moon size={16} className="mr-2" />
                {t('settings.darkMode')}
              </Button>
              <Button
                variant={mode === 'light' ? 'default' : 'outline'}
                onClick={() => setMode('light')}
                className={mode === 'light' ? 'bg-accent' : 'border-slate-700'}
              >
                <Sun size={16} className="mr-2" />
                {t('settings.lightMode')}
              </Button>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <Label>{t('settings.accentColor')}</Label>
            <div className="flex flex-wrap gap-3">
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={`w-12 h-12 rounded-lg transition-all ${
                    accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'
                  } ${color === 'black' ? 'border-2 border-slate-500' : ''}`}
                  style={{
                    backgroundColor: color === 'black' ? '#0f172a' :
                      color === 'green' ? '#22c55e' :
                      color === 'yellow' ? '#eab308' :
                      color === 'purple' ? '#a855f7' :
                      color === 'blue' ? '#3b82f6' :
                      '#f97316'
                  }}
                  title={ACCENT_COLOR_NAMES[color]?.[language] || color}
                />
              ))}
            </div>
            <p className="text-sm text-slate-500">
              {t('settings.currentColor')}: {ACCENT_COLOR_NAMES[accentColor]?.[language] || accentColor}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading text-lg flex items-center gap-2">
            <Globe size={20} />
            {t('settings.language')}
          </CardTitle>
          <CardDescription className="text-slate-400">{t('settings.languageSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={changeLanguage}>
            <SelectTrigger data-testid="language-select" className="w-[200px] bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">
                <span className="flex items-center gap-2">
                  🇬🇧 {t('settings.english')}
                </span>
              </SelectItem>
              <SelectItem value="nb">
                <span className="flex items-center gap-2">
                  🇳🇴 {t('settings.norwegian')}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Organization Info */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading text-lg flex items-center gap-2">
            <Building2 size={20} />
            {t('settings.organization')}
          </CardTitle>
          <CardDescription className="text-slate-400">{t('settings.orgDetails')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">{t('settings.orgName')}</Label>
              <p className="font-medium text-lg">{group?.name}</p>
            </div>
            <div>
              <Label className="text-slate-500">{t('settings.members')}</Label>
              <p className="font-medium text-lg">{group?.member_count} {t('settings.members').toLowerCase()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Log Settings (Admin Only) */}
      {isAdmin && (
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg flex items-center gap-2">
              <Clock size={20} />
              {t('settings.workLogSettings')}
            </CardTitle>
            <CardDescription className="text-slate-400">{t('settings.workLogSettingsSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hourly-rate">{t('settings.defaultHourlyRate')}</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="hourly-rate"
                  data-testid="hourly-rate-input"
                  type="number"
                  min="0"
                  step="1"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0"
                  className="w-40 bg-slate-800 border-slate-700"
                />
                <span className="text-slate-400">kr/time</span>
                <Button
                  onClick={handleSaveHourlyRate}
                  disabled={savingRate}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {savingRate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                  {t('common.save')}
                </Button>
              </div>
              <p className="text-xs text-slate-500">{t('settings.hourlyRateHint')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Settings (Admin Only) */}
      {isAdmin && (
        <Card className="card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="heading text-lg flex items-center gap-2">
                  <Mail size={20} />
                  {t('settings.emailSettings')}
                </CardTitle>
                <CardDescription className="text-slate-400">{t('settings.emailSubtitle')}</CardDescription>
              </div>
              {!editingEmail && (
                <Button
                  variant="outline"
                  onClick={() => setEditingEmail(true)}
                  className="border-slate-600"
                >
                  <Edit size={16} className="mr-2" />
                  {t('settings.configure')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingEmail ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : editingEmail ? (
              // Editable Form
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">{t('settings.smtpHost')} *</Label>
                    <Input
                      id="smtp-host"
                      value={emailForm.smtp_host}
                      onChange={(e) => setEmailForm({...emailForm, smtp_host: e.target.value})}
                      placeholder="smtp.yourdomain.com"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">{t('settings.smtpPort')}</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={emailForm.smtp_port}
                      onChange={(e) => setEmailForm({...emailForm, smtp_port: parseInt(e.target.value) || 587})}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">{t('settings.smtpUser')} *</Label>
                    <Input
                      id="smtp-user"
                      value={emailForm.smtp_user}
                      onChange={(e) => setEmailForm({...emailForm, smtp_user: e.target.value})}
                      placeholder="your-email@yourdomain.com"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">{t('settings.smtpPassword')}</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      value={emailForm.smtp_password}
                      onChange={(e) => setEmailForm({...emailForm, smtp_password: e.target.value})}
                      placeholder={emailConfig?.configured ? t('settings.leaveBlank') : ''}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-email">{t('settings.senderEmail')} *</Label>
                    <Input
                      id="sender-email"
                      type="email"
                      value={emailForm.sender_email}
                      onChange={(e) => setEmailForm({...emailForm, sender_email: e.target.value})}
                      placeholder="noreply@yourdomain.com"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">{t('settings.senderName')}</Label>
                    <Input
                      id="sender-name"
                      value={emailForm.sender_name}
                      onChange={(e) => setEmailForm({...emailForm, sender_name: e.target.value})}
                      placeholder="ProjectDash"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="smtp-tls"
                    checked={emailForm.smtp_use_tls}
                    onCheckedChange={(checked) => setEmailForm({...emailForm, smtp_use_tls: checked})}
                  />
                  <Label htmlFor="smtp-tls">{t('settings.useTLS')}</Label>
                </div>
                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  <Button
                    onClick={handleSaveEmailSettings}
                    disabled={savingEmail}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {savingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                    {t('common.save')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingEmail(false)}
                    className="border-slate-600"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : emailConfig ? (
              // Read-only Display
              <>
                <div className="flex items-center gap-2 mb-4">
                  {emailConfig.configured ? (
                    <span className="flex items-center gap-2 text-green-400">
                      <CheckCircle size={16} />
                      {t('settings.configured')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-amber-400">
                      <XCircle size={16} />
                      {t('settings.notConfigured')}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <Label className="text-slate-500">{t('settings.smtpHost')}</Label>
                    <p className="font-mono text-sm">{emailConfig.smtp_host || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{t('settings.smtpPort')}</Label>
                    <p className="font-mono text-sm">{emailConfig.smtp_port}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{t('settings.smtpUser')}</Label>
                    <p className="font-mono text-sm">{emailConfig.smtp_user || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{t('settings.senderEmail')}</Label>
                    <p className="font-mono text-sm">{emailConfig.sender_email || '-'}</p>
                  </div>
                </div>

                {emailConfig.configured && (
                  <div className="pt-4 border-t border-slate-700">
                    <Label className="mb-2 block">{t('settings.testEmail')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder={t('settings.testEmailPlaceholder')}
                        className="bg-slate-800 border-slate-700"
                      />
                      <Button
                        onClick={handleSendTestEmail}
                        disabled={sendingTest}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.sendTest')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Per-Group Sender Name */}
                <div className="pt-4 border-t border-slate-700">
                  <Label className="mb-2 block">{t('settings.groupSenderName')}</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      value={groupSenderName}
                      onChange={(e) => setGroupSenderName(e.target.value)}
                      placeholder="ProjectDash"
                      className="w-64 bg-slate-800 border-slate-700"
                    />
                    <Button
                      onClick={handleSaveGroupSenderName}
                      disabled={savingSenderName}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {savingSenderName ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      {t('common.save')}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{t('settings.groupSenderNameHint')}</p>
                </div>
                
                <p className="text-xs text-amber-400/70 mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  {t('settings.globalSmtpNote')}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Team Members / User Management */}
      <Card className="card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="heading text-lg flex items-center gap-2">
                <Users size={20} />
                {t('settings.teamMembers')}
              </CardTitle>
              <CardDescription className="text-slate-400">{t('settings.manageTeam')}</CardDescription>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {/* Create User Button */}
                <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-user-btn" variant="outline" className="border-slate-600">
                      <UserCog size={16} className="mr-2" />
                      {t('settings.createUser')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-slate-900 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="heading">{t('settings.createUser')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-name">{t('common.name')} *</Label>
                        <Input
                          id="create-name"
                          data-testid="create-user-name"
                          value={newUserData.name}
                          onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                          placeholder={t('common.name')}
                          required
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-email">{t('common.email')} *</Label>
                        <Input
                          id="create-email"
                          data-testid="create-user-email"
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                          placeholder="name@company.com"
                          required
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-password">{t('common.password')} *</Label>
                        <Input
                          id="create-password"
                          data-testid="create-user-password"
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                          placeholder={t('common.password')}
                          required
                          minLength={8}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.role')}</Label>
                        <Select
                          value={newUserData.role}
                          onValueChange={(value) => setNewUserData({...newUserData, role: value})}
                        >
                          <SelectTrigger data-testid="create-user-role" className="bg-slate-800 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">{t('settings.roleEmployee')}</SelectItem>
                            <SelectItem value="hr">{t('settings.roleHR')}</SelectItem>
                            <SelectItem value="member">{t('settings.roleMember')}</SelectItem>
                            <SelectItem value="admin">{t('settings.roleAdmin')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creatingUser}>
                          {creatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {t('settings.createUser')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                
                {/* Invite User Button */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="invite-user-btn" className="bg-orange-500 hover:bg-orange-600">
                      <UserPlus size={16} className="mr-2" />
                      {t('settings.inviteUser')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-slate-900 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="heading">{t('settings.inviteUser')}</DialogTitle>
                    </DialogHeader>
                    {tempPassword ? (
                      <div className="space-y-4">
                        <p className="text-slate-400">{t('settings.userCreated')}</p>
                        <div className="p-4 bg-slate-800 rounded-lg">
                          <Label className="text-sm text-slate-500">{t('settings.tempPassword')}</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="flex-1 p-2 bg-slate-900 rounded font-mono text-sm">
                              {tempPassword}
                            </code>
                            <Button variant="ghost" size="sm" onClick={copyPassword}>
                              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </Button>
                          </div>
                        </div>
                        <Button onClick={closeDialog} className="w-full bg-orange-500 hover:bg-orange-600">
                          {t('common.close')}
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleInvite} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="inv-name">{t('common.name')} *</Label>
                          <Input
                            id="inv-name"
                            data-testid="invite-name-input"
                            value={newMember.name}
                            onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                            placeholder={t('common.name')}
                            required
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inv-email">{t('common.email')} *</Label>
                          <Input
                            id="inv-email"
                            data-testid="invite-email-input"
                            type="email"
                            value={newMember.email}
                            onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                            placeholder="name@company.com"
                            required
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('settings.role')}</Label>
                          <Select
                            value={newMember.role}
                            onValueChange={(value) => setNewMember({...newMember, role: value})}
                          >
                            <SelectTrigger data-testid="invite-role-select" className="bg-slate-800 border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">{t('settings.roleEmployee')}</SelectItem>
                              <SelectItem value="hr">{t('settings.roleHR')}</SelectItem>
                              <SelectItem value="member">{t('settings.roleMember')}</SelectItem>
                              <SelectItem value="admin">{t('settings.roleAdmin')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={closeDialog}>
                            {t('common.cancel')}
                          </Button>
                          <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={inviting}>
                            {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t('settings.sendInvite')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Show inactive users toggle */}
          {isAdmin && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-slate-800/30 rounded-lg">
              <Checkbox
                id="show-inactive"
                checked={showInactiveUsers}
                onCheckedChange={setShowInactiveUsers}
              />
              <Label htmlFor="show-inactive" className="text-sm text-slate-400 cursor-pointer">
                {t('settings.showInactiveUsers')}
              </Label>
            </div>
          )}
          
          <div className="space-y-3">
            {members.map((member) => {
              const isInactive = member.is_active === false;
              const roleColors = {
                owner: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                hr: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                member: 'bg-green-500/20 text-green-300 border-green-500/30',
                employee: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
              };
              const roleIcons = {
                owner: <Shield size={12} />,
                admin: <UserCog size={12} />,
                hr: <Briefcase size={12} />,
                member: <User size={12} />,
                employee: <User size={12} />
              };
              // Map role names to translation keys
              const roleTranslationKeys = {
                owner: 'settings.roleOwner',
                admin: 'settings.roleAdmin',
                hr: 'settings.roleHR',
                member: 'settings.roleMember',
                employee: 'settings.roleEmployee'
              };
              
              return (
                <div 
                  key={member.user_id} 
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    isInactive ? 'bg-slate-800/30 opacity-60' : 'bg-slate-800/50'
                  }`}
                  data-testid={`member-${member.user_id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      isInactive ? 'bg-slate-600' : 'bg-slate-700'
                    }`}>
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        {isInactive && (
                          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded border border-red-500/30">
                            {t('settings.inactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Role badge */}
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${roleColors[member.role] || roleColors.employee}`}>
                      {roleIcons[member.role]}
                      {t(roleTranslationKeys[member.role] || 'settings.roleEmployee')}
                    </span>
                    
                    {/* Admin actions dropdown */}
                    {isAdmin && member.role !== 'owner' && member.user_id !== user?.user_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          {/* Change Role */}
                          <DropdownMenuItem 
                            className="text-slate-200 focus:bg-slate-700 cursor-pointer"
                            onSelect={() => setEditingUser(member)}
                          >
                            <Edit size={14} className="mr-2" />
                            {t('settings.changeRole')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          {/* Activate/Deactivate */}
                          <DropdownMenuItem 
                            className={`cursor-pointer ${isInactive ? 'text-green-400 focus:bg-green-500/20' : 'text-red-400 focus:bg-red-500/20'}`}
                            onSelect={() => handleToggleUserStatus(member.user_id, !isInactive)}
                          >
                            <Power size={14} className="mr-2" />
                            {isInactive ? t('settings.activateUser') : t('settings.deactivateUser')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="heading">{t('settings.changeRole')}</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <p className="text-slate-400">
                {t('settings.changeRoleFor')} <strong>{editingUser.name}</strong>
              </p>
              <Select
                value={editingUser.role}
                onValueChange={(value) => setEditingUser({...editingUser, role: value})}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{t('settings.roleEmployee')}</SelectItem>
                  <SelectItem value="hr">{t('settings.roleHR')}</SelectItem>
                  <SelectItem value="member">{t('settings.roleMember')}</SelectItem>
                  <SelectItem value="admin">{t('settings.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={updatingRole}
                  onClick={() => handleUpdateUserRole(editingUser.user_id, editingUser.role)}
                >
                  {updatingRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
