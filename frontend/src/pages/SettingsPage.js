import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Building2, Users, UserPlus, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
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
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
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
        <h1 className="heading text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your organization settings</p>
      </div>

      {/* Organization Info */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading text-lg flex items-center gap-2">
            <Building2 size={20} />
            Organization
          </CardTitle>
          <CardDescription>Your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Organization Name</Label>
              <p className="font-medium text-lg">{group?.name}</p>
            </div>
            <div>
              <Label className="text-slate-500">Members</Label>
              <p className="font-medium text-lg">{group?.member_count} users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="heading text-lg flex items-center gap-2">
                <Users size={20} />
                Team Members
              </CardTitle>
              <CardDescription>Manage your team</CardDescription>
            </div>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="invite-user-btn" className="bg-orange-500 hover:bg-orange-600">
                    <UserPlus size={16} className="mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="heading">Invite New User</DialogTitle>
                  </DialogHeader>
                  
                  {tempPassword ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 mb-2">
                          User invited successfully! Share the temporary password:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-white rounded border font-mono text-sm">
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
                        <p className="text-xs text-green-600 mt-2">
                          The user should change this password after first login.
                        </p>
                      </div>
                      <Button onClick={closeDialog} className="w-full">
                        Done
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleInvite} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inv-name">Name *</Label>
                        <Input
                          id="inv-name"
                          data-testid="invite-name-input"
                          value={newMember.name}
                          onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                          placeholder="Full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inv-email">Email *</Label>
                        <Input
                          id="inv-email"
                          data-testid="invite-email-input"
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                          placeholder="user@company.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={newMember.role}
                          onValueChange={(value) => setNewMember({...newMember, role: value})}
                        >
                          <SelectTrigger data-testid="invite-role-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={closeDialog}>
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={inviting}>
                          {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Send Invite
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
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div 
                key={member.user_id} 
                className="py-4 flex items-center justify-between"
                data-testid={`member-${member.user_id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`status-badge ${member.role === 'owner' ? 'paid' : member.role === 'admin' ? 'sent' : 'draft'}`}>
                    {member.role}
                  </span>
                  {member.user_id === user?.user_id && (
                    <span className="text-xs text-slate-400">(You)</span>
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
          <CardTitle className="heading text-lg">Your Account</CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Name</Label>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <Label className="text-slate-500">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <Label className="text-slate-500">Role</Label>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
