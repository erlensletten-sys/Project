import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n';
import { 
  getFormTemplates, 
  createFormTemplate, 
  deleteFormTemplate,
  getFormSubmissions, 
  createFormSubmission,
  getProjects,
  getAllSubmissions,
  getSubmissionPdfUrl
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { 
  Plus, 
  ClipboardList, 
  Search, 
  Loader2, 
  Trash2, 
  FileText, 
  Download,
  Send,
  ChevronRight,
  GripVertical,
  FolderKanban
} from 'lucide-react';
import { toast } from 'sonner';

export default function ChecklistsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  
  const FIELD_TYPES = [
    { value: 'text', label: t('forms.shortText') },
    { value: 'textarea', label: t('forms.longText') },
    { value: 'number', label: t('forms.number') },
    { value: 'checkbox', label: t('forms.checkbox') },
    { value: 'select', label: t('forms.dropdown') },
    { value: 'date', label: t('forms.dateField') },
  ];

  const CATEGORIES = [
    { value: 'general', label: t('forms.general') },
    { value: 'safety', label: t('forms.safety') },
    { value: 'quality', label: t('forms.quality') },
    { value: 'inspection', label: t('forms.inspection') }
  ];
  
  const [activeTab, setActiveTab] = useState(isAdmin ? 'templates' : 'submissions');
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create Form Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    category: 'general',
    fields: [{ field_type: 'text', label: '', required: false, options: [], placeholder: '' }]
  });
  
  // Fill Form Dialog
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [filling, setFilling] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [formsData, submissionsData, projectsData] = await Promise.all([
        getFormTemplates(),
        getAllSubmissions(),
        getProjects()
      ]);
      setForms(formsData);
      setSubmissions(submissionsData);
      setProjects(projectsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Form builder functions
  const addField = () => {
    setNewForm({
      ...newForm,
      fields: [...newForm.fields, { field_type: 'text', label: '', required: false, options: [], placeholder: '' }]
    });
  };

  const removeField = (index) => {
    if (newForm.fields.length === 1) return;
    setNewForm({
      ...newForm,
      fields: newForm.fields.filter((_, i) => i !== index)
    });
  };

  const updateField = (index, key, value) => {
    const fields = [...newForm.fields];
    fields[index][key] = value;
    setNewForm({ ...newForm, fields });
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    
    if (!newForm.title) {
      toast.error('Form title is required');
      return;
    }
    
    const validFields = newForm.fields.filter(f => f.label.trim());
    if (validFields.length === 0) {
      toast.error('Add at least one field');
      return;
    }

    setCreating(true);
    try {
      await createFormTemplate({
        ...newForm,
        fields: validFields
      });
      toast.success('Form template created');
      setCreateDialogOpen(false);
      setNewForm({
        title: '',
        description: '',
        category: 'general',
        fields: [{ field_type: 'text', label: '', required: false, options: [], placeholder: '' }]
      });
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form template?')) return;
    
    try {
      await deleteFormTemplate(formId);
      toast.success('Form template deleted');
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Fill form functions
  const openFillDialog = (form) => {
    setSelectedForm(form);
    setFormResponses({});
    setSelectedProjectId('');
    setFillDialogOpen(true);
  };

  const handleResponseChange = (fieldId, value) => {
    setFormResponses({ ...formResponses, [fieldId]: value });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    
    if (!selectedForm) return;

    setFilling(true);
    try {
      await createFormSubmission(selectedForm.form_id, {
        form_id: selectedForm.form_id,
        project_id: selectedProjectId || null,
        responses: formResponses
      });
      toast.success('Form submitted successfully');
      setFillDialogOpen(false);
      setSelectedForm(null);
      setFormResponses({});
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFilling(false);
    }
  };

  const handleDownloadPdf = (submissionId) => {
    const url = getSubmissionPdfUrl(submissionId);
    window.open(url, '_blank');
  };

  const filteredForms = forms.filter(f => 
    f.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(s =>
    s.form_title?.toLowerCase().includes(search.toLowerCase()) ||
    s.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
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
          <h1 className="heading text-3xl font-bold">{t('forms.title')}</h1>
          <p className="text-slate-400 mt-1">
            {isAdmin ? t('forms.subtitle') : t('forms.subtitleUser')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700">
          {isAdmin && (
            <TabsTrigger value="templates" data-testid="tab-templates" className="data-[state=active]:bg-orange-500">
              <ClipboardList size={16} className="mr-2" />
              {t('forms.formTemplates')}
            </TabsTrigger>
          )}
          <TabsTrigger value="submissions" data-testid="tab-submissions" className="data-[state=active]:bg-orange-500">
            <FileText size={16} className="mr-2" />
            {t('forms.submissions')}
          </TabsTrigger>
          <TabsTrigger value="fill" data-testid="tab-fill" className="data-[state=active]:bg-orange-500">
            <Send size={16} className="mr-2" />
            {t('forms.fillForm')}
          </TabsTrigger>
        </TabsList>

        {/* Form Templates Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  data-testid="search-forms"
                  placeholder={t('common.search') + '...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700"
                />
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="create-form-btn" className="bg-orange-500 hover:bg-orange-600">
                    <Plus size={16} className="mr-2" />
                    {t('forms.createForm')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="heading">{t('forms.createForm')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateForm} className="space-y-6">
                    {/* Form Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('forms.formTitle')} *</Label>
                        <Input
                          data-testid="form-title-input"
                          value={newForm.title}
                          onChange={(e) => setNewForm({...newForm, title: e.target.value})}
                          placeholder={t('forms.formTitle')}
                          required
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('forms.category')}</Label>
                        <Select
                          value={newForm.category}
                          onValueChange={(value) => setNewForm({...newForm, category: value})}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue />
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
                      <Label>{t('common.description')}</Label>
                      <Textarea
                        data-testid="form-description-input"
                        value={newForm.description}
                        onChange={(e) => setNewForm({...newForm, description: e.target.value})}
                        placeholder={t('common.description')}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>

                    {/* Field Builder */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg">{t('forms.fields')}</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addField}>
                          <Plus size={14} className="mr-1" />
                          {t('forms.addField')}
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {newForm.fields.map((field, index) => (
                          <div 
                            key={index} 
                            className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical size={16} className="text-slate-500" />
                              <span className="text-sm text-slate-400">{t('forms.fields')} {index + 1}</span>
                              <div className="flex-1" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(index)}
                                disabled={newForm.fields.length === 1}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">{t('forms.fieldType')}</Label>
                                <Select
                                  value={field.field_type}
                                  onValueChange={(value) => updateField(index, 'field_type', value)}
                                >
                                  <SelectTrigger className="bg-slate-700 border-slate-600 h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_TYPES.map(type => (
                                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="col-span-2 space-y-1">
                                <Label className="text-xs">{t('forms.fieldLabel')} *</Label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(index, 'label', e.target.value)}
                                  placeholder={t('forms.fieldLabel')}
                                  className="bg-slate-700 border-slate-600 h-9"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={field.required}
                                  onCheckedChange={(checked) => updateField(index, 'required', checked)}
                                />
                                <span className="text-sm">{t('common.required')}</span>
                              </label>
                              
                              {field.field_type === 'select' && (
                                <div className="flex-1">
                                  <Input
                                    placeholder={t('forms.options')}
                                    value={field.options?.join(', ') || ''}
                                    onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(o => o.trim()).filter(Boolean))}
                                    className="bg-slate-700 border-slate-600 h-8 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {t('forms.createForm')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Form Templates List */}
            {filteredForms.length === 0 ? (
              <Card className="card">
                <CardContent>
                  <div className="empty-state py-16">
                    <ClipboardList size={48} className="text-slate-600" strokeWidth={1} />
                    <h3 className="font-medium mt-4">{t('forms.noForms')}</h3>
                    <p className="text-sm mt-1 text-slate-500">{t('forms.createFirst')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredForms.map((form) => (
                  <Card key={form.form_id} className="card" data-testid={`form-${form.form_id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="heading text-base">{form.title}</CardTitle>
                          <p className="text-xs text-slate-500 capitalize mt-1">{getCategoryLabel(form.category)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteForm(form.form_id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {form.description && (
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{form.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{form.fields?.length || 0} {t('forms.fields').toLowerCase()}</span>
                        <span className="text-slate-500">{form.submission_count || 0} {t('forms.submissions').toLowerCase()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              data-testid="search-submissions"
              placeholder={t('common.search') + '...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700"
            />
          </div>

          {filteredSubmissions.length === 0 ? (
            <Card className="card">
              <CardContent>
                <div className="empty-state py-16">
                  <FileText size={48} className="text-slate-600" strokeWidth={1} />
                  <h3 className="font-medium mt-4">{t('forms.noSubmissions')}</h3>
                  <p className="text-sm mt-1 text-slate-500">{t('forms.fillFirst')}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="card">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('forms.formTitle')}</th>
                      <th>{t('nav.projects')}</th>
                      <th>{t('forms.submittedBy')}</th>
                      <th>{t('common.date')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub.submission_id} data-testid={`submission-${sub.submission_id}`}>
                        <td className="font-medium">{sub.form_title}</td>
                        <td>
                          {sub.project_name ? (
                            <span className="flex items-center gap-1 text-purple-400">
                              <FolderKanban size={14} />
                              {sub.project_name}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="text-slate-400">{sub.submitted_by_name}</td>
                        <td className="text-slate-400">
                          {new Date(sub.created_at).toLocaleDateString(language === 'nb' ? 'nb-NO' : 'en-GB')}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadPdf(sub.submission_id)}
                            className="text-orange-400 hover:text-orange-300"
                            data-testid={`download-pdf-${sub.submission_id}`}
                          >
                            <Download size={16} className="mr-1" />
                            {t('forms.downloadPdf')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fill Form Tab */}
        <TabsContent value="fill" className="space-y-4">
          {forms.length === 0 ? (
            <Card className="card">
              <CardContent>
                <div className="empty-state py-16">
                  <ClipboardList size={48} className="text-slate-600" strokeWidth={1} />
                  <h3 className="font-medium mt-4">{t('forms.noFormsAvailable')}</h3>
                  <p className="text-sm mt-1 text-slate-500">
                    {isAdmin ? t('forms.createFirst') : t('forms.noFormsCreated')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.filter(f => f.is_active !== false).map((form) => (
                <Card 
                  key={form.form_id} 
                  className="card hover:border-orange-500/50 cursor-pointer transition-colors"
                  onClick={() => openFillDialog(form)}
                  data-testid={`fill-form-${form.form_id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="heading font-semibold">{form.title}</h3>
                        <p className="text-xs text-slate-500 capitalize mt-1">{getCategoryLabel(form.category)}</p>
                        {form.description && (
                          <p className="text-sm text-slate-400 mt-2 line-clamp-2">{form.description}</p>
                        )}
                        <p className="text-sm text-slate-500 mt-3">{form.fields?.length || 0} {t('forms.fields').toLowerCase()}</p>
                      </div>
                      <ChevronRight className="text-orange-400" size={20} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Fill Form Dialog */}
      <Dialog open={fillDialogOpen} onOpenChange={setFillDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading">{selectedForm?.title}</DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <form onSubmit={handleSubmitForm} className="space-y-6">
              {selectedForm.description && (
                <p className="text-sm text-slate-400">{selectedForm.description}</p>
              )}

              {/* Project Selection */}
              <div className="space-y-2">
                <Label>{t('forms.linkToProject')}</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger data-testid="select-project" className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder={t('forms.selectProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('forms.noProject')}</SelectItem>
                    {projects.map(proj => (
                      <SelectItem key={proj.project_id} value={proj.project_id}>
                        {proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-slate-700 pt-4" />

              {/* Dynamic Fields */}
              {selectedForm.fields?.map((field, index) => (
                <div key={field.field_id || index} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </Label>
                  
                  {field.field_type === 'text' && (
                    <Input
                      data-testid={`field-${field.field_id}`}
                      value={formResponses[field.field_id] || ''}
                      onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
                      placeholder={field.placeholder || ''}
                      required={field.required}
                      className="bg-slate-800 border-slate-700"
                    />
                  )}
                  
                  {field.field_type === 'textarea' && (
                    <Textarea
                      data-testid={`field-${field.field_id}`}
                      value={formResponses[field.field_id] || ''}
                      onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
                      placeholder={field.placeholder || ''}
                      required={field.required}
                      className="bg-slate-800 border-slate-700"
                    />
                  )}
                  
                  {field.field_type === 'number' && (
                    <Input
                      data-testid={`field-${field.field_id}`}
                      type="number"
                      value={formResponses[field.field_id] || ''}
                      onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
                      placeholder={field.placeholder || ''}
                      required={field.required}
                      className="bg-slate-800 border-slate-700"
                    />
                  )}
                  
                  {field.field_type === 'checkbox' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        data-testid={`field-${field.field_id}`}
                        checked={formResponses[field.field_id] || false}
                        onCheckedChange={(checked) => handleResponseChange(field.field_id, checked)}
                      />
                      <span className="text-sm text-slate-400">{t('common.yes')}</span>
                    </label>
                  )}
                  
                  {field.field_type === 'select' && (
                    <Select
                      value={formResponses[field.field_id] || ''}
                      onValueChange={(value) => handleResponseChange(field.field_id, value)}
                    >
                      <SelectTrigger data-testid={`field-${field.field_id}`} className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder={t('common.filter')} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt, i) => (
                          <SelectItem key={i} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {field.field_type === 'date' && (
                    <Input
                      data-testid={`field-${field.field_id}`}
                      type="date"
                      value={formResponses[field.field_id] || ''}
                      onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
                      required={field.required}
                      className="bg-slate-800 border-slate-700"
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <Button type="button" variant="outline" onClick={() => setFillDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={filling}>
                  {filling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('common.submit')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
