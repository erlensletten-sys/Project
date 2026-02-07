import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getInvoice, formatCurrency, formatDate, updateInvoiceStatus } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, CheckCircle, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(id);
      setInvoice(data);
    } catch (error) {
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateInvoiceStatus(id, newStatus);
      toast.success(`Invoice marked as ${newStatus}`);
      loadInvoice();
    } catch (error) {
      toast.error('Failed to update invoice status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="heading text-2xl font-bold text-slate-900">
              {invoice.invoice_number}
            </h1>
            <span className={`status-badge ${invoice.status} mt-1`}>{invoice.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <Button 
              data-testid="mark-sent-btn"
              onClick={() => handleStatusChange('sent')}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send size={16} className="mr-2" />
              Mark as Sent
            </Button>
          )}
          {invoice.status === 'sent' && (
            <Button 
              data-testid="mark-paid-btn"
              onClick={() => handleStatusChange('paid')}
              className="bg-green-500 hover:bg-green-600"
            >
              <CheckCircle size={16} className="mr-2" />
              Mark as Paid
            </Button>
          )}
          <Button variant="outline">
            <Printer size={16} className="mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Details */}
      <Card className="card">
        <CardContent className="p-8">
          {/* Header Info */}
          <div className="flex justify-between mb-8 pb-8 border-b border-slate-200">
            <div>
              <h2 className="heading text-xl font-bold text-slate-900 mb-4">Bill To</h2>
              <p className="font-medium text-slate-900">{invoice.customer_name}</p>
              {invoice.customer_email && (
                <p className="text-slate-500">{invoice.customer_email}</p>
              )}
              {invoice.customer_address && (
                <p className="text-slate-500 whitespace-pre-line">{invoice.customer_address}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Invoice Date</p>
              <p className="font-medium">{formatDate(invoice.created_at)}</p>
              <p className="text-sm text-slate-500 mt-4">Due Date</p>
              <p className="font-medium">{formatDate(invoice.due_date)}</p>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-sm font-medium text-slate-500 uppercase">Description</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500 uppercase">Qty</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500 uppercase">Price</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500 uppercase">VAT</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="py-4">{item.description}</td>
                  <td className="py-4 text-right">{item.quantity}</td>
                  <td className="py-4 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                  <td className="py-4 text-right">{item.vat_rate}%</td>
                  <td className="py-4 text-right font-mono font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">VAT</span>
                <span className="font-mono">{formatCurrency(invoice.vat_total)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-medium">Total</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Notes</h3>
              <p className="text-slate-700">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
