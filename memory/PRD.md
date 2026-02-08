# ProjectDash - Product Requirements Document

## Overview
ProjectDash is a multi-tenant business management platform combining invoicing, payroll, expense management, checklists, HSE documentation, and project management.

## Target Audience
Small to medium-sized businesses in Norway and Nordic countries.

## Core Features

### 1. Authentication & Multi-tenancy
- Username/password authentication
- Password Reset via Email (Brevo SMTP)
- Multi-tenant architecture with isolated "Groups"
- Role-based access control (Owner, Admin, HR, Member, Employee)

### 2. User Management
- **Role Hierarchy:**
  - **Owner**: Full access to all features
  - **Admin**: Manage users, settings, forms, projects, invoices
  - **HR**: Manage employees, view payroll, approve expenses
  - **Member**: Create invoices, manage projects, basic access
  - **Employee**: View projects, fill checklists, add expenses, log work
- **User Operations:** Create, invite (with email), edit roles, deactivate/reactivate
- **Payroll Sync:** Creating/inviting a user auto-creates an employee record for payroll

### 3. Dashboard Analytics
- Admin/Owner/HR: Financial margins, revenue vs costs, top producers
- Employee: Personal earnings, hours, area completed, averages, median income
- Period Selector: Week / Month / Year

### 4. Work Log (Akkord + Hourly + Per-Employee Hours)
- Piece Rate (Akkord) and Hourly work types
- Per-employee hour logging with earnings calculation

### 5. Invoicing, Payroll, Expenses, Projects, HSE, Forms
- Full CRUD for all modules
- Form Builder with dynamic fields and PDF export
- HSE document management with file uploads
- Invoice email sending (via SMTP)

### 6. Settings & Configuration
- Global SMTP, per-group sender name
- Hourly rate configuration
- Theme (Dark/Light + accent colors including Black)
- Language (English/Norwegian)

## Technical Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React 18 + TailwindCSS + Shadcn/UI
- **Email**: Brevo SMTP integration
- **Auth**: Session-based (cookies)

## API Endpoints
- Auth: /api/auth/register, login, logout, me, forgot-password, reset-password
- Dashboard: /api/analytics/dashboard
- User Management: /api/group/users (CRUD), /api/group/invite (sends email)
- Invoices: /api/invoices (restricted to member+), /api/invoices/{id}/send (sends email)
- Payroll: /api/payroll/runs (restricted to HR+)
- Employees: /api/employees (restricted to HR+)
- Settings: /api/settings/group, /api/settings/email
- Work Logs: /api/work-logs
- Forms: /api/forms, /api/forms/{id}/submissions
- HSE: /api/hse-documents

## Completed Features
- [x] User authentication (Register/Login/Password Reset)
- [x] Multi-tenant group management
- [x] Dashboard with role-based analytics
- [x] Invoicing module with email sending
- [x] Payroll module
- [x] Expenses with receipt upload
- [x] Projects management with tasks
- [x] HSE Documents with file upload
- [x] Form Builder with PDF export
- [x] Theme system (Dark/Light + 6 accent colors)
- [x] Global SMTP + per-group sender name
- [x] Language selection (English/Norwegian)
- [x] Work Log (Akkord + Hourly + per-employee hours)
- [x] User Management with all roles
- [x] **Role-based permissions (frontend + backend)** - Feb 2026
- [x] **Form fillability fix** - Feb 2026
- [x] **Form-project association fix** - Feb 2026
- [x] **User creation syncs to payroll employees** - Feb 2026
- [x] **Invitation emails with credentials** - Feb 2026
- [x] **Invoice sending via SMTP fixed** - Feb 2026

## In Progress
- [ ] Professional Login/Register page redesign (V2 files created)

## Backlog
- [ ] HSE PDF Upload and viewing
- [ ] HTML Email Templates (pretty design)
- [ ] Code cleanup (remove old auth files)
- [ ] Invoice PDF generation
- [ ] Mobile-responsive improvements

## Test Accounts
- **Admin/Owner**: testadmin@test.com / TestPass123!
- **Employee**: employee@test.com / TestPass123!
