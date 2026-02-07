import React, { useState, useEffect, useRef } from 'react';
import { getExpenses, createExpense, updateExpenseStatus, uploadFile, formatCurrency, formatDate } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Receipt, Search, Loader2, Check, X, Upload, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: '',
    date: '',
    receipt_url: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const CATEGORIES = [
    { value: 'travel', label: t('expenses.categories.travel') },
    { value: 'meals', label: t('expenses.categories.meals') },
    { value: 'equipment', label: t('expenses.categories.equipment') },
    { value: 'software', label: t('expenses.categories.software') },
    { value: 'officeSupplies', label: t('expenses.categories.officeSupplies') },
    { value: 'transportation', label: t('expenses.categories.transportation') },
    { value: 'accommodation', label: t('expenses.categories.accommodation') },
    { value: 'other', label: t('expenses.categories.other') }
  ];

  useEffect(() => {
    loadExpenses();
  }, [filter]);

  const loadExpenses = async () => {
    try {
      const status = filter === 'all' ? null : filter;
      const data = await getExpenses({ status });
      setExpenses(data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large (max 10MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadReceipt = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      const result = await uploadFile(selectedFile);
      setNewExpense({...newExpense, receipt_url: result.file_url});
      setSelectedFile(null);
      toast.success(t('expenses.receiptUploaded'));
    } catch (error) {
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount || !newExpense.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      await createExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date ? new Date(newExpense.date).toISOString() : null
      });
      toast.success('Expense submitted successfully');
      setDialogOpen(false);
      setNewExpense({ description: '', amount: '', category: '', date: '', receipt_url: '' });
      setSelectedFile(null);
      loadExpenses();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (expenseId, status) => {
    try {
      await updateExpenseStatus(expenseId, status);
      toast.success(`Expense ${status}`);
      loadExpenses();
    } catch (error) {
      toast.error('Failed to update expense');
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setNewExpense({ description: '', amount: '', category: '', date: '', receipt_url: '' });
    setSelectedFile(null);
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: t('expenses.pending'),
      approved: t('expenses.approved'),
      rejected: t('expenses.rejected')
    };
    return labels[status] || status;
  };

  const filteredExpenses = expenses.filter(exp =>
    exp.description.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="heading text-3xl font-bold">{t('expenses.title')}</h1>
          <p className="text-slate-400 mt-1">{t('expenses.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-expense-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              {t('expenses.submitExpense')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="heading">{t('expenses.submitExpense')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exp-desc">{t('common.description')} *</Label>
                <Textarea
                  id="exp-desc"
                  data-testid="expense-description-input"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder={t('common.description')}
                  required
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-amount">{t('common.amount')} (NOK) *</Label>
                  <Input
                    id="exp-amount"
                    data-testid="expense-amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                    required
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('expenses.category')} *</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({...newExpense, category: value})}
                  >
                    <SelectTrigger data-testid="expense-category-select" className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder={t('common.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-date">{t('common.date')}</Label>
                <Input
                  id="exp-date"
                  data-testid="expense-date-input"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              
              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label>{t('expenses.receipt')}</Label>
                <div className="space-y-2">
                  {newExpense.receipt_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <FileText size={16} className="text-green-400" />
                      <span className="text-sm text-green-400 flex-1">{t('expenses.receiptUploaded')}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewExpense({...newExpense, receipt_url: ''})}
                        className="text-red-400 hover:text-red-300"
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 border-slate-700 hover:bg-slate-800"
                      >
                        <Upload size={16} className="mr-2" />
                        {selectedFile ? selectedFile.name : t('expenses.selectReceipt')}
                      </Button>
                      {selectedFile && (
                        <Button
                          type="button"
                          onClick={handleUploadReceipt}
                          disabled={uploading}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.upload')}
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{t('expenses.supported')}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('common.submit')}
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
                data-testid="search-expenses"
                placeholder={t('common.search') + '...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger data-testid="filter-expenses" className="w-[180px] bg-slate-800 border-slate-700">
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} {t('expenses.title')}</SelectItem>
                <SelectItem value="pending">{t('expenses.pending')}</SelectItem>
                <SelectItem value="approved">{t('expenses.approved')}</SelectItem>
                <SelectItem value="rejected">{t('expenses.rejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="card">
        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <div className="empty-state py-16">
              <Receipt size={48} className="text-slate-600" strokeWidth={1} />
              <h3 className="font-medium mt-4">{t('expenses.noExpenses')}</h3>
              <p className="text-sm mt-1 text-slate-500">{t('expenses.submitFirst')}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.description')}</th>
                  <th>{t('expenses.category')}</th>
                  <th>{t('common.date')}</th>
                  <th>{t('expenses.receipt')}</th>
                  <th>{t('common.status')}</th>
                  <th className="text-right">{t('common.amount')}</th>
                  {isAdmin && <th>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.expense_id} data-testid={`expense-row-${expense.expense_id}`}>
                    <td className="max-w-xs truncate">{expense.description}</td>
                    <td>{expense.category}</td>
                    <td className="text-slate-400">{formatDate(expense.date)}</td>
                    <td>
                      {expense.receipt_url ? (
                        <a 
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          <FileText size={14} />
                          <span className="text-sm">{t('common.view')}</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </td>
                    <td><span className={`status-badge ${expense.status}`}>{getStatusLabel(expense.status)}</span></td>
                    <td className="text-right font-mono font-medium">{formatCurrency(expense.amount)}</td>
                    {isAdmin && (
                      <td>
                        {expense.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() => handleStatusChange(expense.expense_id, 'approved')}
                            >
                              <Check size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleStatusChange(expense.expense_id, 'rejected')}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
