# ProjectDash - Product Requirements Document

## Overview
ProjectDash (formerly NordicForge) is a multi-tenant business management platform combining features from Tripletex (invoicing, payroll, expense management) and Smartdok (checklists, HSE documentation, project management).

## Target Audience
Small to medium-sized businesses in Norway and other Nordic countries.

## Core Features

### 1. Authentication & Multi-tenancy
- Username/password authentication
- **Password Reset via Email** ✅
- Multi-tenant architecture with isolated "Groups"
- Role-based access control (Owner, Admin, HR, Member, Employee)

### 2. User Management ✅
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

### 3. Dashboard Analytics ✅ (NEW - Feb 2026)
- **Admin/Owner/HR View:**
  - Revenue (green) - total and pending
  - Total Costs (red) - labor and expenses
  - Gross Margin (RED when negative, GREEN when positive)
  - Work Stats - total jobs and hours
  - Top Producers - employee rankings by earnings
- **Employee View:**
  - Personal Earnings (green)
  - Hours Worked
  - Area Completed (m²)
  - Average per Job
  - Average per Hour
  - Median Income (amber highlight)
- **Period Selector:** Week / Month / Year

### 4. Work Log (Enhanced - Akkord + Hourly + Per-Employee Hours) ✅
- **Work Types:**
  - **Piece Rate (Akkord)**: Based on area (m²) with base operations and add-ons
  - **Hourly Work**: Based on hours × configurable hourly rate
- **Per-Employee Hour Logging:**
  - Each worker on a job logs their individual hours
  - Earnings calculated per worker based on their hours
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

### 5. Invoicing Module
- Create, send, and track invoices
- Invoice status management (Draft, Sent, Paid, Overdue)
- Email notifications for invoice delivery

### 6. Payroll Module
- Employee management
- Payroll runs with history
- Monthly payroll calculations

### 7. Expenses Module
- Expense submission and approval workflow
- Receipt upload functionality (PDF, PNG, JPG)
- Category-based expense tracking

### 8. Projects Module
- Project creation and management
- Task tracking
- Project budgets and timelines

### 9. HSE Documents Module
- Health, Safety & Environment documentation
- Document upload and expiry tracking
- Document types: Policy, Procedure, Form, Report, Certificate

### 10. Form Builder (Checklists)
- Admin-created form templates
- Dynamic field types (text, number, checkbox, dropdown, date)
- Form submissions linked to projects
- PDF export of submissions

### 11. Settings & Configuration
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
- Password reset tokens stored in `password_resets` collection

### Frontend (React + TailwindCSS)
- React 18 with React Router
- TailwindCSS + Shadcn/UI components
- Context-based state management
- i18n support with custom language context
- Theme provider for dark/light modes

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new organization and user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset email ✅
- `POST /api/auth/reset-password` - Reset password with token ✅

### Dashboard Analytics ✅
- `GET /api/analytics/dashboard?period=week|month|year` - Get role-based analytics

### User Management
- `POST /api/group/users` - Create user directly
- `GET /api/group/users` - Get all users
- `PUT /api/group/users/{id}/role` - Update user role
- `PUT /api/group/users/{id}/deactivate` - Deactivate user
- `PUT /api/group/users/{id}/activate` - Reactivate user

### Settings
- `GET /api/settings/email` - Get SMTP configuration status
- `PUT /api/settings/email` - Save global SMTP configuration
- `PUT /api/settings/email/sender-name` - Update per-group sender name
- `GET /api/settings/group` - Get group settings
- `PUT /api/settings/group` - Update group settings

### Work Logs
- `GET /api/work-logs` - Get all work logs
- `POST /api/work-logs` - Create work log with per-employee hours
- `DELETE /api/work-logs/{id}` - Delete work log
- `GET /api/akkord/pricing` - Get pricing structure

## Implemented Features (as of February 2026)

### Completed
- [x] User authentication (Register/Login)
- [x] **Password reset via email** ✅
- [x] Multi-tenant group management
- [x] **Dashboard with role-based analytics** ✅
- [x] Invoicing module
- [x] Payroll module
- [x] Expenses with receipt upload
- [x] Projects management
- [x] HSE Documents with file upload
- [x] Form Builder with PDF export
- [x] Theme system (Dark/Light + Black/Green/Yellow/Purple/Blue/Orange)
- [x] Global SMTP configuration
- [x] Per-group sender name customization
- [x] Language selection (English/Norwegian)
- [x] All pages translated (i18n)
- [x] **Work Log - Akkord work type**
- [x] **Work Log - Hourly work type**
- [x] **Work Log - Per-employee hour logging** ✅
- [x] **Group Settings - Hourly rate configuration**
- [x] **User Management - All roles and operations**
- [x] Application rebranded to "ProjectDash"

### Backlog
- [ ] Admin form generation (clarification needed)
- [ ] Invoice PDF generation
- [ ] Expense approval notifications
- [ ] Mobile-responsive improvements

## Test Accounts
- **Admin/Owner**: test@projectdash.me / Test1234!
- **Employee**: worker@projectdash.me / Password123!
- **HR**: sarah.hr@projectdash.me / Password123!
