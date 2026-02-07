# NordicForge - Product Requirements Document

## Overview
NordicForge is a multi-tenant business management platform combining features from Tripletex (invoicing, payroll, expense management) and Smartdok (checklists, HSE documentation, project management).

## Target Audience
Small to medium-sized businesses in Norway and other Nordic countries.

## Core Features

### 1. Authentication & Multi-tenancy
- Username/password authentication
- Multi-tenant architecture with isolated "Groups"
- Role-based access control (Owner, Admin, Member)

### 2. Invoicing Module
- Create, send, and track invoices
- Invoice status management (Draft, Sent, Paid, Overdue)
- Email notifications for invoice delivery

### 3. Payroll Module
- Employee management
- Payroll runs with history
- Monthly payroll calculations

### 4. Expenses Module
- Expense submission and approval workflow
- Receipt upload functionality (PDF, PNG, JPG)
- Category-based expense tracking

### 5. Projects Module
- Project creation and management
- Task tracking
- Project budgets and timelines

### 6. HSE Documents Module
- Health, Safety & Environment documentation
- Document upload and expiry tracking
- Document types: Policy, Procedure, Form, Report, Certificate

### 7. Form Builder (Checklists)
- Admin-created form templates
- Dynamic field types (text, number, checkbox, dropdown, date)
- Form submissions linked to projects
- PDF export of submissions

### 8. Settings & Configuration
- Organization management
- Team member invitation
- **SMTP Configuration** - Admins can configure email settings via UI
- **Language Selection** - English and Norwegian (Norsk) support

## Technical Architecture

### Backend (FastAPI + MongoDB)
- Python FastAPI server
- MongoDB for data persistence
- JWT-based session management (cookies)
- SMTP integration for email delivery

### Frontend (React + TailwindCSS)
- React 18 with React Router
- TailwindCSS + Shadcn/UI components
- Context-based state management
- i18n support with custom language context

### Database Schema
- `groups`: Organization data
- `users`: User accounts with role and group association
- `invoices`: Invoice records
- `employees`: Employee records
- `payroll_runs`: Payroll history
- `expenses`: Expense records
- `projects`: Project data
- `hse_documents`: HSE documentation
- `form_templates`: Form builder templates
- `form_submissions`: Completed form entries
- `email_configs`: SMTP configuration per group
- `files`: Uploaded file metadata

## Implemented Features (as of December 2025)

### Completed
- [x] User authentication (Register/Login)
- [x] Multi-tenant group management
- [x] Dashboard with overview metrics
- [x] Invoicing module (CRUD, status management)
- [x] Payroll module with run history
- [x] Expenses with receipt upload
- [x] Projects management
- [x] HSE Documents with file upload
- [x] Form Builder with PDF export
- [x] Dark theme (default)
- [x] SMTP configuration via Settings UI
- [x] Language selection (English/Norwegian)
- [x] All pages translated (i18n)

### Backlog
- [ ] Real-time invoice email delivery (requires SMTP credentials)
- [ ] Password reset functionality
- [ ] User profile editing
- [ ] Invoice PDF generation
- [ ] Expense approval notifications
- [ ] Dashboard analytics/charts
- [ ] Mobile-responsive improvements

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new organization and user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Settings
- `GET /api/settings/email` - Get SMTP configuration status
- `PUT /api/settings/email` - Save SMTP configuration
- `POST /api/settings/email/test` - Send test email

### Core Modules
- `/api/invoices` - Invoice management
- `/api/employees` - Employee management
- `/api/payroll-runs` - Payroll operations
- `/api/expenses` - Expense management
- `/api/projects` - Project management
- `/api/hse-documents` - HSE documentation
- `/api/forms/templates` - Form builder templates
- `/api/forms/submissions` - Form submissions

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=nordicforge
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://hse-invoice-hub.preview.emergentagent.com
```

## Testing
- Backend: pytest with async support
- Frontend: Playwright for UI testing
- Test coverage: Authentication, Settings, i18n, SMTP configuration

## Design Guidelines
- Dark theme with orange accent color
- Shadcn/UI component library
- Inter font family
- Consistent 8px spacing grid
- Status badges for visual state indication
