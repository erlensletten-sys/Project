import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n';
import { getProjects, createProject, formatDate, formatCurrency } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, FolderKanban, Search, Loader2, ArrowRight, CalendarDays, ListTodo } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    end_date: '',
    budget: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProject.name) {
      toast.error('Project name is required');
      return;
    }

    setCreating(true);
    try {
      await createProject({
        ...newProject,
        budget: newProject.budget ? parseFloat(newProject.budget) : null,
        start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : null,
        end_date: newProject.end_date ? new Date(newProject.end_date).toISOString() : null
      });
      toast.success('Project created successfully');
      setDialogOpen(false);
      setNewProject({ name: '', description: '', client_name: '', start_date: '', end_date: '', budget: '' });
      loadProjects();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      planning: t('projects.planning'),
      active: t('projects.active'),
      completed: t('projects.completed'),
      'on-hold': t('projects.onHold')
    };
    return labels[status] || status;
  };

  const filteredProjects = projects.filter(proj =>
    proj.name.toLowerCase().includes(search.toLowerCase()) ||
    proj.client_name?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="heading text-3xl font-bold text-slate-900">{t('projects.title')}</h1>
          <p className="text-slate-500 mt-1">{t('projects.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-project-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              {t('projects.newProject')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="heading">{t('projects.newProject')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proj-name">{t('projects.projectName')} *</Label>
                <Input
                  id="proj-name"
                  data-testid="project-name-input"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder={t('projects.projectName')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-desc">{t('common.description')}</Label>
                <Textarea
                  id="proj-desc"
                  data-testid="project-description-input"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder={t('common.description')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-client">{t('projects.client')}</Label>
                <Input
                  id="proj-client"
                  data-testid="project-client-input"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({...newProject, client_name: e.target.value})}
                  placeholder={t('projects.client')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proj-start">{t('payroll.startDate')}</Label>
                  <Input
                    id="proj-start"
                    data-testid="project-start-input"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-end">{t('projects.timeline')}</Label>
                  <Input
                    id="proj-end"
                    data-testid="project-end-input"
                    type="date"
                    value={newProject.end_date}
                    onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-budget">{t('projects.budget')} (NOK)</Label>
                <Input
                  id="proj-budget"
                  data-testid="project-budget-input"
                  type="number"
                  min="0"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('common.create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              data-testid="search-projects"
              placeholder={t('common.search') + '...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="card">
          <CardContent>
            <div className="empty-state py-16">
              <FolderKanban size={48} className="text-slate-300" strokeWidth={1} />
              <h3 className="font-medium text-slate-900 mt-4">{t('projects.noProjects')}</h3>
              <p className="text-sm mt-1">{t('projects.createFirst')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Link key={project.project_id} to={`/projects/${project.project_id}`}>
              <Card 
                className="card hover:border-orange-200 cursor-pointer h-full"
                data-testid={`project-card-${project.project_id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FolderKanban className="text-purple-500" size={20} strokeWidth={1.5} />
                    </div>
                    <span className={`status-badge ${project.status}`}>{getStatusLabel(project.status)}</span>
                  </div>
                  <h3 className="heading font-semibold text-slate-900 mb-1">{project.name}</h3>
                  {project.client_name && (
                    <p className="text-sm text-slate-500 mb-3">{project.client_name}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                    <div className="flex items-center gap-1">
                      <CalendarDays size={14} />
                      <span>{formatDate(project.start_date) || t('common.noResults')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ListTodo size={14} />
                      <span>{project.task_count || 0} {t('projects.tasks').toLowerCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-4 text-orange-500">
                    <span className="text-sm font-medium">{t('common.view')}</span>
                    <ArrowRight size={16} className="ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
