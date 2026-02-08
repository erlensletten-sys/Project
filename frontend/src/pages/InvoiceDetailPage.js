import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getInvoice, formatCurrency, formatDate, updateInvoiceStatus, sendInvoice, getInvoicePdfUrl } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Send, CheckCircle, Printer, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(id);
      setInvoice(data);
      setRecipientEmail(data.customer_email || '');
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

  const handleSendInvoice = async (e) => {
    e.preventDefault();
    if (!recipientEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    setSending(true);
    try {
      await sendInvoice(id, recipientEmail);
      toast.success(`Invoice sent to ${recipientEmail}`);
      setSendDialogOpen(false);
      loadInvoice();
    } catch (error) {
      toast.error(error.message || 'Failed to send invoice');
    } finally {
      setSending(false);
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
            <div className="flex items-center gap-3">
              <h1 className="heading text-2xl font-bold">
                {invoice.invoice_number}
              </h1>
              <span className={`status-badge ${invoice.status}`}>{invoice.status}</span>
            </div>
            {invoice.sent_to && (
              <p className="text-sm text-slate-400 mt-1">
                Sent to {invoice.sent_to} on {formatDate(invoice.sent_at)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Send Email Button */}
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="send-email-btn"
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                <Mail size={16} className="mr-2" />
                Send Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="heading">Send Invoice by Email</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSendInvoice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient-email">Recipient Email</Label>
                  <Input
                    id="recipient-email"
                    data-testid="recipient-email-input"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">Email Preview</h4>
                  <p className="text-sm text-slate-400">
                    Subject: Invoice {invoice.invoice_number} from your organization
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    The email will include invoice details, line items, and payment information.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} className="mr-2" />
                        Send Invoice
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

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
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
            <Printer size={16} className="mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Details */}
      <Card className="card">
        <CardContent className="p-8">
          {/* Header Info */}
          <div className="flex justify-between mb-8 pb-8 border-b border-slate-700">
            <div>
              <h2 className="heading text-xl font-bold mb-4">Bill To</h2>
              <p className="font-medium">{invoice.customer_name}</p>
              {invoice.customer_email && (
                <p className="text-slate-400">{invoice.customer_email}</p>
              )}
              {invoice.customer_address && (
                <p className="text-slate-400 whitespace-pre-line">{invoice.customer_address}</p>
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
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 text-sm font-medium text-slate-400 uppercase">Description</th>
                <th className="text-right py-3 text-sm font-medium text-slate-400 uppercase">Qty</th>
                <th className="text-right py-3 text-sm font-medium text-slate-400 uppercase">Price</th>
                <th className="text-right py-3 text-sm font-medium text-slate-400 uppercase">VAT</th>
                <th className="text-right py-3 text-sm font-medium text-slate-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-slate-800">
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
                <span className="text-slate-400">Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">VAT</span>
                <span className="font-mono">{formatCurrency(invoice.vat_total)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="font-medium">Total</span>
                <span className="font-mono font-bold text-lg text-orange-400">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-8 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 uppercase mb-2">Notes</h3>
              <p className="text-slate-300">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
