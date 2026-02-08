# ProjectDash - Product Requirements Document

## Overview
ProjectDash (formerly NordicForge) is a multi-tenant business management platform combining features from Tripletex (invoicing, payroll, expense management) and Smartdok (checklists, HSE documentation, project management).

## Target Audience
Small to medium-sized businesses in Norway and other Nordic countries.

## Core Features

### 1. Authentication & Multi-tenancy
- Username/password authentication
- Multi-tenant architecture with isolated "Groups"
- Role-based access control (Owner, Admin, HR, Member, Employee)

### 2. User Management (NEW - Feb 2026) ✅
- **Role Hierarchy:**
  - **Owner**: Full access to all features
  - **Admin**: Manage users, settings, forms, projects, invoices
  - **HR**: Manage employees, view payroll, approve expenses
  - **Member**: Create invoices, manage projects, basic access
  - **Employee**: View projects, fill checklists, add receipts/expenses, log work
- **User Operations:**
  - Create users directly with password
  - Invite users (generates temporary password)
  - Update user roles
  - Deactivate/reactivate users
  - Filter by active/inactive status

### 3. Invoicing Module
- Create, send, and track invoices
- Invoice status management (Draft, Sent, Paid, Overdue)
- Email notifications for invoice delivery

### 4. Payroll Module
- Employee management
- Payroll runs with history
- Monthly payroll calculations

### 5. Expenses Module
- Expense submission and approval workflow
- Receipt upload functionality (PDF, PNG, JPG)
- Category-based expense tracking

### 6. Projects Module
- Project creation and management
- Task tracking
- Project budgets and timelines

### 7. HSE Documents Module
- Health, Safety & Environment documentation
- Document upload and expiry tracking
- Document types: Policy, Procedure, Form, Report, Certificate

### 8. Form Builder (Checklists)
- Admin-created form templates
- Dynamic field types (text, number, checkbox, dropdown, date)
- Form submissions linked to projects
- PDF export of submissions

### 9. Work Log (Enhanced - Akkord + Hourly) ✅
- **Work Types:**
  - **Piece Rate (Akkord)**: Based on area (m²) with base operations and add-ons
  - **Hourly Work**: Based on hours × configurable hourly rate
- **Base Operations** (Akkord only):
  - Avtrekk: 18 kr/m²
  - Skuring: 22 kr/m²
  - Glatting: 26 kr/m²
- **Add-ons** (Akkord only):
  - Sikatop x1: +3 kr/m²
  - Sikatop x2: +6 kr/m²
  - Tykkelse 30-40cm: +3 kr/m²
  - Tykkelse 40-50cm: +5 kr/m²
  - Ashford: +10 kr/m²
  - Plastikk: +5 kr/m²
- **Worker Assignment**: Multiple employees can be assigned to a work log entry
- **Hourly Rate Setting**: Group admins can configure the default hourly rate

### 10. Settings & Configuration
- Organization management
- Team member invitation and user management
- **SMTP Configuration** - Global SMTP settings shared across all groups
- **Per-Group Sender Name** - Each group can customize their sender name
- **Hourly Rate Setting** - Admins can set default hourly rate
- **Theme Selection** - Dark/Light mode with accent colors (Black, Green, Yellow, Purple, Blue, Orange)
- **Language Selection** - English and Norwegian (Norsk) support

## Technical Architecture

### Backend (FastAPI + MongoDB)
- Python FastAPI server
- MongoDB for data persistence
- Session-based authentication (cookies)
- SMTP integration for email delivery

### Frontend (React + TailwindCSS)
- React 18 with React Router
- TailwindCSS + Shadcn/UI components
- Context-based state management
- i18n support with custom language context
- Theme provider for dark/light modes

### Database Schema
- `groups`: Organization data (includes hourly_rate, sender_name)
- `users`: User accounts with role, group association, is_active status
- `invoices`: Invoice records
- `employees`: Employee records
- `payroll_runs`: Payroll history
- `expenses`: Expense records
- `projects`: Project data
- `hse_documents`: HSE documentation
- `form_templates`: Form builder templates
- `form_submissions`: Completed form entries
- `email_configs`: Global SMTP configuration (group_id: "__global__")
- `work_logs`: Work entries (akkord and hourly)
- `files`: Uploaded file metadata

## Implemented Features (as of February 2026)

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
- [x] Theme system (Dark/Light mode + accent colors including Black)
- [x] Global SMTP configuration via Settings UI
- [x] Per-group sender name customization
- [x] Language selection (English/Norwegian)
- [x] All pages translated (i18n)
- [x] **Work Log - Akkord (piece-rate) work type**
- [x] **Work Log - Hourly work type**
- [x] **Work Log - Worker assignment**
- [x] **Group Settings - Hourly rate configuration**
- [x] Application rebranded to "ProjectDash"
- [x] **User Management - Create users directly**
- [x] **User Management - Role hierarchy (Owner/Admin/HR/Member/Employee)**
- [x] **User Management - Update user roles**
- [x] **User Management - Deactivate/activate users**

### Backlog
- [ ] Per-employee hour logging (individual hours per worker on single entry)
- [ ] Admin form generation (clarification needed)
- [ ] Real-time invoice email delivery
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

### User Management (NEW)
- `POST /api/group/users` - Create user directly with password and role
- `GET /api/group/users` - Get all users (filter by include_inactive)
- `PUT /api/group/users/{id}/role` - Update user role
- `PUT /api/group/users/{id}/deactivate` - Deactivate user
- `PUT /api/group/users/{id}/activate` - Reactivate user
- `POST /api/group/invite` - Invite user (generates temp password)

### Settings
- `GET /api/settings/email` - Get SMTP configuration status
- `PUT /api/settings/email` - Save global SMTP configuration
- `PUT /api/settings/email/sender-name` - Update per-group sender name
- `POST /api/settings/email/test` - Send test email
- `GET /api/settings/group` - Get group settings (hourly_rate)
- `PUT /api/settings/group` - Update group settings

### Group
- `GET /api/group` - Get current user's group info
- `GET /api/group/members` - Get group members
- `GET /api/group/employees` - Get all users in group (for worker selection)

### Work Logs
- `GET /api/work-logs` - Get all work logs (admin)
- `GET /api/work-logs/my` - Get current user's work logs
- `POST /api/work-logs` - Create work log entry (akkord or hourly)
- `DELETE /api/work-logs/{id}` - Delete work log
- `GET /api/work-logs/summary/project/{id}` - Project work summary
- `GET /api/akkord/pricing` - Get pricing structure

### Core Modules
- `/api/invoices` - Invoice management
- `/api/employees` - Employee management
- `/api/payroll-runs` - Payroll operations
- `/api/expenses` - Expense management
- `/api/projects` - Project management
- `/api/hse-documents` - HSE documentation
- `/api/forms/templates` - Form builder templates
- `/api/forms/submissions` - Form submissions

## Role Permissions

| Permission | Owner | Admin | HR | Member | Employee |
|------------|-------|-------|-------|--------|----------|
| View Projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fill Checklists | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add Expenses | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log Work | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Data | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Invoices | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Projects | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Employees | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Payroll | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Expenses | ✅ | ✅ | ✅ | ❌ | ❌ |
| View All Work Logs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Forms | ✅ | ✅ | ❌ | ❌ | ❌ |

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=nordicforge
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://piece-rate-v2.preview.emergentagent.com
```

## Test Accounts
- **Admin/Owner**: test@projectdash.me / Test1234!
- **Employee**: john.employee@projectdash.me / Password123!
- **HR**: sarah.hr@projectdash.me / Password123!
