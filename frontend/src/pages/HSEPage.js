import React, { useState, useEffect, useRef } from 'react';
import { getHSEDocuments, createHSEDocument, uploadFile, formatDate } from '@/lib/api';
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
import { Plus, ShieldCheck, Search, Loader2, FileText, AlertTriangle, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'policy', label: 'Policy' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'form', label: 'Form' },
  { value: 'report', label: 'Report' },
  { value: 'certificate', label: 'Certificate' }
];

export default function HSEPage() {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large (max 10MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      const result = await uploadFile(selectedFile);
      setNewDoc({...newDoc, file_url: result.file_url});
      setSelectedFile(null);
      toast.success('File uploaded');
    } catch (error) {
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
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
      setSelectedFile(null);
      loadDocuments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setNewDoc({ title: '', document_type: '', content: '', file_url: '', expiry_date: '' });
    setSelectedFile(null);
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
          <h1 className="heading text-3xl font-bold">HSE Documents</h1>
          <p className="text-slate-400 mt-1">Health, Safety & Environment documentation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-hse-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
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
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select
                  value={newDoc.document_type}
                  onValueChange={(value) => setNewDoc({...newDoc, document_type: value})}
                >
                  <SelectTrigger data-testid="hse-type-select" className="bg-slate-800 border-slate-700">
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
                <Label htmlFor="hse-content">Content / Summary</Label>
                <Textarea
                  id="hse-content"
                  data-testid="hse-content-input"
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
                  placeholder="Document content or summary"
                  rows={4}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Attach File</Label>
                <div className="space-y-2">
                  {newDoc.file_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <FileText size={16} className="text-green-400" />
                      <span className="text-sm text-green-400 flex-1">File uploaded</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewDoc({...newDoc, file_url: ''})}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
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
                        {selectedFile ? selectedFile.name : 'Select File'}
                      </Button>
                      {selectedFile && (
                        <Button
                          type="button"
                          onClick={handleUploadFile}
                          disabled={uploading}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Supported: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 10MB)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hse-expiry">Expiry Date</Label>
                <Input
                  id="hse-expiry"
                  data-testid="hse-expiry-input"
                  type="date"
                  value={newDoc.expiry_date}
                  onChange={(e) => setNewDoc({...newDoc, expiry_date: e.target.value})}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
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
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger data-testid="filter-hse" className="w-[180px] bg-slate-800 border-slate-700">
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
              <ShieldCheck size={48} className="text-slate-600" strokeWidth={1} />
              <h3 className="font-medium mt-4">No documents found</h3>
              <p className="text-sm mt-1 text-slate-500">Add your first HSE document to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card 
              key={doc.document_id} 
              className={`card ${isExpiringSoon(doc.expiry_date) ? 'border-amber-500/50' : ''}`}
              data-testid={`hse-doc-${doc.document_id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      doc.document_type === 'certificate' ? 'bg-green-500/20' :
                      doc.document_type === 'policy' ? 'bg-blue-500/20' :
                      doc.document_type === 'procedure' ? 'bg-purple-500/20' :
                      'bg-slate-700'
                    }`}>
                      <FileText size={20} className={
                        doc.document_type === 'certificate' ? 'text-green-400' :
                        doc.document_type === 'policy' ? 'text-blue-400' :
                        doc.document_type === 'procedure' ? 'text-purple-400' :
                        'text-slate-400'
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
                  <p className="text-sm text-slate-400 line-clamp-2">{doc.content}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Created: {formatDate(doc.created_at)}</span>
                  {doc.expiry_date && (
                    <span className={`flex items-center gap-1 ${isExpiringSoon(doc.expiry_date) ? 'text-amber-400 font-medium' : 'text-slate-500'}`}>
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
                    className="inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
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
