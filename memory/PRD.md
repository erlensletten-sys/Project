# NordicForge - Business Management Platform PRD

## Overview
NordicForge is a multi-tenant business management platform combining features from Tripletex (Norwegian accounting) and Smartdok (construction/field management). Built for small to medium businesses, especially in construction and field services.

## Original Problem Statement
Build a combination of Tripletex (invoicing, payroll, expense management) and Smartdok (checklists, HSE documentation, project management) into a single multi-tenant platform with separate Groups/Organizations, each with their own Admin.

## User Personas
1. **Organization Owner** - Creates the organization, full admin access
2. **Admin** - Can manage users, approve expenses, access all features
3. **Member** - Basic access to create invoices, submit expenses, use checklists

## Core Requirements
- Multi-tenant architecture with Groups/Organizations
- JWT-based authentication (username/password)
- Data isolation per organization
- Norwegian business standards (NOK currency, 25% VAT)

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

### Payroll (From Tripletex)
- [x] Employee management
- [x] Salary tracking
- [x] Department organization
- [x] Monthly payroll calculations

### Expense Management (From Tripletex)
- [x] Submit expenses with categories
- [x] Expense approval workflow (pending, approved, rejected)
- [x] Admin approval interface
- [x] Receipt URL support

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

### Dashboard
- [x] Revenue and pending invoice stats
- [x] Monthly payroll overview
- [x] Active projects count
- [x] Pending expense approvals
- [x] HSE expiry alerts
- [x] Quick action cards

### UI/UX
- [x] Nordic Industrial design theme
- [x] Space Grotesk typography
- [x] Safety Orange accent (#FF4500)
- [x] Light mode default
- [x] Responsive sidebar navigation
- [x] Construction background imagery

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, Lucide icons
- **Backend**: FastAPI, Python 3
- **Database**: MongoDB with Motor async driver
- **Auth**: JWT with httpOnly cookies

## API Endpoints
- `POST /api/auth/register` - Register user + organization
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/group` - Get organization info
- `GET /api/group/members` - List members
- `POST /api/group/invite` - Invite user (admin)
- `GET/POST /api/invoices` - Invoice CRUD
- `GET/POST /api/employees` - Employee CRUD
- `GET/POST /api/expenses` - Expense CRUD
- `GET/POST /api/projects` - Project CRUD
- `POST /api/projects/{id}/tasks` - Task CRUD
- `GET/POST /api/checklists` - Checklist CRUD
- `GET/POST /api/hse-documents` - HSE CRUD
- `GET /api/dashboard/stats` - Dashboard metrics

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority)
- [ ] Recurring invoices
- [ ] Payroll runs with history
- [ ] File upload for receipts/documents
- [ ] Email notifications

### P2 (Medium Priority)
- [ ] Report generation (PDF invoices)
- [ ] Time tracking
- [ ] Equipment tracking
- [ ] Mobile-optimized field view

### P3 (Future)
- [ ] Integration with Norwegian accounting standards
- [ ] Altinn integration
- [ ] Bank integration
- [ ] Multi-language support

## Next Steps
1. Add recurring invoice functionality
2. Implement payroll run history
3. Add file upload for receipts
4. Email integration for invoice delivery
