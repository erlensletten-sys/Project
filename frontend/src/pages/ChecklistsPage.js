import React, { useState, useEffect } from 'react';
import { getChecklists, createChecklist, toggleChecklistItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, ClipboardCheck, Search, Loader2, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['general', 'safety', 'quality', 'inspection'];

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    title: '',
    description: '',
    category: 'general',
    items: [{ text: '', required: false }]
  });

  useEffect(() => {
    loadChecklists();
  }, [filter]);

  const loadChecklists = async () => {
    try {
      const category = filter === 'all' ? null : filter;
      const data = await getChecklists({ category });
      setChecklists(data);
    } catch (error) {
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newChecklist.title) {
      toast.error('Title is required');
      return;
    }

    const validItems = newChecklist.items.filter(item => item.text.trim());
    if (validItems.length === 0) {
      toast.error('Add at least one checklist item');
      return;
    }

    setCreating(true);
    try {
      await createChecklist({
        ...newChecklist,
        items: validItems
      });
      toast.success('Checklist created');
      setDialogOpen(false);
      setNewChecklist({ title: '', description: '', category: 'general', items: [{ text: '', required: false }] });
      loadChecklists();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const addItem = () => {
    setNewChecklist({
      ...newChecklist,
      items: [...newChecklist.items, { text: '', required: false }]
    });
  };

  const removeItem = (index) => {
    if (newChecklist.items.length === 1) return;
    setNewChecklist({
      ...newChecklist,
      items: newChecklist.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const items = [...newChecklist.items];
    items[index][field] = value;
    setNewChecklist({ ...newChecklist, items });
  };

  const handleToggleItem = async (checklistId, itemIndex) => {
    try {
      await toggleChecklistItem(checklistId, itemIndex);
      loadChecklists();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const filteredChecklists = checklists.filter(cl =>
    cl.title.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="heading text-3xl font-bold text-slate-900">Checklists</h1>
          <p className="text-slate-500 mt-1">Create and manage field checklists</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-checklist-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              New Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="heading">Create Checklist</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cl-title">Title *</Label>
                <Input
                  id="cl-title"
                  data-testid="checklist-title-input"
                  value={newChecklist.title}
                  onChange={(e) => setNewChecklist({...newChecklist, title: e.target.value})}
                  placeholder="Checklist name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-desc">Description</Label>
                <Input
                  id="cl-desc"
                  data-testid="checklist-description-input"
                  value={newChecklist.description}
                  onChange={(e) => setNewChecklist({...newChecklist, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newChecklist.category}
                  onValueChange={(value) => setNewChecklist({...newChecklist, category: value})}
                >
                  <SelectTrigger data-testid="checklist-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Items</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {newChecklist.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        data-testid={`checklist-item-${index}`}
                        value={item.text}
                        onChange={(e) => updateItem(index, 'text', e.target.value)}
                        placeholder={`Item ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={newChecklist.items.length === 1}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus size={14} className="mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                data-testid="search-checklists"
                placeholder="Search checklists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger data-testid="filter-checklists" className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Checklists */}
      {filteredChecklists.length === 0 ? (
        <Card className="card">
          <CardContent>
            <div className="empty-state py-16">
              <ClipboardCheck size={48} className="text-slate-300" strokeWidth={1} />
              <h3 className="font-medium text-slate-900 mt-4">No checklists found</h3>
              <p className="text-sm mt-1">Create your first checklist to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChecklists.map((checklist) => (
            <Card key={checklist.checklist_id} className="card" data-testid={`checklist-${checklist.checklist_id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="heading text-lg">{checklist.title}</CardTitle>
                    <p className="text-sm text-slate-500 capitalize">{checklist.category}</p>
                  </div>
                  <span className={`status-badge ${checklist.status}`}>{checklist.status}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-slate-500 mb-4">
                  {checklist.completed_items} / {checklist.total_items} items completed
                </div>
                {checklist.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded transition-colors"
                  >
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleToggleItem(checklist.checklist_id, index)}
                    />
                    <span className={item.checked ? 'line-through text-slate-400' : ''}>
                      {item.text}
                    </span>
                    {item.required && (
                      <span className="text-xs text-red-500">*</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
