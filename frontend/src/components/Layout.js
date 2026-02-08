import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  FolderKanban,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  HardHat,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role;
  const isAdminOrOwner = role === 'admin' || role === 'owner';
  const isHrOrAbove = isAdminOrOwner || role === 'hr';

  const allNavItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: 'all' },
    { path: '/invoices', label: t('nav.invoices'), icon: FileText, roles: 'admin' },
    { path: '/payroll', label: t('nav.payroll'), icon: Users, roles: 'hr' },
    { path: '/expenses', label: t('nav.expenses'), icon: Receipt, roles: 'all' },
    { path: '/projects', label: t('nav.projects'), icon: FolderKanban, roles: 'all' },
    { path: '/work-log', label: t('nav.workLog'), icon: HardHat, roles: 'all' },
    { path: '/checklists', label: t('nav.checklists'), icon: ClipboardCheck, roles: 'all' },
    { path: '/hse', label: t('nav.hseDocuments'), icon: ShieldCheck, roles: 'all' },
    { path: '/reports', label: t('nav.reports') || 'Reports', icon: BarChart3, roles: 'hr' },
    { path: '/settings', label: t('nav.settings'), icon: Settings, roles: 'admin' },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.roles === 'all') return true;
    if (item.roles === 'admin') return isAdminOrOwner;
    if (item.roles === 'hr') return isHrOrAbove;
    return true;
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile menu button */}
      <button
        data-testid="mobile-menu-button"
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-800 text-white"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="ProjectDash" className="w-10 h-10 rounded-lg object-contain" />
            <div>
              <h1 className="heading text-white font-semibold text-lg">ProjectDash</h1>
              <p className="text-slate-400 text-xs">{user?.group_name}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            data-testid="logout-button"
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut size={16} strokeWidth={1.5} className="mr-2" />
            {t('nav.signOut')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="texture-noise" aria-hidden="true" />
        <div className="relative z-10 p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
