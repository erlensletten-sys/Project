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
