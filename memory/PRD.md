# ProjectDash - Product Requirements Document

## Overview
Multi-tenant business management platform with super admin oversight.

## All Features (Complete)
- [x] Auth: Register/Login/Password Reset (Brevo SMTP)
- [x] Professional auth pages with custom logo (dark glassmorphism theme)
- [x] Multi-tenant groups with role-based access (Owner > Admin > HR > Member > Employee)
- [x] **Super Admin** (erlen.sletten@gmail.com): platform stats, feature toggles, user ban/unban
- [x] Dashboard analytics with quick actions
- [x] Invoicing with email sending + PDF generation/download
- [x] Payroll module with **Earnings tab** (Akkord/Hourly breakdown) + **CSV Export**
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
- [x] **Group Analytics** — Per-group usage metrics in Super Admin Analytics tab (users, projects, work logs, invoices, expenses, forms, last activity with activity level indicators)
- [x] **Bulk Actions** — Select All / individual group checkboxes with Bulk Verify, Unverify, Disable, Enable actions
- [x] **Email Preview** — Live HTML preview in Settings for Invite and Password Reset email templates with tab switching

## Super Admin
- Email: erlen.sletten@gmail.com
- Password: SuperAdmin123!
- Tabs: Groups (with bulk actions), Users (with impersonation), Analytics (usage metrics), Activity (audit log)
- Toggleable features: akkord, invoicing, payroll, hse, checklists, reports, expenses, projects, work_log, forms
- Group governance: verify/revoke, disable/enable (kills sessions), 24h trial enforcement
- Bulk operations: verify/unverify/disable/enable multiple groups at once

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
