# ProjectDash - Product Requirements Document

## Overview
Multi-tenant business management platform with super admin oversight.

## All Features (Complete)
- [x] Auth: Register/Login/Password Reset (Brevo SMTP)
- [x] Professional auth pages with custom logo (dark glassmorphism theme)
- [x] Multi-tenant groups with role-based access (Owner > Admin > HR > Member > Employee)
- [x] **Super Admin** (erlen.sletten@gmail.com): platform stats, feature toggles per group, user ban/unban
- [x] Dashboard analytics with quick actions
- [x] Invoicing with email sending + PDF generation/download
- [x] Payroll module with **Earnings tab** (Akkord/Hourly breakdown per employee) + **CSV Export**
- [x] Expenses with receipt upload
- [x] Projects with tasks + checklists tab
- [x] HSE Documents with inline PDF viewer
- [x] Form Builder with PDF export + project linking
- [x] Theme system (Dark/Light + accent colors) + Language (EN/NO)
- [x] Work Log: Akkord (toggle + custom prices per group) + Hourly + individual payment display
- [x] User Management: create, invite (with styled email), roles, deactivate
- [x] Dark-themed HTML email templates matching app UI
- [x] Payment Summary Report, company branding, mobile responsive
- [x] **24-hour trial period** for new groups (requires Super Admin verification)
- [x] **Group disable/enable** from Super Admin panel
- [x] **User impersonation** for support purposes (Super Admin only, 2h sessions)
- [x] **Admin activity/audit log** tracking all Super Admin actions
- [x] **Emergent Object Storage** for file uploads (replacing local filesystem)

## Super Admin
- Email: erlen.sletten@gmail.com
- Password: SuperAdmin123!
- Toggleable features: akkord, invoicing, payroll, hse, checklists, reports, expenses, projects, work_log, forms
- Can ban/unban any user across any group
- Can verify/revoke verification for groups (24h trial enforcement)
- Can disable/enable entire groups (kills all user sessions on disable)
- Can impersonate any user for support (2-hour temporary sessions)
- Activity log tracks all admin actions with timestamps

## 24-Hour Trial System
- New groups get `is_verified: false` and `trial_started_at` on registration
- Groups have 24 hours of full access during trial
- After 24 hours, unverified groups are blocked via `require_auth` middleware
- Super Admin can verify groups to grant permanent access
- Super Admin bypasses all trial/disable restrictions

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Context API, Lucide Icons
- Backend: FastAPI (single server.py), Motor (MongoDB async), ReportLab (PDFs), Bcrypt
- Database: MongoDB
- File Storage: Emergent Object Storage (cloud)
- Emails: Brevo SMTP

## Test Accounts
- Super Admin: erlen.sletten@gmail.com / SuperAdmin123!
- Admin/Owner: testadmin@test.com / TestPass123!
- Employee: employee@test.com / TestPass123!

## Future/Backlog
- (none currently queued - all requested features implemented)
