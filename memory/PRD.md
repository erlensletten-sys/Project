# NordicForge - Business Management Platform PRD

## Overview
NordicForge is a multi-tenant business management platform combining features from Tripletex (Norwegian accounting) and Smartdok (construction/field management). Built for small to medium businesses, especially in construction and field services.

## Original Problem Statement
Build a combination of Tripletex (invoicing, payroll, expense management) and Smartdok (checklists, HSE documentation, project management) into a single multi-tenant platform with separate Groups/Organizations, each with their own Admin.

## User Personas
1. **Organization Owner** - Creates the organization, full admin access
2. **Admin** - Can manage users, approve expenses, process payroll, access all features
3. **Member** - Basic access to create invoices, submit expenses, use checklists

## Core Requirements
- Multi-tenant architecture with Groups/Organizations
- JWT-based authentication (username/password)
- Data isolation per organization
- Norwegian business standards (NOK currency, 25% VAT)
- Dark theme UI

## What's Been Implemented (Jan 2026)

### Authentication & Multi-tenancy
- [x] User registration with organization creation
- [x] JWT-based login with session cookies
- [x] Role-based access (owner, admin, member)
- [x] Group/organization data isolation
- [x] User invitation system with temp passwords

### Invoicing (From Tripletex)
- [x] Create invoices with line items
- [x] Auto-calculate subtotal, VAT, total
- [x] Invoice status management (draft, sent, paid, overdue)
- [x] Invoice listing with search and filters
- [x] Invoice detail view
- [x] **NEW** Send invoice via email (SendGrid integration)

### Payroll (From Tripletex)
- [x] Employee management
- [x] Salary tracking
- [x] Department organization
- [x] Monthly payroll calculations
- [x] **NEW** Payroll run history
- [x] **NEW** Payroll run status management (draft, processed, paid)
- [x] **NEW** Employee snapshot per payroll run

### Expense Management (From Tripletex)
- [x] Submit expenses with categories
- [x] Expense approval workflow (pending, approved, rejected)
- [x] Admin approval interface
- [x] **NEW** Receipt file upload (PDF, PNG, JPG up to 10MB)

### Projects (From Smartdok)
- [x] Project creation with budget and timeline
- [x] Task management within projects
- [x] Task status tracking (todo, in_progress, done)
- [x] Priority levels (low, medium, high)

### Checklists (From Smartdok)
- [x] Create checklist templates
- [x] Category support (general, safety, quality, inspection)
- [x] Interactive item toggling
- [x] Progress tracking

### HSE Documents (From Smartdok)
- [x] Document types (policy, procedure, form, report, certificate)
- [x] Expiry date tracking with alerts
- [x] Content and file URL support
- [x] **NEW** Document file upload (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG)

### Dashboard
- [x] Revenue and pending invoice stats
- [x] Monthly payroll overview
- [x] Active projects count
- [x] Pending expense approvals
- [x] HSE expiry alerts
- [x] Quick action cards

### UI/UX
- [x] **NEW** Dark theme across all pages
- [x] Nordic Industrial design theme
- [x] Space Grotesk typography
- [x] Safety Orange accent (#FF4500)
- [x] Responsive sidebar navigation
- [x] Construction background imagery

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, Lucide icons
- **Backend**: FastAPI, Python 3
- **Database**: MongoDB with Motor async driver
- **Auth**: JWT with httpOnly cookies
- **Email**: SendGrid (optional)
- **File Storage**: Local filesystem with secure access

## New API Endpoints (This Iteration)
- `GET /api/payroll/runs` - List payroll runs
- `POST /api/payroll/runs` - Create payroll run
- `GET /api/payroll/runs/{id}` - Get payroll run detail
- `PATCH /api/payroll/runs/{id}/status` - Update run status
- `POST /api/upload` - Upload file
- `GET /api/files/{group_id}/{filename}` - Get uploaded file
- `POST /api/invoices/{id}/send` - Send invoice email

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority)
- [x] Payroll run history ✅
- [x] File upload for receipts/documents ✅
- [x] Email notifications for invoice delivery ✅
- [x] Dark theme ✅
- [ ] Recurring invoices
- [ ] PDF export for invoices

### P2 (Medium Priority)
- [ ] Report generation (monthly/quarterly)
- [ ] Time tracking
- [ ] Equipment tracking
- [ ] Mobile-optimized field view
- [ ] Expense receipt OCR

### P3 (Future)
- [ ] Integration with Norwegian accounting standards
- [ ] Altinn integration
- [ ] Bank integration
- [ ] Multi-language support (NO/EN)
- [ ] Mobile app

## Next Steps
1. Add recurring invoice functionality
2. PDF invoice export/download
3. Monthly report generation
4. Time tracking integration with payroll
