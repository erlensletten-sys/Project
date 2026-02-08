# ProjectDash - Product Requirements Document

## Overview
Multi-tenant business management platform: invoicing, payroll, expenses, checklists, HSE, projects.

## All Features (Complete)
- [x] Auth: Register/Login/Password Reset (Brevo SMTP)
- [x] Professional auth pages (dark gradient, glass-morphism, white CTAs, blue accents) - Feb 2026
- [x] Multi-tenant groups with role-based access (Owner > Admin > HR > Member > Employee)
- [x] Dashboard analytics (role-based views)
- [x] Invoicing with styled email sending
- [x] Payroll module (auto-sync from user creation)
- [x] Expenses with receipt upload
- [x] Projects with tasks + checklists tab (linked form submissions)
- [x] HSE Documents with inline PDF viewer
- [x] Form Builder with PDF export + project linking
- [x] Theme system (Dark/Light + accent colors) + Language (EN/NO)
- [x] Work Log: Akkord (toggle per group) + Hourly + proportional payment sharing
- [x] User Management: create, invite (with styled email), roles, deactivate
- [x] HTML email templates (invoice, password reset, invitation)
- [x] Role-based permissions (frontend nav + route guards + backend middleware)

## Backlog
- [ ] Invoice PDF generation improvements
- [ ] Mobile-responsive improvements
- [ ] Payment summary per worker report
- [ ] Company branding (logo upload)
- [ ] Quick Actions dashboard widget

## Tech Stack
Backend: FastAPI + MongoDB | Frontend: React 18 + TailwindCSS + Shadcn/UI | Email: Brevo SMTP

## Test Accounts
- Admin/Owner: testadmin@test.com / TestPass123!
- Employee: employee@test.com / TestPass123!
