import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, createTask, updateTask, formatDate, formatCurrency } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ArrowLeft, Plus, Loader2, CalendarDays, DollarSign, ListTodo, Circle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const data = await getProject(id);
      setProject(data);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) {
      toast.error('Task title is required');
      return;
    }

    setCreating(true);
    try {
      await createTask(id, {
        ...newTask,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null
      });
      toast.success('Task added');
      setDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
      loadProject();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTaskStatusChange = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      await updateTask(id, taskId, newStatus);
      loadProject();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) return null;

  const todoTasks = project.tasks?.filter(t => t.status !== 'done') || [];
  const doneTasks = project.tasks?.filter(t => t.status === 'done') || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="heading text-2xl font-bold text-slate-900">{project.name}</h1>
              <span className={`status-badge ${project.status}`}>{project.status}</span>
            </div>
            {project.client_name && (
              <p className="text-slate-500 mt-1">{project.client_name}</p>
            )}
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-task-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="heading">Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title *</Label>
                <Input
                  id="task-title"
                  data-testid="task-title-input"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Task title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea
                  id="task-desc"
                  data-testid="task-description-input"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Optional details"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({...newTask, priority: value})}
                  >
                    <SelectTrigger data-testid="task-priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due">Due Date</Label>
                  <Input
                    id="task-due"
                    data-testid="task-due-input"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Timeline</p>
              <p className="font-medium">
                {formatDate(project.start_date) || 'No start'} - {formatDate(project.end_date) || 'No end'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Budget</p>
              <p className="font-medium">{project.budget ? formatCurrency(project.budget) : 'Not set'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ListTodo className="text-purple-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tasks</p>
              <p className="font-medium">{doneTasks.length} / {project.tasks?.length || 0} completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {project.description && (
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* To Do */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg flex items-center gap-2">
              <Circle size={16} className="text-amber-500" />
              To Do ({todoTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todoTasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No pending tasks</p>
            ) : (
              todoTasks.map((task) => (
                <div
                  key={task.task_id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  data-testid={`task-${task.task_id}`}
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleTaskStatusChange(task.task_id, task.status)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-slate-500 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                      {task.due_date && (
                        <span className="text-xs text-slate-500">{formatDate(task.due_date)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg flex items-center gap-2">
              <Circle size={16} className="text-green-500 fill-green-500" />
              Completed ({doneTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {doneTasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No completed tasks yet</p>
            ) : (
              doneTasks.map((task) => (
                <div
                  key={task.task_id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg opacity-75"
                  data-testid={`task-${task.task_id}`}
                >
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => handleTaskStatusChange(task.task_id, task.status)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 line-through">{task.title}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
