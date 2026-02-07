import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInvoice } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_address: '',
    due_date: '',
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, vat_rate: 25 }]
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, vat_rate: 25 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemVat = itemTotal * (item.vat_rate / 100);
      return sum + itemTotal + itemVat;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name) {
      toast.error('Customer name is required');
      return;
    }

    if (formData.items.some(item => !item.description || item.unit_price <= 0)) {
      toast.error('Please fill in all line items with valid prices');
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
      };
      await createInvoice(data);
      toast.success('Invoice created successfully');
      navigate('/invoices');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="heading text-2xl font-bold text-slate-900">Create Invoice</h1>
          <p className="text-slate-500">Create a new invoice for your customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  data-testid="customer-name-input"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="Company or person name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_email">Email</Label>
                <Input
                  id="customer_email"
                  name="customer_email"
                  data-testid="customer-email-input"
                  type="email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_address">Address</Label>
              <Textarea
                id="customer_address"
                name="customer_address"
                data-testid="customer-address-input"
                value={formData.customer_address}
                onChange={handleChange}
                placeholder="Street address, city, postal code"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                data-testid="due-date-input"
                type="date"
                value={formData.due_date}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label>Description</Label>
                    <Input
                      data-testid={`item-description-${index}`}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Product or service description"
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>Qty</Label>
                    <Input
                      data-testid={`item-quantity-${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Price (NOK)</Label>
                    <Input
                      data-testid={`item-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>VAT %</Label>
                    <Input
                      data-testid={`item-vat-${index}`}
                      type="number"
                      min="0"
                      max="100"
                      value={item.vat_rate}
                      onChange={(e) => handleItemChange(index, 'vat_rate', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-8 text-red-500 hover:text-red-600"
                    onClick={() => removeItem(index)}
                    disabled={formData.items.length === 1}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                data-testid="add-item-btn"
              >
                <Plus size={16} className="mr-2" />
                Add Item
              </Button>
            </div>

            {/* Total */}
            <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-slate-500">Estimated Total (incl. VAT)</p>
                <p className="heading text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(calculateTotal())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading text-lg">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="notes"
              data-testid="notes-input"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Payment terms, special instructions, etc."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link to="/invoices">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            data-testid="create-invoice-submit"
            className="bg-orange-500 hover:bg-orange-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Invoice'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
