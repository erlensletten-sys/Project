# ProjectDash - Product Requirements Document

## Overview
Multi-tenant business management platform: invoicing, payroll, expenses, checklists, HSE, projects, reports.

## All Features (Complete)
- [x] Auth: Register/Login/Password Reset (Brevo SMTP)
- [x] Professional auth pages (dark gradient, cohesive design, custom logo)
- [x] Multi-tenant groups with role-based access (Owner > Admin > HR > Member > Employee)
- [x] Dashboard analytics with quick actions
- [x] Invoicing with email sending + PDF generation
- [x] Payroll module (auto-sync from user creation)
- [x] Expenses with receipt upload
- [x] Projects with tasks + checklists tab
- [x] HSE Documents with inline PDF viewer
- [x] Form Builder with PDF export + project linking
- [x] Theme system (Dark/Light + accent colors) + Language (EN/NO)
- [x] Work Log: Akkord (toggle per group) + Hourly + proportional payment sharing
- [x] Custom Akkord prices per group (add/remove/edit base units and add-ons)
- [x] Individual earnings display in Work Log (My Work tab shows personal share)
- [x] User Management: create, invite (with styled email), roles, deactivate
- [x] HTML email templates (invoice, password reset, invitation)
- [x] Role-based permissions (frontend nav + route guards + backend middleware)
- [x] Payment Summary Report page (per-worker breakdown, period filter)
- [x] Company branding (custom logo in sidebar, auth pages)
- [x] Invoice PDF download
- [x] Mobile responsive improvements

## Tech Stack
Backend: FastAPI + MongoDB | Frontend: React 18 + TailwindCSS + Shadcn/UI | Email: Brevo SMTP | PDF: ReportLab

## Test Accounts
- Admin/Owner: testadmin@test.com / TestPass123!
- Employee: employee@test.com / TestPass123!
