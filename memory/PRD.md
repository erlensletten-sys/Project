# ProjectDash - Product Requirements Document

## Overview
ProjectDash is a multi-tenant business management platform for invoicing, payroll, expenses, checklists, HSE, and project management.

## Core Features (All Implemented)

### Authentication & Multi-tenancy
- Register/Login/Password Reset with Brevo SMTP
- Professional split-layout auth pages with illustrations
- Role-based access (Owner > Admin > HR > Member > Employee)

### User Management  
- Create, invite (with styled email), edit roles, deactivate/reactivate
- Payroll sync on user creation

### Dashboard Analytics
- Admin/HR: Financial margins, revenue vs costs
- Employee: Personal earnings, hours, productivity

### Work Log
- Akkord (Piece-Rate): Toggle on/off per group in Settings
- Hourly: Configurable rate
- Payment sharing: proportional by hours worked

### Projects
- CRUD with tasks (To Do / Completed)
- Checklists tab showing linked form submissions with detail view

### Invoicing, Payroll, Expenses
- Full CRUD, invoice email sending with styled HTML templates

### Forms & Checklists
- Dynamic form builder, PDF export, project linking

### HSE Documents
- Document management with file upload
- Inline PDF viewer (iframe)

### Settings
- Akkord toggle, hourly rate, SMTP config
- Theme (Dark/Light + accent colors), Language (EN/NO)

### Email Templates
- Shared wrapper with ProjectDash branding
- Styled templates: invoice, password reset, user invitation

## Technical Stack
- Backend: FastAPI + MongoDB
- Frontend: React 18 + TailwindCSS + Shadcn/UI
- Email: Brevo SMTP
- Auth: Session-based cookies

## All Completed Features
- [x] Auth (Register/Login/Password Reset)
- [x] Professional auth page redesign (Feb 2026)
- [x] Multi-tenant groups
- [x] Dashboard analytics (role-based)
- [x] Invoicing with email sending
- [x] Payroll module
- [x] Expenses with receipts
- [x] Projects with tasks + checklists tab
- [x] HSE Documents with PDF viewer
- [x] Form Builder with PDF export
- [x] Theme system + language selection
- [x] Work Log (Akkord + Hourly)
- [x] User Management with all roles
- [x] Role-based permissions
- [x] Form fillability + project linking fixes
- [x] User creation payroll sync
- [x] Invitation emails
- [x] Akkord enable/disable per group
- [x] Akkord payment sharing
- [x] HTML email templates
- [x] HSE inline PDF viewing

## Backlog
- [ ] Invoice PDF generation improvements
- [ ] Mobile-responsive improvements
- [ ] Payment summary per worker report
- [ ] Company branding (logo upload)

## Test Accounts
- Admin/Owner: testadmin@test.com / TestPass123!
- Employee: employee@test.com / TestPass123!
