import React, { useState, useEffect } from 'react';
import { getHSEDocuments, createHSEDocument, formatDate } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, ShieldCheck, Search, Loader2, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'policy', label: 'Policy' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'form', label: 'Form' },
  { value: 'report', label: 'Report' },
  { value: 'certificate', label: 'Certificate' }
];

export default function HSEPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    document_type: '',
    content: '',
    file_url: '',
    expiry_date: ''
  });

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    try {
      const docType = filter === 'all' ? null : filter;
      const data = await getHSEDocuments(docType);
      setDocuments(data);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDoc.title || !newDoc.document_type) {
      toast.error('Title and document type are required');
      return;
    }

    setCreating(true);
    try {
      await createHSEDocument({
        ...newDoc,
        expiry_date: newDoc.expiry_date ? new Date(newDoc.expiry_date).toISOString() : null
      });
      toast.success('Document created');
      setDialogOpen(false);
      setNewDoc({ title: '', document_type: '', content: '', file_url: '', expiry_date: '' });
      loadDocuments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expiryDate) <= thirtyDaysFromNow;
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
          <h1 className="heading text-3xl font-bold text-slate-900">HSE Documents</h1>
          <p className="text-slate-500 mt-1">Health, Safety & Environment documentation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-hse-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="heading">Add HSE Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hse-title">Title *</Label>
                <Input
                  id="hse-title"
                  data-testid="hse-title-input"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                  placeholder="Document title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select
                  value={newDoc.document_type}
                  onValueChange={(value) => setNewDoc({...newDoc, document_type: value})}
                >
                  <SelectTrigger data-testid="hse-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hse-content">Content</Label>
                <Textarea
                  id="hse-content"
                  data-testid="hse-content-input"
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
                  placeholder="Document content or summary"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hse-url">File URL</Label>
                <Input
                  id="hse-url"
                  data-testid="hse-url-input"
                  value={newDoc.file_url}
                  onChange={(e) => setNewDoc({...newDoc, file_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hse-expiry">Expiry Date</Label>
                <Input
                  id="hse-expiry"
                  data-testid="hse-expiry-input"
                  type="date"
                  value={newDoc.expiry_date}
                  onChange={(e) => setNewDoc({...newDoc, expiry_date: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Document
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
                data-testid="search-hse"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger data-testid="filter-hse" className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      {filteredDocuments.length === 0 ? (
        <Card className="card">
          <CardContent>
            <div className="empty-state py-16">
              <ShieldCheck size={48} className="text-slate-300" strokeWidth={1} />
              <h3 className="font-medium text-slate-900 mt-4">No documents found</h3>
              <p className="text-sm mt-1">Add your first HSE document to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card 
              key={doc.document_id} 
              className={`card ${isExpiringSoon(doc.expiry_date) ? 'border-amber-300 bg-amber-50' : ''}`}
              data-testid={`hse-doc-${doc.document_id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      doc.document_type === 'certificate' ? 'bg-green-100' :
                      doc.document_type === 'policy' ? 'bg-blue-100' :
                      doc.document_type === 'procedure' ? 'bg-purple-100' :
                      'bg-slate-100'
                    }`}>
                      <FileText size={20} className={
                        doc.document_type === 'certificate' ? 'text-green-500' :
                        doc.document_type === 'policy' ? 'text-blue-500' :
                        doc.document_type === 'procedure' ? 'text-purple-500' :
                        'text-slate-500'
                      } />
                    </div>
                    <div>
                      <CardTitle className="heading text-base">{doc.title}</CardTitle>
                      <p className="text-xs text-slate-500 capitalize">{doc.document_type}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.content && (
                  <p className="text-sm text-slate-600 line-clamp-2">{doc.content}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Created: {formatDate(doc.created_at)}</span>
                  {doc.expiry_date && (
                    <span className={`flex items-center gap-1 ${isExpiringSoon(doc.expiry_date) ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                      {isExpiringSoon(doc.expiry_date) && <AlertTriangle size={14} />}
                      Expires: {formatDate(doc.expiry_date)}
                    </span>
                  )}
                </div>
                {doc.file_url && (
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600"
                  >
                    View Document <ExternalLink size={14} />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
