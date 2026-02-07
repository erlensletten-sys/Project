import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { getGroup, getGroupMembers, inviteUser } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Building2, Users, UserPlus, Loader2, Copy, Check, Mail, Globe, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
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
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupData, membersData] = await Promise.all([
        getGroup(),
        getGroupMembers()
      ]);
      setGroup(groupData);
      setMembers(membersData);
      
      // Load email config if admin
      if (isAdmin) {
        loadEmailConfig();
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
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
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    } finally {
      setLoadingEmail(false);
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

      {/* Language Selection */}
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
              <p className="font-medium text-lg">{group?.member_count} {t('nav.settings').toLowerCase()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings (Admin Only) */}
      {isAdmin && (
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg flex items-center gap-2">
              <Mail size={20} />
              {t('settings.emailSettings')}
            </CardTitle>
            <CardDescription className="text-slate-400">{t('settings.emailSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingEmail ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : emailConfig ? (
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

                {!emailConfig.configured && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-400">
                      To configure SMTP, set these environment variables in backend/.env:
                    </p>
                    <pre className="mt-2 text-xs font-mono text-slate-400 bg-slate-800 p-2 rounded">
{`SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SENDER_EMAIL=noreply@yourdomain.com
SENDER_NAME=NordicForge`}
                    </pre>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
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
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="invite-user-btn" className="bg-orange-500 hover:bg-orange-600">
                    <UserPlus size={16} className="mr-2" />
                    {t('settings.inviteUser')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="heading">{t('settings.inviteTitle')}</DialogTitle>
                  </DialogHeader>
                  
                  {tempPassword ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-400 mb-2">
                          {t('settings.userInvited')}
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-slate-800 rounded border border-slate-700 font-mono text-sm">
                            {tempPassword}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copyPassword}
                          >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                          </Button>
                        </div>
                        <p className="text-xs text-green-400/70 mt-2">
                          {t('settings.changePassword')}
                        </p>
                      </div>
                      <Button onClick={closeDialog} className="w-full">
                        {t('settings.done')}
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
                          placeholder="Full name"
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
                          placeholder="user@company.com"
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
                            <SelectItem value="member">{t('settings.member')}</SelectItem>
                            <SelectItem value="admin">{t('settings.admin')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={closeDialog}>
                          {t('common.cancel')}
                        </Button>
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={inviting}>
                          {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {t('settings.inviteUser')}
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-700">
            {members.map((member) => (
              <div 
                key={member.user_id} 
                className="py-4 flex items-center justify-between"
                data-testid={`member-${member.user_id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-medium">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`status-badge ${member.role === 'owner' ? 'paid' : member.role === 'admin' ? 'sent' : 'draft'}`}>
                    {member.role === 'owner' ? t('settings.owner') : 
                     member.role === 'admin' ? t('settings.admin') : t('settings.member')}
                  </span>
                  {member.user_id === user?.user_id && (
                    <span className="text-xs text-slate-400">{t('settings.you')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading text-lg">{t('settings.yourAccount')}</CardTitle>
          <CardDescription className="text-slate-400">{t('settings.accountDetails')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">{t('common.name')}</Label>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <Label className="text-slate-500">{t('common.email')}</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <Label className="text-slate-500">{t('settings.role')}</Label>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
