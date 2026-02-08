const API_URL = process.env.REACT_APP_BACKEND_URL;

async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

// Dashboard
export const getDashboardStats = () => fetchAPI('/api/dashboard/stats');

// Invoices
export const getInvoices = (status) => 
  fetchAPI(`/api/invoices${status ? `?status=${status}` : ''}`);

export const getInvoice = (id) => fetchAPI(`/api/invoices/${id}`);

export const createInvoice = (data) => 
  fetchAPI('/api/invoices', { method: 'POST', body: JSON.stringify(data) });

export const updateInvoiceStatus = (id, status) =>
  fetchAPI(`/api/invoices/${id}/status?status=${status}`, { method: 'PATCH' });

// Employees
export const getEmployees = (status) =>
  fetchAPI(`/api/employees${status ? `?status=${status}` : ''}`);

export const getEmployee = (id) => fetchAPI(`/api/employees/${id}`);

export const createEmployee = (data) =>
  fetchAPI('/api/employees', { method: 'POST', body: JSON.stringify(data) });

// Expenses
export const getExpenses = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.category) params.append('category', filters.category);
  const query = params.toString();
  return fetchAPI(`/api/expenses${query ? `?${query}` : ''}`);
};

export const createExpense = (data) =>
  fetchAPI('/api/expenses', { method: 'POST', body: JSON.stringify(data) });

export const updateExpenseStatus = (id, status) =>
  fetchAPI(`/api/expenses/${id}/status?status=${status}`, { method: 'PATCH' });

// Projects
export const getProjects = (status) =>
  fetchAPI(`/api/projects${status ? `?status=${status}` : ''}`);

export const getProject = (id) => fetchAPI(`/api/projects/${id}`);

export const createProject = (data) =>
  fetchAPI('/api/projects', { method: 'POST', body: JSON.stringify(data) });

export const createTask = (projectId, data) =>
  fetchAPI(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) });

export const updateTask = (projectId, taskId, status) =>
  fetchAPI(`/api/projects/${projectId}/tasks/${taskId}?status=${status}`, { method: 'PATCH' });

// Checklists
export const getChecklists = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.category) params.append('category', filters.category);
  const query = params.toString();
  return fetchAPI(`/api/checklists${query ? `?${query}` : ''}`);
};

export const createChecklist = (data) =>
  fetchAPI('/api/checklists', { method: 'POST', body: JSON.stringify(data) });

export const toggleChecklistItem = (checklistId, itemIndex) =>
  fetchAPI(`/api/checklists/${checklistId}/items/${itemIndex}`, { method: 'PATCH' });

// Form Builder
export const getFormTemplates = (category) =>
  fetchAPI(`/api/forms${category ? `?category=${category}` : ''}`);

export const getFormTemplate = (id) => fetchAPI(`/api/forms/${id}`);

export const createFormTemplate = (data) =>
  fetchAPI('/api/forms', { method: 'POST', body: JSON.stringify(data) });

export const deleteFormTemplate = (id) =>
  fetchAPI(`/api/forms/${id}`, { method: 'DELETE' });

export const getFormSubmissions = (formId, projectId) => {
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId);
  const query = params.toString();
  return fetchAPI(`/api/forms/${formId}/submissions${query ? `?${query}` : ''}`);
};

export const createFormSubmission = (formId, data) =>
  fetchAPI(`/api/forms/${formId}/submissions`, { method: 'POST', body: JSON.stringify(data) });

export const getSubmission = (id) => fetchAPI(`/api/submissions/${id}`);

export const getAllSubmissions = (projectId) =>
  fetchAPI(`/api/submissions${projectId ? `?project_id=${projectId}` : ''}`);

export const getSubmissionPdfUrl = (submissionId) =>
  `${API_URL}/api/submissions/${submissionId}/pdf`;

// HSE Documents
export const getHSEDocuments = (documentType) =>
  fetchAPI(`/api/hse-documents${documentType ? `?document_type=${documentType}` : ''}`);

