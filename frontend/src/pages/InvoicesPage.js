import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, formatCurrency, formatDate, updateInvoiceStatus } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, FileText, Search, MoreHorizontal, Send, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  const loadInvoices = async () => {
    try {
      const status = filter === 'all' ? null : filter;
      const data = await getInvoices(status);
      setInvoices(data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      toast.success(`Invoice marked as ${newStatus}`);
      loadInvoices();
    } catch (error) {
      toast.error('Failed to update invoice status');
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    return <span className={`status-badge ${status}`}>{status}</span>;
  };

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
          <h1 className="heading text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage your invoices and track payments</p>
        </div>
        <Link to="/invoices/new">
          <Button data-testid="create-invoice-btn" className="bg-orange-500 hover:bg-orange-600">
            <Plus size={16} className="mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                data-testid="search-invoices"
                placeholder="Search by customer or invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger data-testid="filter-status" className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="card">
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="empty-state py-16">
              <FileText size={48} className="text-slate-300" strokeWidth={1} />
              <h3 className="font-medium text-slate-900 mt-4">No invoices found</h3>
              <p className="text-sm mt-1">Create your first invoice to get started</p>
              <Link to="/invoices/new" className="mt-4">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus size={16} className="mr-2" />
                  Create Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.invoice_id} data-testid={`invoice-row-${invoice.invoice_id}`}>
                    <td>
                      <Link 
                        to={`/invoices/${invoice.invoice_id}`}
                        className="font-mono text-sm text-orange-500 hover:text-orange-600"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="font-medium">{invoice.customer_name}</td>
                    <td className="text-slate-500">{formatDate(invoice.created_at)}</td>
                    <td className="text-slate-500">{formatDate(invoice.due_date)}</td>
                    <td>{getStatusBadge(invoice.status)}</td>
                    <td className="text-right font-mono font-medium">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/invoices/${invoice.invoice_id}`}>View Details</Link>
                          </DropdownMenuItem>
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice.invoice_id, 'sent')}>
                              <Send size={14} className="mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {invoice.status === 'sent' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice.invoice_id, 'paid')}>
                              <CheckCircle size={14} className="mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
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
