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

### 8. **Work Log (Akkord/Piece-rate Payment)** - NEW
- Users can log their production work
- **Base Operations** (select one):
  - Avtrekk: 18 kr/m²
  - Skuring: 22 kr/m²
  - Glatting: 26 kr/m²
- **Add-ons** (checkboxes, add on top of base):
  - Sikatop x1: +3 kr/m²
  - Sikatop x2: +6 kr/m²
  - Tykkelse 30-40cm: +3 kr/m²
  - Tykkelse 40-50cm: +5 kr/m²
  - Ashford: +10 kr/m²
  - Plastikk: +5 kr/m²
- Work logged under projects
- Auto-calculated payment: Area × Rate
- Summary showing total area, hours, and earnings
- Admins can view all team work logs

### 9. Settings & Configuration
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
- `work_logs`: Akkord/piece-rate work entries
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
- [x] **Work Log (Akkord) for piece-rate payment**

### Backlog
- [ ] Real-time invoice email delivery (requires SMTP credentials)
- [ ] Password reset functionality
- [ ] User profile editing
- [ ] Invoice PDF generation
- [ ] Expense approval notifications
- [ ] Dashboard analytics/charts
- [ ] Mobile-responsive improvements
- [ ] Work log summary per project with employee breakdown

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

### Work Logs
- `GET /api/work-logs` - Get all work logs (admin)
- `GET /api/work-logs/my` - Get current user's work logs
- `POST /api/work-logs` - Create work log entry
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

## Akkord Pricing Structure
| Base Operation | Price (kr/m²) |
|----------------|---------------|
| Avtrekk        | 18            |
| Skuring        | 22            |
| Glatting       | 26            |

| Add-on              | Additional Price (kr/m²) |
|---------------------|--------------------------|
| Sikatop x1          | +3                       |
| Sikatop x2          | +6                       |
| Tykkelse 30-40cm    | +3                       |
| Tykkelse 40-50cm    | +5                       |
| Ashford             | +10                      |
| Plastikk            | +5                       |

**Payment Calculation:**
- Total Rate = Base Operation Price + Sum of Selected Add-ons
- Total Payment = Area (m²) × Total Rate (kr/m²)