export const getHSEDocument = (id) => fetchAPI(`/api/hse-documents/${id}`);

export const createHSEDocument = (data) =>
  fetchAPI('/api/hse-documents', { method: 'POST', body: JSON.stringify(data) });

// Group
export const getGroup = () => fetchAPI('/api/group');

export const getGroupMembers = () => fetchAPI('/api/group/members');

export const inviteUser = (data) =>
  fetchAPI('/api/group/invite', { method: 'POST', body: JSON.stringify(data) });

// Payroll Runs
export const getPayrollRuns = () => fetchAPI('/api/payroll/runs');

export const getPayrollRun = (id) => fetchAPI(`/api/payroll/runs/${id}`);

export const createPayrollRun = (data) =>
  fetchAPI('/api/payroll/runs', { method: 'POST', body: JSON.stringify(data) });

export const updatePayrollRunStatus = (id, status) =>
  fetchAPI(`/api/payroll/runs/${id}/status?status=${status}`, { method: 'PATCH' });

// File Upload
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }
  
  return response.json();
};

// Reports
export const getPaymentSummary = (period = 'month') =>
  fetchAPI(`/api/reports/payment-summary?period=${period}`);

// Invoice PDF
export const getInvoicePdfUrl = (invoiceId) =>
  `${API_URL}/api/invoices/${invoiceId}/pdf`;

// Logo
export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_URL}/api/settings/logo`, {
    method: 'POST', credentials: 'include', body: formData
  });
  if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.detail || 'Upload failed'); }
  return response.json();
};

export const removeLogo = () =>
  fetchAPI('/api/settings/logo', { method: 'DELETE' });

// Super Admin
export const getSuperAdminStats = () => fetchAPI('/api/superadmin/stats');
export const getSuperAdminGroups = () => fetchAPI('/api/superadmin/groups');
export const getSuperAdminUsers = (groupId) =>
  fetchAPI(`/api/superadmin/users${groupId ? `?group_id=${groupId}` : ''}`);
export const toggleGroupFeatures = (groupId, disabledFeatures) =>
  fetchAPI(`/api/superadmin/groups/${groupId}/features`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disabled_features: disabledFeatures })
  });
export const banUser = (userId, banned) =>
  fetchAPI(`/api/superadmin/users/${userId}/ban`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ banned })
  });

// Payroll Earnings
export const getPayrollEarnings = (month, year) =>
  fetchAPI(`/api/payroll/earnings?month=${month}&year=${year}`);

// Invoice Email
export const sendInvoice = (invoiceId, recipientEmail = null) =>
  fetchAPI(`/api/invoices/${invoiceId}/send`, {
    method: 'POST',
    body: JSON.stringify({ recipient_email: recipientEmail })
  });

// Work Logs (Akkord/Piece-rate)
export const getWorkLogs = (projectId = null, userId = null) => {
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId);
  if (userId) params.append('user_id', userId);
  const query = params.toString();
  return fetchAPI(`/api/work-logs${query ? `?${query}` : ''}`);
};

export const getMyWorkLogs = (projectId = null) => {
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId);
  const query = params.toString();
  return fetchAPI(`/api/work-logs/my${query ? `?${query}` : ''}`);
};

export const createWorkLog = (data) =>
  fetchAPI('/api/work-logs', { method: 'POST', body: JSON.stringify(data) });

export const deleteWorkLog = (workId) =>
  fetchAPI(`/api/work-logs/${workId}`, { method: 'DELETE' });

export const getProjectWorkSummary = (projectId) =>
  fetchAPI(`/api/work-logs/summary/project/${projectId}`);

export const getAkkordPricing = () => fetchAPI('/api/akkord/pricing');

// Group Settings
export const getGroupSettings = () => fetchAPI('/api/settings/group');

export const updateGroupSettings = (data) =>
  fetchAPI('/api/settings/group', { method: 'PUT', body: JSON.stringify(data) });

export const getGroupEmployees = () => fetchAPI('/api/group/employees');

// Utility
export const formatCurrency = (amount, currency = 'NOK') => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
