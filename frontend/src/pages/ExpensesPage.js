import React, { useState, useEffect } from 'react';
import { getExpenses, createExpense, updateExpenseStatus, formatCurrency, formatDate } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
import { Plus, Receipt, Search, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Travel',
  'Meals',
  'Equipment',
  'Software',
  'Office Supplies',
  'Transportation',
  'Accommodation',
  'Other'
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: '',
    date: '',
    receipt_url: ''
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

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
          <h1 className="heading text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 mt-1">Track and manage business expenses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-expense-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              Submit Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="heading">Submit New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exp-desc">Description *</Label>
                <Textarea
                  id="exp-desc"
                  data-testid="expense-description-input"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="What was this expense for?"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-amount">Amount (NOK) *</Label>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({...newExpense, category: value})}
                  >
                    <SelectTrigger data-testid="expense-category-select">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-date">Date</Label>
                <Input
                  id="exp-date"
                  data-testid="expense-date-input"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-receipt">Receipt URL</Label>
                <Input
                  id="exp-receipt"
                  data-testid="expense-receipt-input"
                  value={newExpense.receipt_url}
                  onChange={(e) => setNewExpense({...newExpense, receipt_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit
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
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger data-testid="filter-expenses" className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
              <Receipt size={48} className="text-slate-300" strokeWidth={1} />
              <h3 className="font-medium text-slate-900 mt-4">No expenses found</h3>
              <p className="text-sm mt-1">Submit your first expense to get started</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.expense_id} data-testid={`expense-row-${expense.expense_id}`}>
                    <td className="max-w-xs truncate">{expense.description}</td>
                    <td>{expense.category}</td>
                    <td className="text-slate-500">{formatDate(expense.date)}</td>
                    <td><span className={`status-badge ${expense.status}`}>{expense.status}</span></td>
                    <td className="text-right font-mono font-medium">{formatCurrency(expense.amount)}</td>
                    {isAdmin && (
                      <td>
                        {expense.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-500 hover:text-green-600"
                              onClick={() => handleStatusChange(expense.expense_id, 'approved')}
                            >
                              <Check size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
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
