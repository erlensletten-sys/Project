# NordicForge - Business Management Platform PRD

## Overview
NordicForge is a multi-tenant business management platform combining features from Tripletex (Norwegian accounting) and Smartdok (construction/field management). Built for small to medium businesses, especially in construction and field services.

## Original Problem Statement
Build a combination of Tripletex (invoicing, payroll, expense management) and Smartdok (checklists, HSE documentation, project management) into a single multi-tenant platform with separate Groups/Organizations, each with their own Admin.

## User Personas
1. **Organization Owner** - Creates the organization, full admin access
2. **Admin** - Can manage users, approve expenses, process payroll, create form templates
3. **Member** - Fill forms, submit expenses, view projects

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
- [x] Send invoice via email (SendGrid integration)

### Payroll (From Tripletex)
- [x] Employee management
- [x] Salary tracking
- [x] Department organization
- [x] Monthly payroll calculations
- [x] Payroll run history
- [x] Payroll run status management (draft, processed, paid)
- [x] Employee snapshot per payroll run

### Expense Management (From Tripletex)
- [x] Submit expenses with categories
- [x] Expense approval workflow (pending, approved, rejected)
- [x] Admin approval interface
- [x] Receipt file upload (PDF, PNG, JPG up to 10MB)

### Projects (From Smartdok)
- [x] Project creation with budget and timeline
- [x] Task management within projects
- [x] Task status tracking (todo, in_progress, done)
- [x] Priority levels (low, medium, high)

### **Form Builder (From Smartdok - Enhanced)** ✨ NEW
- [x] **Admin form template creation** with multiple field types:
  - Short Text
  - Long Text (textarea)
  - Number
  - Checkbox
  - Dropdown (select with custom options)
  - Date
- [x] **Field configuration**: required/optional, placeholders
- [x] **Form categories**: general, safety, quality, inspection
- [x] **User form submission** with project linking
- [x] **Submissions list** with filtering
- [x] **PDF export** of completed form submissions
- [x] **Admin-only form management** (create/delete templates)

### HSE Documents (From Smartdok)
- [x] Document types (policy, procedure, form, report, certificate)
- [x] Expiry date tracking with alerts
- [x] Content and file URL support
- [x] Document file upload (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG)

### Dashboard
- [x] Revenue and pending invoice stats
- [x] Monthly payroll overview
- [x] Active projects count
- [x] Pending expense approvals
- [x] HSE expiry alerts
- [x] Quick action cards

### UI/UX
- [x] Dark theme across all pages
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
- **PDF Generation**: ReportLab

## Form Builder API Endpoints
- `GET /api/forms` - List form templates
- `POST /api/forms` - Create form template (admin only)
- `GET /api/forms/{id}` - Get form template
- `DELETE /api/forms/{id}` - Delete form template (admin only)
- `GET /api/forms/{id}/submissions` - List form submissions
- `POST /api/forms/{id}/submissions` - Submit form response
- `GET /api/submissions` - List all submissions
- `GET /api/submissions/{id}` - Get submission details
- `GET /api/submissions/{id}/pdf` - Download submission as PDF

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority) - All Done ✅
- [x] Payroll run history
- [x] File upload for receipts/documents
- [x] Email notifications for invoice delivery
- [x] Dark theme
- [x] Form builder with PDF export

### P2 (Medium Priority)
- [ ] Recurring invoices
- [ ] PDF invoice export/download
- [ ] Report generation (monthly/quarterly)
- [ ] Time tracking integration with payroll
- [ ] Signature field for forms

### P3 (Future)
- [ ] Mobile-optimized field view
- [ ] Expense receipt OCR
- [ ] Integration with Norwegian accounting standards
- [ ] Altinn integration
- [ ] Bank integration
- [ ] Multi-language support (NO/EN)
- [ ] Mobile app

## Next Steps
1. Add signature field to form builder
2. PDF invoice export/download
3. Recurring invoice functionality
4. Time tracking integration
