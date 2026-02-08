# ProjectDash - Product Requirements Document

## Overview
ProjectDash is a multi-tenant business management platform combining invoicing, payroll, expense management, checklists, HSE documentation, and project management.

## Target Audience
Small to medium-sized businesses in Norway and Nordic countries.

## Core Features

### 1. Authentication & Multi-tenancy
- Username/password authentication, Password Reset via Email (Brevo SMTP)
- Multi-tenant architecture with isolated "Groups"
- Role-based access control (Owner, Admin, HR, Member, Employee)

### 2. User Management
- Owner > Admin > HR > Member > Employee hierarchy
- Create, invite (with email), edit roles, deactivate/reactivate
- Payroll Sync: Creating/inviting a user auto-creates employee record

### 3. Dashboard Analytics
- Admin/Owner/HR: Financial margins, revenue vs costs
- Employee: Personal earnings, hours, area

### 4. Work Log (Akkord + Hourly)
- Akkord (Piece-Rate): Configurable per group (enable/disable toggle)
- Hourly: Always available, configurable hourly rate
- Payment Sharing: `worker_payment = (worker_hours / total_hours) * total_payment`

### 5. Projects
- Full CRUD with tasks (To Do / Completed)
- **Checklists tab**: Shows form submissions linked to the project with detail view

### 6. Invoicing, Payroll, Expenses, HSE, Forms
- Full CRUD, invoice email sending, form builder with PDF export
- HSE document management with file uploads

### 7. Settings
- Akkord toggle, hourly rate, SMTP config, theme, language

## Completed Features
- [x] User auth (Register/Login/Password Reset) with Brevo SMTP
- [x] Multi-tenant group management
- [x] Dashboard with role-based analytics
- [x] Invoicing with email sending
- [x] Payroll module
- [x] Expenses with receipt upload
- [x] Projects with tasks
- [x] HSE Documents with file upload
- [x] Form Builder with PDF export
- [x] Theme system (Dark/Light + 6 accent colors)
- [x] Language selection (English/Norwegian)
- [x] Work Log (Akkord + Hourly)
- [x] User Management with all roles
- [x] Role-based permissions (frontend + backend) - Feb 2026
- [x] Form fillability fix - Feb 2026
- [x] Form-project association fix - Feb 2026
- [x] User creation syncs to payroll employees - Feb 2026
- [x] Invitation emails with credentials - Feb 2026
- [x] Invoice sending via SMTP fixed - Feb 2026
- [x] Akkord Enable/Disable per Group - Feb 2026
- [x] Akkord Payment Sharing (proportional by hours) - Feb 2026
- [x] **Submitted Checklists in Project Detail (Tabs)** - Feb 2026

## In Progress
- [ ] Professional Login/Register page redesign (with undraw.co illustrations)

## Backlog
- [ ] HSE PDF Upload and viewing
- [ ] HTML Email Templates (pretty design)
- [ ] Code cleanup (remove old auth files)
- [ ] Invoice PDF generation
- [ ] Mobile-responsive improvements

## Test Accounts
- Admin/Owner: testadmin@test.com / TestPass123!
- Employee: employee@test.com / TestPass123!
- Test Project: prj_868390aa0a4a
- Test Form: frm_44821bc2e793
