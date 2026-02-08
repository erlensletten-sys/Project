from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import uuid
import bcrypt
import base64
import aiofiles
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta

# SendGrid for emails (optional fallback)
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="ProjectDash API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Constants ==============
SESSION_EXPIRY_DAYS = 7
SLUG_ENTROPY_BYTES = 16  # 128 bits of entropy for slugs

# User Roles with hierarchy (higher index = more permissions)
ROLES = ["employee", "hr", "member", "admin", "owner"]
ROLE_PERMISSIONS = {
    "employee": ["view_projects", "fill_checklists", "add_expenses", "log_work", "view_own_data"],
    "hr": ["view_projects", "fill_checklists", "add_expenses", "log_work", "view_own_data", 
           "manage_employees", "view_payroll", "approve_expenses", "view_all_work_logs"],
    "member": ["view_projects", "fill_checklists", "add_expenses", "log_work", "view_own_data",
               "create_invoices", "manage_projects"],
    "admin": ["view_projects", "fill_checklists", "add_expenses", "log_work", "view_own_data",
              "manage_employees", "view_payroll", "approve_expenses", "view_all_work_logs",
              "create_invoices", "manage_projects", "manage_users", "manage_settings", "manage_forms"],
    "owner": ["*"]  # All permissions
}

# ============== Pydantic Models ==============

# Auth Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2)
    group_name: str = Field(min_length=2)  # Creates a new group

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    group_id: str
    group_name: Optional[str] = None
    created_at: Optional[datetime] = None

class GroupResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    group_id: str
    name: str
    slug: str
    owner_id: str
    created_at: Optional[datetime] = None
    member_count: Optional[int] = 0

# Invoice Models
class InvoiceItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    vat_rate: float = 25.0  # Norwegian standard VAT

class InvoiceCreate(BaseModel):
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_address: Optional[str] = None
    due_date: Optional[datetime] = None
    items: List[InvoiceItem]
    notes: Optional[str] = None

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str
    invoice_number: str
    group_id: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    items: List[dict]
    subtotal: float
    vat_total: float
    total: float
    status: str  # draft, sent, paid, overdue
    due_date: Optional[datetime] = None
    created_at: datetime
    created_by: str

# Employee/Payroll Models
class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    position: str
    department: Optional[str] = None
    salary: float  # Monthly salary
    start_date: Optional[datetime] = None

class EmployeeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    group_id: str
    name: str
    email: str
    position: str
    department: Optional[str] = None
    salary: float
    start_date: Optional[datetime] = None
    status: str  # active, inactive
    created_at: datetime

# Expense Models
class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category: str
    date: Optional[datetime] = None
    receipt_url: Optional[str] = None
    project_id: Optional[str] = None

class ExpenseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    expense_id: str
    group_id: str
    description: str
    amount: float
    category: str
    date: datetime
    receipt_url: Optional[str] = None
    project_id: Optional[str] = None
    status: str  # pending, approved, rejected
    created_by: str
    created_at: datetime

# Project Models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high

class ProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    group_id: str
    name: str
    description: Optional[str] = None
    client_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    status: str  # planning, active, completed, on_hold
    task_count: Optional[int] = 0
    created_at: datetime

# Checklist Models
class ChecklistItemCreate(BaseModel):
    text: str
    required: bool = False

class ChecklistCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "general"  # general, safety, quality, inspection
    items: List[ChecklistItemCreate]
    project_id: Optional[str] = None

class ChecklistResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    checklist_id: str
    group_id: str
    title: str
    description: Optional[str] = None
    category: str
    items: List[dict]
    project_id: Optional[str] = None
    status: str  # template, in_progress, completed
    completed_items: int = 0
    total_items: int = 0
    created_by: str
    created_at: datetime

# Form Builder Models (New)
class FormFieldCreate(BaseModel):
    field_type: str  # text, textarea, number, checkbox, select, date, file, signature
    label: str
    required: bool = False
    options: Optional[List[str]] = None  # For select fields
    placeholder: Optional[str] = None

class FormTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "general"  # general, safety, quality, inspection
    fields: List[FormFieldCreate]

class FormTemplateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    form_id: str
    group_id: str
    title: str
    description: Optional[str] = None
    category: str
    fields: List[dict]
    is_active: bool = True
    submission_count: int = 0
    created_by: str
    created_at: datetime

class FormSubmissionCreate(BaseModel):
    form_id: str
    project_id: Optional[str] = None
    responses: dict  # field_id -> value

class FormSubmissionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    submission_id: str
    form_id: str
    form_title: str
    group_id: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    responses: dict
    submitted_by: str
    submitted_by_name: Optional[str] = None
    created_at: datetime
    pdf_url: Optional[str] = None

# HSE Document Models
class HSEDocumentCreate(BaseModel):
    title: str
    document_type: str  # policy, procedure, form, report, certificate
    content: Optional[str] = None
    file_url: Optional[str] = None
    expiry_date: Optional[datetime] = None
    project_id: Optional[str] = None

# Email Settings Model - Global SMTP (stored in env, configured by admin via UI)
class EmailSettingsUpdate(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    sender_email: str
    sender_name: str = "ProjectDash"

# Per-Group Email Settings Model - Only sender name is customizable per group
class GroupEmailSettingsUpdate(BaseModel):
    sender_name: str = "ProjectDash"

# Group Settings Model (for hourly rates)
class GroupSettingsUpdate(BaseModel):
    hourly_rate: float = Field(ge=0, description="Default hourly rate for the organization")

# Work Log Models (Akkord/Piece-rate Payment + Hourly)
class WorkerHours(BaseModel):
    user_id: str
    hours: float = Field(ge=0)

class WorkLogCreate(BaseModel):
    project_id: str
    date: datetime
    description: Optional[str] = None
    work_type: str = "akkord"  # "akkord" or "hourly"
    # Akkord fields
    area: Optional[float] = Field(default=0, ge=0, description="Area in square meters")
    base_operation: Optional[str] = None  # avtrekk, skuring, glatting
    addons: List[str] = []  # sikatop_x1, sikatop_x2, etc.
    # Common fields
    total_hours: float = Field(ge=0, description="Total hours for the job")
    workers: List[WorkerHours] = []  # List of workers and their individual hours

class WorkLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    work_id: str
    group_id: str
    project_id: str
    project_name: Optional[str] = None
    user_id: str  # Creator
    user_name: Optional[str] = None
    date: datetime
    description: Optional[str] = None
    work_type: str
    area: float
    base_operation: Optional[str]
    addons: List[str]
    total_hours: float
    workers: List[dict]  # Workers with their hours and calculated payment
    rate_per_sqm: float  # For akkord
    hourly_rate: float  # For hourly work
    total_payment: float
    created_at: datetime

# Akkord pricing constants
AKKORD_BASE_PRICES = {
    "avtrekk": 18,
    "skuring": 22,
    "glatting": 26
}

AKKORD_ADDON_PRICES = {
    "sikatop_x1": 3,
    "sikatop_x2": 6,
    "tykkelse_30_40": 3,
    "tykkelse_40_50": 5,
    "ashford": 10,
    "plastikk": 5
}

def calculate_akkord_rate(base_operation: str, addons: List[str]) -> float:
    """Calculate total rate per square meter based on operation and add-ons"""
    base_price = AKKORD_BASE_PRICES.get(base_operation, 0)
    addon_total = sum(AKKORD_ADDON_PRICES.get(addon, 0) for addon in addons)
    return base_price + addon_total

class HSEDocumentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_id: str
    group_id: str
    title: str
    document_type: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    expiry_date: Optional[datetime] = None
    project_id: Optional[str] = None
    status: str  # active, expired, archived
    created_by: str
    created_at: datetime

# User Management
class InviteUserRequest(BaseModel):
    email: EmailStr
    name: str
    role: str = "member"  # employee, hr, member, admin

class UpdateUserRoleRequest(BaseModel):
    role: str = Field(..., description="New role: employee, hr, member, admin")

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=8)
    role: str = "employee"  # employee, hr, member, admin

class UserManagementResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

# Password Reset Models
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

# Payroll Run Models
class PayrollRunCreate(BaseModel):
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2020, le=2100)
    notes: Optional[str] = None

class PayrollRunResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    run_id: str
    group_id: str
    month: int
    year: int
    employees: List[dict]
    total_amount: float
    status: str  # draft, processed, paid
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    processed_at: Optional[datetime] = None

# File Upload Models
class FileUploadResponse(BaseModel):
    file_id: str
    file_url: str
    filename: str
    content_type: str
    size: int

# Email Models
class SendInvoiceRequest(BaseModel):
    recipient_email: Optional[EmailStr] = None  # If not provided, uses customer_email

# ============== Helper Functions ==============

def generate_slug():
    """Generate a high-entropy random slug (>=32 bits, we use 128 bits)"""
    return secrets.token_urlsafe(SLUG_ENTROPY_BYTES)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def get_current_user(request: Request) -> Optional[dict]:
    """Get current user from session token"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        return None
    
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        return None
    
    # Get group name
    group_doc = await db.groups.find_one(
        {"group_id": user_doc["group_id"]},
        {"_id": 0, "name": 1}
    )
    if group_doc:
        user_doc["group_name"] = group_doc["name"]
    
    return user_doc

async def require_auth(request: Request) -> dict:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> dict:
    """Require admin role"""
    user = await require_auth(request)
    if user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_hr_or_admin(request: Request) -> dict:
    """Require HR or admin role"""
    user = await require_auth(request)
    if user["role"] not in ["hr", "admin", "owner"]:
        raise HTTPException(status_code=403, detail="HR or admin access required")
    return user

def has_permission(user_role: str, permission: str) -> bool:
    """Check if a role has a specific permission"""
    if user_role == "owner":
        return True
    permissions = ROLE_PERMISSIONS.get(user_role, [])
    return permission in permissions or "*" in permissions

# ============== File Upload Helpers ==============

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def save_upload_file(file: UploadFile, group_id: str) -> dict:
    """Save uploaded file and return file info"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {file_ext} not allowed")
    
    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Generate unique filename
    file_id = f"file_{uuid.uuid4().hex[:12]}"
    safe_filename = f"{file_id}{file_ext}"
    
    # Create group upload directory
    group_dir = UPLOAD_DIR / group_id
    group_dir.mkdir(exist_ok=True)
    
    # Save file
    file_path = group_dir / safe_filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Store file record in database
    file_doc = {
        "file_id": file_id,
        "group_id": group_id,
        "filename": file.filename,
        "safe_filename": safe_filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content),
        "created_at": datetime.now(timezone.utc)
    }
    await db.files.insert_one(file_doc)
    
    # Return file URL (relative to API)
    file_url = f"/api/files/{group_id}/{safe_filename}"
    
    return {
        "file_id": file_id,
        "file_url": file_url,
        "filename": file.filename,
        "content_type": file_doc["content_type"],
        "size": len(content)
    }

# ============== Email Helpers ==============

# Global email configuration from environment or database (set by system admin)
async def get_global_email_config():
    """Get global email configuration from database or environment"""
    # First check if global config exists in database
    global_config = await db.email_configs.find_one({"group_id": "__global__"}, {"_id": 0})
    if global_config and global_config.get('smtp_host'):
        return global_config
    
    # Fallback to environment variables
    return {
        "smtp_host": os.environ.get('SMTP_HOST', ''),
        "smtp_port": int(os.environ.get('SMTP_PORT', 587)),
        "smtp_user": os.environ.get('SMTP_USER', ''),
        "smtp_password": os.environ.get('SMTP_PASSWORD', ''),
        "smtp_use_tls": os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true',
        "sender_email": os.environ.get('SENDER_EMAIL', ''),
        "sender_name": os.environ.get('SENDER_NAME', 'ProjectDash')
    }

async def get_group_sender_name(group_id: str):
    """Get the custom sender name for a group, if any"""
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0, "sender_name": 1})
    return group.get("sender_name") if group else None

async def get_effective_email_config(group_id: str):
    """Get email configuration - global SMTP with per-group sender name override"""
    # Get global SMTP configuration
    config = await get_global_email_config()
    
    # Override sender_name with group-specific value if set
    group_sender_name = await get_group_sender_name(group_id)
    if group_sender_name:
        config = dict(config)  # Make a copy to avoid modifying original
        config["sender_name"] = group_sender_name
    
    return config

def get_email_config():
    """Get email configuration from environment (fallback - legacy support)"""
    return {
        "smtp_host": os.environ.get('SMTP_HOST', ''),
        "smtp_port": int(os.environ.get('SMTP_PORT', 587)),
        "smtp_user": os.environ.get('SMTP_USER', ''),
        "smtp_password": os.environ.get('SMTP_PASSWORD', ''),
        "smtp_use_tls": os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true',
        "sender_email": os.environ.get('SENDER_EMAIL', ''),
        "sender_name": os.environ.get('SENDER_NAME', 'ProjectDash')
    }

async def is_email_configured_global():
    """Check if global email is properly configured"""
    config = await get_global_email_config()
    return bool(config.get("smtp_host") and config.get("smtp_user") and config.get("sender_email"))

async def is_email_configured_for_group(group_id: str):
    """Check if email is properly configured (uses global config)"""
    return await is_email_configured_global()

def is_email_configured():
    """Check if email is properly configured (environment only - legacy)"""
    config = get_email_config()
    return bool(config["smtp_host"] and config["smtp_user"] and config["sender_email"])

async def send_email_smtp(to_email: str, subject: str, html_content: str, text_content: str = None, group_id: str = None):
    """Send email via SMTP"""
    # Get config from database if group_id provided, otherwise use environment
    if group_id:
        config = await get_effective_email_config(group_id)
        configured = await is_email_configured_for_group(group_id)
    else:
        config = get_email_config()
        configured = is_email_configured()
    
    if not configured:
        logger.warning("SMTP not configured, skipping email")
        return False
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{config.get('sender_name', 'ProjectDash')} <{config.get('sender_email', '')}>"
        message["To"] = to_email
        
        # Add plain text version if provided
        if text_content:
            part1 = MIMEText(text_content, "plain")
            message.attach(part1)
        
        # Add HTML version
        part2 = MIMEText(html_content, "html")
        message.attach(part2)
        
        # Send via SMTP
        await aiosmtplib.send(
            message,
            hostname=config.get("smtp_host", ""),
            port=config.get("smtp_port", 587),
            username=config.get("smtp_user", ""),
            password=config.get("smtp_password", ""),
            start_tls=config.get("smtp_use_tls", True)
        )
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email via SMTP: {e}")
        return False

def build_invoice_email_html(invoice: dict, group_name: str) -> str:
    """Build HTML content for invoice email"""
    items_html = ""
    for item in invoice.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{item['description']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item['quantity']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{item['unit_price']:,.2f} kr</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{item['total']:,.2f} kr</td>
        </tr>
        """
    
    due_date = invoice.get('due_date')
    if isinstance(due_date, datetime):
        due_date_str = due_date.strftime('%d.%m.%Y')
    elif isinstance(due_date, str):
        due_date_str = due_date[:10]
    else:
        due_date_str = 'N/A'
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0F172A; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Invoice from {group_name}</h1>
        </div>
        
        <div style="padding: 20px;">
            <p>Dear {invoice.get('customer_name', 'Customer')},</p>
            <p>Please find your invoice details below:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {invoice.get('invoice_number')}</p>
                <p style="margin: 5px 0;"><strong>Due Date:</strong> {due_date_str}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 10px; text-align: left;">Description</th>
                        <th style="padding: 10px; text-align: center;">Qty</th>
                        <th style="padding: 10px; text-align: right;">Price</th>
                        <th style="padding: 10px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 20px;">
                <p style="margin: 5px 0;">Subtotal: <strong>{invoice.get('subtotal', 0):,.2f} kr</strong></p>
                <p style="margin: 5px 0;">VAT: <strong>{invoice.get('vat_total', 0):,.2f} kr</strong></p>
                <p style="margin: 5px 0; font-size: 1.2em; color: #FF4500;">
                    Total: <strong>{invoice.get('total', 0):,.2f} kr</strong>
                </p>
            </div>
            
            {f'<p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 8px;"><strong>Notes:</strong> {invoice.get("notes")}</p>' if invoice.get("notes") else ''}
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p style="color: #666; font-size: 0.9em;">
                Thank you for your business!<br>
                {group_name}
            </p>
        </div>
    </body>
    </html>
    """
    return html_content

async def send_invoice_email(invoice: dict, recipient_email: str, group_name: str):
    """Send invoice email via configured method (SMTP or SendGrid)"""
    
    # Build email content
    html_content = build_invoice_email_html(invoice, group_name)
    subject = f"Invoice {invoice.get('invoice_number')} from {group_name}"
    
    # Try SMTP first (preferred)
    if is_email_configured():
        return await send_email_smtp(recipient_email, subject, html_content)
    
    # Fallback to SendGrid if configured
    if SENDGRID_AVAILABLE:
        api_key = os.environ.get('SENDGRID_API_KEY')
        sender_email = os.environ.get('SENDER_EMAIL', 'noreply@nordicforge.no')
        
        if api_key:
            try:
                message = Mail(
                    from_email=sender_email,
                    to_emails=recipient_email,
                    subject=subject,
                    html_content=html_content
                )
                sg = SendGridAPIClient(api_key)
                response = sg.send(message)
                return response.status_code == 202
            except Exception as e:
                logger.error(f"Failed to send email via SendGrid: {e}")
                return False
    
    logger.warning("No email service configured (SMTP or SendGrid)")
    return False

# ============== PDF Generation Helpers ==============

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import cm, mm
from io import BytesIO

def generate_form_submission_pdf(submission: dict, form: dict, group_name: str, project_name: str = None, submitted_by_name: str = None) -> bytes:
    """Generate PDF for a form submission"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=12,
        textColor=colors.HexColor('#0F172A')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=20
    )
    
    label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        spaceBefore=12
    )
    
    value_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=8
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph(form.get('title', 'Form Submission'), title_style))
    
    # Metadata
    meta_text = f"<b>Organization:</b> {group_name}<br/>"
    if project_name:
        meta_text += f"<b>Project:</b> {project_name}<br/>"
    if submitted_by_name:
        meta_text += f"<b>Submitted by:</b> {submitted_by_name}<br/>"
    
    created_at = submission.get('created_at')
    if created_at:
        if isinstance(created_at, datetime):
            date_str = created_at.strftime('%d.%m.%Y %H:%M')
        else:
            date_str = str(created_at)[:16]
        meta_text += f"<b>Date:</b> {date_str}"
    
    elements.append(Paragraph(meta_text, subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Form description
    if form.get('description'):
        elements.append(Paragraph(form['description'], styles['Normal']))
        elements.append(Spacer(1, 20))
    
    # Divider
    elements.append(Paragraph("<hr/>", styles['Normal']))
    elements.append(Spacer(1, 10))
    
    # Form fields and responses
    responses = submission.get('responses', {})
    fields = form.get('fields', [])
    
    for i, field in enumerate(fields):
        field_id = field.get('field_id', f'field_{i}')
        field_label = field.get('label', f'Field {i+1}')
        field_type = field.get('field_type', 'text')
        response_value = responses.get(field_id, '')
        
        # Label
        required_mark = " *" if field.get('required') else ""
        elements.append(Paragraph(f"{field_label}{required_mark}", label_style))
        
        # Value
        if field_type == 'checkbox':
            display_value = "Yes" if response_value else "No"
        elif field_type == 'file':
            display_value = "File attached" if response_value else "No file"
        elif field_type == 'signature':
            display_value = "[Signature on file]" if response_value else "Not signed"
        elif not response_value:
            display_value = "-"
        else:
            display_value = str(response_value)
        
        elements.append(Paragraph(display_value, value_style))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("<hr/>", styles['Normal']))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94A3B8'),
        alignment=1  # Center
    )
    elements.append(Paragraph(f"Generated by ProjectDash • {group_name}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

# ============== Auth Endpoints ==============

@api_router.post("/auth/register")
async def register(request: RegisterRequest, response: Response):
    """Register a new user and create their group"""
    # Check if email already exists
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create group
    group_id = f"grp_{uuid.uuid4().hex[:12]}"
    group_slug = generate_slug()
    
    await db.groups.insert_one({
        "group_id": group_id,
        "name": request.group_name,
        "slug": group_slug,
        "owner_id": None,  # Will update after user creation
        "created_at": datetime.now(timezone.utc)
    })
    
    # Create user
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(request.password)
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": request.email,
        "name": request.name,
        "password_hash": password_hash,
        "role": "owner",
        "group_id": group_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Update group owner
    await db.groups.update_one(
        {"group_id": group_id},
        {"$set": {"owner_id": user_id}}
    )
    
    # Create session
    session_token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    return {
        "ok": True,
        "user": {
            "user_id": user_id,
            "email": request.email,
            "name": request.name,
            "role": "owner",
            "group_id": group_id,
            "group_name": request.group_name
        }
    }

@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    """Login with email and password"""
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get group name
    group_doc = await db.groups.find_one(
        {"group_id": user_doc["group_id"]},
        {"_id": 0, "name": 1}
    )
    
    # Create session
    session_token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    return {
        "ok": True,
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "role": user_doc["role"],
            "group_id": user_doc["group_id"],
            "group_name": group_doc["name"] if group_doc else None
        }
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove password hash from response
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout - delete session and clear cookie"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"ok": True, "message": "Logged out"}

@api_router.post("/auth/forgot-password")
async def forgot_password(request_body: PasswordResetRequest):
    """Request a password reset - sends email with reset link"""
    # Find user by email
    user = await db.users.find_one({"email": request_body.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"ok": True, "message": "If an account exists with this email, a reset link has been sent."}
    
    # Check if email is configured
    configured = await is_email_configured_global()
    if not configured:
        raise HTTPException(status_code=503, detail="Email service is not configured. Please contact your administrator.")
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "user_id": user["user_id"],
                "token": reset_token,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Get the email config
    config = await get_global_email_config()
    
    # Send reset email
    reset_url = f"{os.environ.get('FRONTEND_URL', 'https://projectdash.me')}/reset-password?token={reset_token}"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #e2e8f0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px;">
            <h1 style="color: #22c55e; margin-bottom: 20px;">Password Reset</h1>
            <p style="margin-bottom: 20px;">Hello {user['name']},</p>
            <p style="margin-bottom: 20px;">You requested a password reset for your ProjectDash account.</p>
            <p style="margin-bottom: 30px;">Click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="{reset_url}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">If you didn't request this reset, you can safely ignore this email.</p>
        </div>
    </body>
    </html>
    """
    
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Password Reset - ProjectDash"
        message["From"] = formataddr((config.get("sender_name", "ProjectDash"), config.get("sender_email")))
        message["To"] = user["email"]
        message.attach(MIMEText(html_content, "html"))
        
        # Use start_tls for port 587 (STARTTLS), use_tls for port 465 (direct TLS)
        use_starttls = config["smtp_port"] == 587
        await aiosmtplib.send(
            message,
            hostname=config["smtp_host"],
            port=config["smtp_port"],
            username=config["smtp_user"],
            password=config["smtp_password"],
            start_tls=use_starttls,
            use_tls=not use_starttls and config.get("smtp_use_tls", False)
        )
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reset email. Please try again later.")
    
    return {"ok": True, "message": "If an account exists with this email, a reset link has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordResetConfirm):
    """Reset password using the token from email"""
    # Find valid reset token
    reset_doc = await db.password_resets.find_one({
        "token": reset_data.token,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password
    password_hash = hash_password(reset_data.new_password)
    await db.users.update_one(
        {"user_id": reset_doc["user_id"]},
        {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Delete the reset token
    await db.password_resets.delete_one({"token": reset_data.token})
    
    # Invalidate all existing sessions for this user
    await db.user_sessions.delete_many({"user_id": reset_doc["user_id"]})
    
    return {"ok": True, "message": "Password reset successfully. Please login with your new password."}

# ============== Group Management ==============

@api_router.get("/group", response_model=GroupResponse)
async def get_my_group(request: Request):
    """Get current user's group"""
    user = await require_auth(request)
    
    group_doc = await db.groups.find_one(
        {"group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not group_doc:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get member count
    member_count = await db.users.count_documents({"group_id": user["group_id"]})
    group_doc["member_count"] = member_count
    
    return group_doc

@api_router.get("/group/members")
async def get_group_members(request: Request):
    """Get all members of current user's group"""
    user = await require_auth(request)
    
    members = await db.users.find(
        {"group_id": user["group_id"]},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    return members

@api_router.post("/group/invite")
async def invite_user(request: Request, invite: InviteUserRequest):
    """Invite a new user to the group (admin only)"""
    user = await require_admin(request)
    
    # Check if email already exists
    existing = await db.users.find_one({"email": invite.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    valid_roles = ["employee", "hr", "member", "admin"]
    role = invite.role if invite.role in valid_roles else "employee"
    
    # Create user with temporary password
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    temp_password = secrets.token_urlsafe(12)
    password_hash = hash_password(temp_password)
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": invite.email,
        "name": invite.name,
        "password_hash": password_hash,
        "role": role,
        "group_id": user["group_id"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "invited_by": user["user_id"],
        "needs_password_change": True
    })
    
    return {
        "ok": True,
        "user_id": user_id,
        "temp_password": temp_password,
        "message": f"User invited. Temporary password: {temp_password}"
    }

@api_router.post("/group/users")
async def create_user_directly(request: Request, create_req: CreateUserRequest):
    """Create a new user directly in the group (admin only)"""
    user = await require_admin(request)
    
    # Check if email already exists
    existing = await db.users.find_one({"email": create_req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    valid_roles = ["employee", "hr", "member", "admin"]
    role = create_req.role if create_req.role in valid_roles else "employee"
    
    # Create user
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(create_req.password)
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": create_req.email,
        "name": create_req.name,
        "password_hash": password_hash,
        "role": role,
        "group_id": user["group_id"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "created_by": user["user_id"],
        "needs_password_change": False
    })
    
    return {
        "ok": True,
        "user_id": user_id,
        "message": f"User {create_req.name} created successfully"
    }

@api_router.put("/group/users/{user_id}/role")
async def update_user_role(request: Request, user_id: str, role_req: UpdateUserRoleRequest):
    """Update a user's role (admin only)"""
    admin = await require_admin(request)
    
    # Validate role
    valid_roles = ["employee", "hr", "member", "admin"]
    if role_req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    # Find the target user
    target_user = await db.users.find_one({
        "user_id": user_id,
        "group_id": admin["group_id"]
    })
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot change owner's role
    if target_user["role"] == "owner":
        raise HTTPException(status_code=400, detail="Cannot change owner's role")
    
    # Cannot demote yourself if you're the only admin
    if user_id == admin["user_id"] and role_req.role not in ["admin", "owner"]:
        admin_count = await db.users.count_documents({
            "group_id": admin["group_id"],
            "role": {"$in": ["admin", "owner"]}
        })
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote yourself - you're the only admin")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role_req.role, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"ok": True, "message": f"User role updated to {role_req.role}"}

@api_router.put("/group/users/{user_id}/deactivate")
async def deactivate_user(request: Request, user_id: str):
    """Deactivate a user (admin only)"""
    admin = await require_admin(request)
    
    # Find the target user
    target_user = await db.users.find_one({
        "user_id": user_id,
        "group_id": admin["group_id"]
    })
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot deactivate owner
    if target_user["role"] == "owner":
        raise HTTPException(status_code=400, detail="Cannot deactivate the owner")
    
    # Cannot deactivate yourself
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc), "deactivated_by": admin["user_id"]}}
    )
    
    return {"ok": True, "message": "User deactivated"}

@api_router.put("/group/users/{user_id}/activate")
async def activate_user(request: Request, user_id: str):
    """Reactivate a user (admin only)"""
    admin = await require_admin(request)
    
    # Find the target user
    target_user = await db.users.find_one({
        "user_id": user_id,
        "group_id": admin["group_id"]
    })
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": True}, "$unset": {"deactivated_at": "", "deactivated_by": ""}}
    )
    
    return {"ok": True, "message": "User activated"}

@api_router.get("/group/users")
async def get_group_users(request: Request, include_inactive: bool = False):
    """Get all users in the group with management info (admin only)"""
    admin = await require_admin(request)
    
    query = {"group_id": admin["group_id"]}
    if not include_inactive:
        query["$or"] = [{"is_active": True}, {"is_active": {"$exists": False}}]
    
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return users

# ============== Invoice Endpoints ==============

@api_router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(request: Request, status: Optional[str] = None):
    """List all invoices for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return invoices

@api_router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(request: Request, invoice: InvoiceCreate):
    """Create a new invoice"""
    user = await require_auth(request)
    
    # Generate invoice number
    count = await db.invoices.count_documents({"group_id": user["group_id"]})
    invoice_number = f"INV-{count + 1:05d}"
    
    # Calculate totals
    subtotal = 0
    vat_total = 0
    items_with_totals = []
    
    for item in invoice.items:
        item_total = item.quantity * item.unit_price
        item_vat = item_total * (item.vat_rate / 100)
        subtotal += item_total
        vat_total += item_vat
        items_with_totals.append({
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "vat_rate": item.vat_rate,
            "total": item_total,
            "vat": item_vat
        })
    
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    invoice_doc = {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "group_id": user["group_id"],
        "customer_name": invoice.customer_name,
        "customer_email": invoice.customer_email,
        "customer_address": invoice.customer_address,
        "items": items_with_totals,
        "subtotal": round(subtotal, 2),
        "vat_total": round(vat_total, 2),
        "total": round(subtotal + vat_total, 2),
        "status": "draft",
        "due_date": invoice.due_date or (datetime.now(timezone.utc) + timedelta(days=30)),
        "notes": invoice.notes,
        "created_at": datetime.now(timezone.utc),
        "created_by": user["user_id"]
    }
    
    await db.invoices.insert_one(invoice_doc)
    
    # Remove _id before returning
    invoice_doc.pop("_id", None)
    return invoice_doc

@api_router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(request: Request, invoice_id: str):
    """Get a specific invoice"""
    user = await require_auth(request)
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@api_router.patch("/invoices/{invoice_id}/status")
async def update_invoice_status(request: Request, invoice_id: str, status: str):
    """Update invoice status"""
    user = await require_auth(request)
    
    if status not in ["draft", "sent", "paid", "overdue", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "group_id": user["group_id"]},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"ok": True, "status": status}

# ============== Employee/Payroll Endpoints ==============

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def list_employees(request: Request, status: Optional[str] = None):
    """List all employees for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if status:
        query["status"] = status
    
    employees = await db.employees.find(
        query,
        {"_id": 0}
    ).sort("name", 1).to_list(1000)
    
    return employees

@api_router.post("/employees", response_model=EmployeeResponse, status_code=201)
async def create_employee(request: Request, employee: EmployeeCreate):
    """Create a new employee"""
    user = await require_auth(request)
    
    employee_id = f"emp_{uuid.uuid4().hex[:12]}"
    employee_doc = {
        "employee_id": employee_id,
        "group_id": user["group_id"],
        "name": employee.name,
        "email": employee.email,
        "position": employee.position,
        "department": employee.department,
        "salary": employee.salary,
        "start_date": employee.start_date or datetime.now(timezone.utc),
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.employees.insert_one(employee_doc)
    employee_doc.pop("_id", None)
    return employee_doc

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(request: Request, employee_id: str):
    """Get a specific employee"""
    user = await require_auth(request)
    
    employee = await db.employees.find_one(
        {"employee_id": employee_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee

# ============== Expense Endpoints ==============

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def list_expenses(request: Request, status: Optional[str] = None, category: Optional[str] = None):
    """List all expenses for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    expenses = await db.expenses.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return expenses

@api_router.post("/expenses", response_model=ExpenseResponse, status_code=201)
async def create_expense(request: Request, expense: ExpenseCreate):
    """Create a new expense"""
    user = await require_auth(request)
    
    expense_id = f"exp_{uuid.uuid4().hex[:12]}"
    expense_doc = {
        "expense_id": expense_id,
        "group_id": user["group_id"],
        "description": expense.description,
        "amount": expense.amount,
        "category": expense.category,
        "date": expense.date or datetime.now(timezone.utc),
        "receipt_url": expense.receipt_url,
        "project_id": expense.project_id,
        "status": "pending",
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.expenses.insert_one(expense_doc)
    expense_doc.pop("_id", None)
    return expense_doc

@api_router.patch("/expenses/{expense_id}/status")
async def update_expense_status(request: Request, expense_id: str, status: str):
    """Update expense status (admin only)"""
    user = await require_admin(request)
    
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.expenses.update_one(
        {"expense_id": expense_id, "group_id": user["group_id"]},
        {"$set": {"status": status, "reviewed_by": user["user_id"], "reviewed_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"ok": True, "status": status}

# ============== Project Endpoints ==============

@api_router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(request: Request, status: Optional[str] = None):
    """List all projects for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Add task count to each project
    for project in projects:
        task_count = await db.tasks.count_documents({"project_id": project["project_id"]})
        project["task_count"] = task_count
    
    return projects

@api_router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(request: Request, project: ProjectCreate):
    """Create a new project"""
    user = await require_auth(request)
    
    project_id = f"prj_{uuid.uuid4().hex[:12]}"
    project_doc = {
        "project_id": project_id,
        "group_id": user["group_id"],
        "name": project.name,
        "description": project.description,
        "client_name": project.client_name,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "budget": project.budget,
        "status": "planning",
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.projects.insert_one(project_doc)
    project_doc.pop("_id", None)
    project_doc["task_count"] = 0
    return project_doc

@api_router.get("/projects/{project_id}")
async def get_project(request: Request, project_id: str):
    """Get a specific project with its tasks"""
    user = await require_auth(request)
    
    project = await db.projects.find_one(
        {"project_id": project_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get tasks
    tasks = await db.tasks.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    project["tasks"] = tasks
    project["task_count"] = len(tasks)
    
    return project

@api_router.post("/projects/{project_id}/tasks")
async def create_task(request: Request, project_id: str, task: TaskCreate):
    """Create a new task for a project"""
    user = await require_auth(request)
    
    # Verify project exists and belongs to group
    project = await db.projects.find_one(
        {"project_id": project_id, "group_id": user["group_id"]}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    task_id = f"tsk_{uuid.uuid4().hex[:12]}"
    task_doc = {
        "task_id": task_id,
        "project_id": project_id,
        "group_id": user["group_id"],
        "title": task.title,
        "description": task.description,
        "assignee_id": task.assignee_id,
        "due_date": task.due_date,
        "priority": task.priority,
        "status": "todo",
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    return task_doc

@api_router.patch("/projects/{project_id}/tasks/{task_id}")
async def update_task(request: Request, project_id: str, task_id: str, status: Optional[str] = None):
    """Update a task"""
    user = await require_auth(request)
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    if status:
        if status not in ["todo", "in_progress", "done"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = status
    
    result = await db.tasks.update_one(
        {"task_id": task_id, "project_id": project_id, "group_id": user["group_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"ok": True}

# ============== Checklist Endpoints ==============

@api_router.get("/checklists", response_model=List[ChecklistResponse])
async def list_checklists(request: Request, status: Optional[str] = None, category: Optional[str] = None):
    """List all checklists for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    checklists = await db.checklists.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return checklists

@api_router.post("/checklists", response_model=ChecklistResponse, status_code=201)
async def create_checklist(request: Request, checklist: ChecklistCreate):
    """Create a new checklist"""
    user = await require_auth(request)
    
    checklist_id = f"chk_{uuid.uuid4().hex[:12]}"
    items = [{"text": item.text, "required": item.required, "checked": False} for item in checklist.items]
    
    checklist_doc = {
        "checklist_id": checklist_id,
        "group_id": user["group_id"],
        "title": checklist.title,
        "description": checklist.description,
        "category": checklist.category,
        "items": items,
        "project_id": checklist.project_id,
        "status": "template",
        "completed_items": 0,
        "total_items": len(items),
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.checklists.insert_one(checklist_doc)
    checklist_doc.pop("_id", None)
    return checklist_doc

@api_router.patch("/checklists/{checklist_id}/items/{item_index}")
async def toggle_checklist_item(request: Request, checklist_id: str, item_index: int):
    """Toggle a checklist item"""
    user = await require_auth(request)
    
    checklist = await db.checklists.find_one(
        {"checklist_id": checklist_id, "group_id": user["group_id"]}
    )
    
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    if item_index < 0 or item_index >= len(checklist["items"]):
        raise HTTPException(status_code=400, detail="Invalid item index")
    
    # Toggle the item
    items = checklist["items"]
    items[item_index]["checked"] = not items[item_index]["checked"]
    
    # Update counts
    completed_items = sum(1 for item in items if item["checked"])
    status = "completed" if completed_items == len(items) else "in_progress"
    
    await db.checklists.update_one(
        {"checklist_id": checklist_id},
        {"$set": {
            "items": items,
            "completed_items": completed_items,
            "status": status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"ok": True, "completed_items": completed_items, "status": status}

# ============== Form Builder Endpoints ==============

@api_router.get("/forms")
async def list_form_templates(request: Request, category: Optional[str] = None):
    """List all form templates for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if category:
        query["category"] = category
    
    forms = await db.form_templates.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Add submission count
    for form in forms:
        count = await db.form_submissions.count_documents({"form_id": form["form_id"]})
        form["submission_count"] = count
    
    return forms

@api_router.post("/forms", status_code=201)
async def create_form_template(request: Request, form: FormTemplateCreate):
    """Create a new form template (admin only)"""
    user = await require_admin(request)
    
    form_id = f"frm_{uuid.uuid4().hex[:12]}"
    
    # Add field IDs
    fields = []
    for i, field in enumerate(form.fields):
        field_data = {
            "field_id": f"fld_{uuid.uuid4().hex[:8]}",
            "field_type": field.field_type,
            "label": field.label,
            "required": field.required,
            "options": field.options,
            "placeholder": field.placeholder,
            "order": i
        }
        fields.append(field_data)
    
    form_doc = {
        "form_id": form_id,
        "group_id": user["group_id"],
        "title": form.title,
        "description": form.description,
        "category": form.category,
        "fields": fields,
        "is_active": True,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.form_templates.insert_one(form_doc)
    form_doc.pop("_id", None)
    form_doc["submission_count"] = 0
    return form_doc

@api_router.get("/forms/{form_id}")
async def get_form_template(request: Request, form_id: str):
    """Get a specific form template"""
    user = await require_auth(request)
    
    form = await db.form_templates.find_one(
        {"form_id": form_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not form:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    # Add submission count
    count = await db.form_submissions.count_documents({"form_id": form_id})
    form["submission_count"] = count
    
    return form

@api_router.delete("/forms/{form_id}")
async def delete_form_template(request: Request, form_id: str):
    """Delete a form template (admin only)"""
    user = await require_admin(request)
    
    result = await db.form_templates.delete_one(
        {"form_id": form_id, "group_id": user["group_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    return {"ok": True, "message": "Form template deleted"}

@api_router.get("/forms/{form_id}/submissions")
async def list_form_submissions(request: Request, form_id: str, project_id: Optional[str] = None):
    """List all submissions for a form"""
    user = await require_auth(request)
    
    # Verify form exists and belongs to group
    form = await db.form_templates.find_one(
        {"form_id": form_id, "group_id": user["group_id"]}
    )
    if not form:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    query = {"form_id": form_id, "group_id": user["group_id"]}
    if project_id:
        query["project_id"] = project_id
    
    submissions = await db.form_submissions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Add form title and project name to each submission
    for sub in submissions:
        sub["form_title"] = form["title"]
        if sub.get("project_id"):
            project = await db.projects.find_one(
                {"project_id": sub["project_id"]},
                {"_id": 0, "name": 1}
            )
            sub["project_name"] = project["name"] if project else None
        
        # Get submitter name
        submitter = await db.users.find_one(
            {"user_id": sub["submitted_by"]},
            {"_id": 0, "name": 1}
        )
        sub["submitted_by_name"] = submitter["name"] if submitter else None
    
    return submissions

@api_router.post("/forms/{form_id}/submissions", status_code=201)
async def create_form_submission(request: Request, form_id: str, submission: FormSubmissionCreate):
    """Submit a form response"""
    user = await require_auth(request)
    
    # Verify form exists
    form = await db.form_templates.find_one(
        {"form_id": form_id, "group_id": user["group_id"]}
    )
    if not form:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    if not form.get("is_active", True):
        raise HTTPException(status_code=400, detail="Form is not active")
    
    # Validate required fields
    for field in form.get("fields", []):
        if field.get("required"):
            field_id = field.get("field_id")
            if field_id not in submission.responses or not submission.responses[field_id]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Required field '{field.get('label')}' is missing"
                )
    
    # Verify project if provided
    project_name = None
    if submission.project_id:
        project = await db.projects.find_one(
            {"project_id": submission.project_id, "group_id": user["group_id"]}
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        project_name = project["name"]
    
    submission_id = f"sub_{uuid.uuid4().hex[:12]}"
    
    submission_doc = {
        "submission_id": submission_id,
        "form_id": form_id,
        "group_id": user["group_id"],
        "project_id": submission.project_id,
        "responses": submission.responses,
        "submitted_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.form_submissions.insert_one(submission_doc)
    submission_doc.pop("_id", None)
    
    # Add extra info for response
    submission_doc["form_title"] = form["title"]
    submission_doc["project_name"] = project_name
    submission_doc["submitted_by_name"] = user["name"]
    
    return submission_doc

@api_router.get("/submissions/{submission_id}")
async def get_form_submission(request: Request, submission_id: str):
    """Get a specific form submission"""
    user = await require_auth(request)
    
    submission = await db.form_submissions.find_one(
        {"submission_id": submission_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get form details
    form = await db.form_templates.find_one(
        {"form_id": submission["form_id"]},
        {"_id": 0}
    )
    submission["form_title"] = form["title"] if form else "Unknown Form"
    submission["form_fields"] = form.get("fields", []) if form else []
    
    # Get project name
    if submission.get("project_id"):
        project = await db.projects.find_one(
            {"project_id": submission["project_id"]},
            {"_id": 0, "name": 1}
        )
        submission["project_name"] = project["name"] if project else None
    
    # Get submitter name
    submitter = await db.users.find_one(
        {"user_id": submission["submitted_by"]},
        {"_id": 0, "name": 1}
    )
    submission["submitted_by_name"] = submitter["name"] if submitter else None
    
    return submission

@api_router.get("/submissions/{submission_id}/pdf")
async def get_form_submission_pdf(request: Request, submission_id: str):
    """Generate and return PDF for a form submission"""
    from fastapi.responses import Response as FastAPIResponse
    
    user = await require_auth(request)
    
    # Get submission
    submission = await db.form_submissions.find_one(
        {"submission_id": submission_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get form details
    form = await db.form_templates.find_one(
        {"form_id": submission["form_id"]},
        {"_id": 0}
    )
    
    if not form:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    # Get group name
    group = await db.groups.find_one(
        {"group_id": user["group_id"]},
        {"_id": 0, "name": 1}
    )
    group_name = group["name"] if group else "ProjectDash"
    
    # Get project name
    project_name = None
    if submission.get("project_id"):
        project = await db.projects.find_one(
            {"project_id": submission["project_id"]},
            {"_id": 0, "name": 1}
        )
        project_name = project["name"] if project else None
    
    # Get submitter name
    submitter = await db.users.find_one(
        {"user_id": submission["submitted_by"]},
        {"_id": 0, "name": 1}
    )
    submitted_by_name = submitter["name"] if submitter else None
    
    # Generate PDF
    pdf_bytes = generate_form_submission_pdf(
        submission, form, group_name, project_name, submitted_by_name
    )
    
    # Generate filename
    filename = f"{form['title'].replace(' ', '_')}_{submission_id}.pdf"
    
    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/submissions")
async def list_all_submissions(request: Request, project_id: Optional[str] = None):
    """List all form submissions for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if project_id:
        query["project_id"] = project_id
    
    submissions = await db.form_submissions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Add form title and project name to each submission
    for sub in submissions:
        form = await db.form_templates.find_one(
            {"form_id": sub["form_id"]},
            {"_id": 0, "title": 1}
        )
        sub["form_title"] = form["title"] if form else "Unknown Form"
        
        if sub.get("project_id"):
            project = await db.projects.find_one(
                {"project_id": sub["project_id"]},
                {"_id": 0, "name": 1}
            )
            sub["project_name"] = project["name"] if project else None
        
        submitter = await db.users.find_one(
            {"user_id": sub["submitted_by"]},
            {"_id": 0, "name": 1}
        )
        sub["submitted_by_name"] = submitter["name"] if submitter else None
    
    return submissions

# ============== HSE Document Endpoints ==============

@api_router.get("/hse-documents", response_model=List[HSEDocumentResponse])
async def list_hse_documents(request: Request, document_type: Optional[str] = None):
    """List all HSE documents for the group"""
    user = await require_auth(request)
    
    query = {"group_id": user["group_id"]}
    if document_type:
        query["document_type"] = document_type
    
    documents = await db.hse_documents.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return documents

@api_router.post("/hse-documents", response_model=HSEDocumentResponse, status_code=201)
async def create_hse_document(request: Request, document: HSEDocumentCreate):
    """Create a new HSE document"""
    user = await require_auth(request)
    
    document_id = f"hse_{uuid.uuid4().hex[:12]}"
    document_doc = {
        "document_id": document_id,
        "group_id": user["group_id"],
        "title": document.title,
        "document_type": document.document_type,
        "content": document.content,
        "file_url": document.file_url,
        "expiry_date": document.expiry_date,
        "project_id": document.project_id,
        "status": "active",
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.hse_documents.insert_one(document_doc)
    document_doc.pop("_id", None)
    return document_doc

@api_router.get("/hse-documents/{document_id}", response_model=HSEDocumentResponse)
async def get_hse_document(request: Request, document_id: str):
    """Get a specific HSE document"""
    user = await require_auth(request)
    
    document = await db.hse_documents.find_one(
        {"document_id": document_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document

# ============== Dashboard Stats ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    """Get dashboard statistics for the group"""
    user = await require_auth(request)
    group_id = user["group_id"]
    
    # Invoice stats
    total_invoices = await db.invoices.count_documents({"group_id": group_id})
    pending_invoices = await db.invoices.count_documents({"group_id": group_id, "status": {"$in": ["draft", "sent"]}})
    
    # Calculate total revenue (paid invoices)
    pipeline = [
        {"$match": {"group_id": group_id, "status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Pending invoice value
    pipeline = [
        {"$match": {"group_id": group_id, "status": {"$in": ["draft", "sent"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    pending_result = await db.invoices.aggregate(pipeline).to_list(1)
    pending_value = pending_result[0]["total"] if pending_result else 0
    
    # Employee stats
    total_employees = await db.employees.count_documents({"group_id": group_id, "status": "active"})
    
    # Calculate monthly payroll
    pipeline = [
        {"$match": {"group_id": group_id, "status": "active"}},
        {"$group": {"_id": None, "total": {"$sum": "$salary"}}}
    ]
    payroll_result = await db.employees.aggregate(pipeline).to_list(1)
    monthly_payroll = payroll_result[0]["total"] if payroll_result else 0
    
    # Expense stats
    pending_expenses = await db.expenses.count_documents({"group_id": group_id, "status": "pending"})
    
    # This month's expenses
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    pipeline = [
        {"$match": {"group_id": group_id, "status": "approved", "date": {"$gte": start_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    monthly_expenses_result = await db.expenses.aggregate(pipeline).to_list(1)
    monthly_expenses = monthly_expenses_result[0]["total"] if monthly_expenses_result else 0
    
    # Project stats
    active_projects = await db.projects.count_documents({"group_id": group_id, "status": "active"})
    total_projects = await db.projects.count_documents({"group_id": group_id})
    
    # Checklist stats
    pending_checklists = await db.checklists.count_documents({"group_id": group_id, "status": "in_progress"})
    
    # HSE stats
    expiring_hse = await db.hse_documents.count_documents({
        "group_id": group_id,
        "status": "active",
        "expiry_date": {"$lte": datetime.now(timezone.utc) + timedelta(days=30)}
    })
    
    return {
        "invoices": {
            "total": total_invoices,
            "pending": pending_invoices,
            "revenue": round(total_revenue, 2),
            "pending_value": round(pending_value, 2)
        },
        "payroll": {
            "employees": total_employees,
            "monthly_total": round(monthly_payroll, 2)
        },
        "expenses": {
            "pending_approval": pending_expenses,
            "monthly_total": round(monthly_expenses, 2)
        },
        "projects": {
            "active": active_projects,
            "total": total_projects
        },
        "checklists": {
            "in_progress": pending_checklists
        },
        "hse": {
            "expiring_soon": expiring_hse
        }
    }

# ============== Payroll Run Endpoints ==============

@api_router.get("/payroll/runs")
async def list_payroll_runs(request: Request):
    """List all payroll runs for the group"""
    user = await require_auth(request)
    
    runs = await db.payroll_runs.find(
        {"group_id": user["group_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return runs

@api_router.post("/payroll/runs", status_code=201)
async def create_payroll_run(request: Request, run: PayrollRunCreate):
    """Create a new payroll run"""
    user = await require_admin(request)
    
    # Check if run already exists for this month/year
    existing = await db.payroll_runs.find_one({
        "group_id": user["group_id"],
        "month": run.month,
        "year": run.year
    })
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Payroll run for {run.month}/{run.year} already exists")
    
    # Get active employees
    employees = await db.employees.find(
        {"group_id": user["group_id"], "status": "active"},
        {"_id": 0}
    ).to_list(1000)
    
    if not employees:
        raise HTTPException(status_code=400, detail="No active employees found")
    
    # Create employee snapshot for this run
    employee_snapshots = []
    total_amount = 0
    
    for emp in employees:
        snapshot = {
            "employee_id": emp["employee_id"],
            "name": emp["name"],
            "position": emp["position"],
            "department": emp.get("department"),
            "salary": emp["salary"],
            "deductions": 0,  # Can be extended for tax calculations
            "net_pay": emp["salary"]
        }
        employee_snapshots.append(snapshot)
        total_amount += emp["salary"]
    
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    run_doc = {
        "run_id": run_id,
        "group_id": user["group_id"],
        "month": run.month,
        "year": run.year,
        "employees": employee_snapshots,
        "total_amount": round(total_amount, 2),
        "status": "draft",
        "notes": run.notes,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.payroll_runs.insert_one(run_doc)
    run_doc.pop("_id", None)
    return run_doc

@api_router.get("/payroll/runs/{run_id}")
async def get_payroll_run(request: Request, run_id: str):
    """Get a specific payroll run"""
    user = await require_auth(request)
    
    run = await db.payroll_runs.find_one(
        {"run_id": run_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    
    return run

@api_router.patch("/payroll/runs/{run_id}/status")
async def update_payroll_run_status(request: Request, run_id: str, status: str):
    """Update payroll run status (admin only)"""
    user = await require_admin(request)
    
    if status not in ["draft", "processed", "paid"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": status}
    if status == "processed":
        update_data["processed_at"] = datetime.now(timezone.utc)
    
    result = await db.payroll_runs.update_one(
        {"run_id": run_id, "group_id": user["group_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    
    return {"ok": True, "status": status}

# ============== File Upload Endpoints ==============

@api_router.post("/upload", response_model=FileUploadResponse)
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Upload a file"""
    user = await require_auth(request)
    
    result = await save_upload_file(file, user["group_id"])
    return result

@api_router.get("/files/{group_id}/{filename}")
async def get_file(group_id: str, filename: str, request: Request):
    """Get an uploaded file"""
    from fastapi.responses import FileResponse
    
    # Security: verify user has access to this group
    user = await get_current_user(request)
    if not user or user["group_id"] != group_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path = UPLOAD_DIR / group_id / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get content type from database
    file_doc = await db.files.find_one({"safe_filename": filename}, {"_id": 0})
    content_type = file_doc.get("content_type", "application/octet-stream") if file_doc else "application/octet-stream"
    
    return FileResponse(file_path, media_type=content_type)

# ============== Invoice Email Endpoint ==============

@api_router.post("/invoices/{invoice_id}/send")
async def send_invoice(request: Request, invoice_id: str, send_request: SendInvoiceRequest, background_tasks: BackgroundTasks):
    """Send invoice via email"""
    user = await require_auth(request)
    
    # Get invoice
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Determine recipient email
    recipient_email = send_request.recipient_email or invoice.get("customer_email")
    
    if not recipient_email:
        raise HTTPException(status_code=400, detail="No recipient email provided")
    
    # Get group name
    group_doc = await db.groups.find_one(
        {"group_id": user["group_id"]},
        {"_id": 0, "name": 1}
    )
    group_name = group_doc.get("name", "ProjectDash") if group_doc else "ProjectDash"
    
    # Queue email in background
    background_tasks.add_task(send_invoice_email, invoice, recipient_email, group_name)
    
    # Update invoice status to sent
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc), "sent_to": recipient_email}}
    )
    
    return {"ok": True, "message": f"Invoice queued for delivery to {recipient_email}"}

# ============== Email Settings Endpoints ==============

@api_router.get("/settings/email")
async def get_email_settings(request: Request):
    """Get email configuration status (admin only) - shows global SMTP + group sender name"""
    user = await require_admin(request)
    
    # Get global config
    global_config = await get_global_email_config()
    configured = await is_email_configured_global()
    
    # Get group-specific sender name
    group_sender_name = await get_group_sender_name(user["group_id"])
    
    return {
        "configured": configured,
        "smtp_host": global_config.get("smtp_host", ""),
        "smtp_port": global_config.get("smtp_port", 587),
        "smtp_user": global_config.get("smtp_user", "")[:3] + "***" if global_config.get("smtp_user") else "",
        "smtp_use_tls": global_config.get("smtp_use_tls", True),
        "sender_email": global_config.get("sender_email", ""),
        "sender_name": group_sender_name or global_config.get("sender_name", "ProjectDash"),
        "is_global_config": True  # Flag to indicate this is global SMTP
    }

@api_router.put("/settings/email")
async def update_email_settings(request: Request, settings: EmailSettingsUpdate):
    """Update global email configuration (admin only) - sets SMTP for all groups"""
    user = await require_admin(request)
    
    # Build update document for GLOBAL config
    update_data = {
        "group_id": "__global__",  # Special key for global config
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_user": settings.smtp_user,
        "smtp_use_tls": settings.smtp_use_tls,
        "sender_email": settings.sender_email,
        "sender_name": settings.sender_name,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": user["user_id"]
    }
    
    # Only update password if provided
    if settings.smtp_password:
        update_data["smtp_password"] = settings.smtp_password
    
    # Upsert the global config
    await db.email_configs.update_one(
        {"group_id": "__global__"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"ok": True, "message": "Global email settings saved successfully"}

@api_router.put("/settings/email/sender-name")
async def update_group_sender_name(request: Request, settings: GroupEmailSettingsUpdate):
    """Update sender name for the current group (admin only)"""
    user = await require_admin(request)
    
    # Update the group's sender_name
    await db.groups.update_one(
        {"group_id": user["group_id"]},
        {"$set": {"sender_name": settings.sender_name, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"ok": True, "message": "Sender name updated successfully"}

@api_router.post("/settings/email/test")
async def test_email_settings(request: Request, test_email: str):
    """Send a test email to verify SMTP configuration"""
    user = await require_admin(request)
    
    configured = await is_email_configured_global()
    if not configured:
        raise HTTPException(status_code=400, detail="SMTP is not configured. Please configure SMTP settings first.")
    
    html_content = """
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #FF4500;">ProjectDash Email Test</h1>
        <p>This is a test email to verify your SMTP configuration is working correctly.</p>
        <p>If you received this email, your email settings are configured properly!</p>
        <hr>
        <p style="color: #666; font-size: 0.9em;">Sent from ProjectDash Business Management Platform</p>
    </body>
    </html>
    """
    
    success = await send_email_smtp(test_email, "ProjectDash - Email Configuration Test", html_content, group_id=user["group_id"])
    
    if success:
        return {"ok": True, "message": f"Test email sent successfully to {test_email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Please check your SMTP configuration and server logs.")

# ============== Group Settings Endpoints ==============

@api_router.get("/settings/group")
async def get_group_settings(request: Request):
    """Get group settings including hourly rate"""
    user = await get_current_user(request)
    
    group = await db.groups.find_one({"group_id": user["group_id"]}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return {
        "group_id": group["group_id"],
        "name": group["name"],
        "hourly_rate": group.get("hourly_rate", 0),
        "akkord_base_prices": group.get("akkord_base_prices", AKKORD_BASE_PRICES),
        "akkord_addon_prices": group.get("akkord_addon_prices", AKKORD_ADDON_PRICES)
    }

@api_router.put("/settings/group")
async def update_group_settings(request: Request, settings: GroupSettingsUpdate):
    """Update group settings (admin only)"""
    user = await require_admin(request)
    
    await db.groups.update_one(
        {"group_id": user["group_id"]},
        {"$set": {"hourly_rate": settings.hourly_rate, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"ok": True, "message": "Group settings updated"}

@api_router.get("/group/employees")
async def get_group_employees(request: Request):
    """Get all employees/users in the current group"""
    user = await get_current_user(request)
    
    users = await db.users.find(
        {"group_id": user["group_id"]},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(100)
    
    return users

# ============== Dashboard Analytics ==============

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(request: Request, period: str = "month"):
    """Get dashboard analytics - different data for employees vs admins/HR"""
    user = await get_current_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Determine date range
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:  # month
        start_date = now - timedelta(days=30)
    
    is_admin = user["role"] in ["admin", "owner", "hr"]
    
    if is_admin:
        # Admin/Owner/HR View - Full analytics with margins
        return await get_admin_analytics(user["group_id"], start_date, now)
    else:
        # Employee View - Personal production stats
        return await get_employee_analytics(user["user_id"], user["group_id"], start_date, now)

async def get_employee_analytics(user_id: str, group_id: str, start_date: datetime, end_date: datetime):
    """Get analytics for an employee - their production and earnings"""
    
    # Get all work logs where this user participated
    work_logs = await db.work_logs.find({
        "group_id": group_id,
        "date": {"$gte": start_date, "$lte": end_date},
        "$or": [
            {"user_id": user_id},
            {"workers.user_id": user_id}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Calculate user's earnings
    total_earnings = 0
    total_hours = 0
    total_area = 0
    job_count = len(work_logs)
    earnings_history = []
    
    for log in work_logs:
        # Check if user is in workers list
        user_payment = 0
        user_hours = 0
        
        for worker in log.get("workers", []):
            if worker["user_id"] == user_id:
                user_payment = worker.get("payment", 0)
                user_hours = worker.get("hours", 0)
                break
        
        # If not in workers list but is creator
        if user_payment == 0 and log.get("user_id") == user_id:
            user_payment = log.get("total_payment", 0)
            user_hours = log.get("total_hours", 0)
        
        total_earnings += user_payment
        total_hours += user_hours
        if log.get("work_type") == "akkord":
            total_area += log.get("area", 0)
        
        earnings_history.append({
            "date": log["date"].isoformat() if isinstance(log["date"], datetime) else log["date"],
            "amount": user_payment,
            "work_type": log.get("work_type", "akkord")
        })
    
    # Calculate averages
    avg_per_job = total_earnings / job_count if job_count > 0 else 0
    avg_per_hour = total_earnings / total_hours if total_hours > 0 else 0
    
    # Get all-time earnings for median calculation
    all_time_logs = await db.work_logs.find({
        "group_id": group_id,
        "$or": [
            {"user_id": user_id},
            {"workers.user_id": user_id}
        ]
    }, {"_id": 0, "workers": 1, "user_id": 1, "total_payment": 1}).to_list(5000)
    
    all_payments = []
    for log in all_time_logs:
        for worker in log.get("workers", []):
            if worker["user_id"] == user_id:
                all_payments.append(worker.get("payment", 0))
                break
        else:
            if log.get("user_id") == user_id:
                all_payments.append(log.get("total_payment", 0))
    
    median_income = sorted(all_payments)[len(all_payments)//2] if all_payments else 0
    
    return {
        "type": "employee",
        "period_earnings": round(total_earnings, 2),
        "period_hours": round(total_hours, 2),
        "period_area": round(total_area, 2),
        "job_count": job_count,
        "avg_per_job": round(avg_per_job, 2),
        "avg_per_hour": round(avg_per_hour, 2),
        "median_income": round(median_income, 2),
        "earnings_history": sorted(earnings_history, key=lambda x: x["date"])[-30:]  # Last 30 entries
    }

async def get_admin_analytics(group_id: str, start_date: datetime, end_date: datetime):
    """Get analytics for admins/owners/HR - margins and company overview"""
    
    # Get all work logs for the period
    work_logs = await db.work_logs.find({
        "group_id": group_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(5000)
    
    # Get all expenses for the period
    expenses = await db.expenses.find({
        "group_id": group_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0, "amount": 1, "status": 1}).to_list(5000)
    
    # Get all invoices for revenue
    invoices = await db.invoices.find({
        "group_id": group_id,
        "created_at": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0, "total": 1, "status": 1}).to_list(5000)
    
    # Calculate totals
    total_labor_cost = sum(log.get("total_payment", 0) for log in work_logs)
    total_expenses = sum(exp.get("amount", 0) for exp in expenses if exp.get("status") == "approved")
    total_revenue = sum(inv.get("total", 0) for inv in invoices if inv.get("status") == "paid")
    pending_revenue = sum(inv.get("total", 0) for inv in invoices if inv.get("status") in ["sent", "draft"])
    
    # Calculate margins
    total_costs = total_labor_cost + total_expenses
    gross_margin = total_revenue - total_costs
    margin_percentage = (gross_margin / total_revenue * 100) if total_revenue > 0 else 0
    
    # Get employee production rankings
    employee_stats = {}
    for log in work_logs:
        for worker in log.get("workers", []):
            uid = worker["user_id"]
            if uid not in employee_stats:
                employee_stats[uid] = {
                    "user_id": uid,
                    "user_name": worker.get("user_name", "Unknown"),
                    "total_hours": 0,
                    "total_earnings": 0,
                    "job_count": 0
                }
            employee_stats[uid]["total_hours"] += worker.get("hours", 0)
            employee_stats[uid]["total_earnings"] += worker.get("payment", 0)
            employee_stats[uid]["job_count"] += 1
    
    # Sort employees by earnings
    top_producers = sorted(
        employee_stats.values(),
        key=lambda x: x["total_earnings"],
        reverse=True
    )[:10]
    
    # Calculate trends (daily totals for chart)
    daily_revenue = {}
    daily_costs = {}
    
    for inv in invoices:
        if inv.get("status") == "paid":
            date_key = inv.get("created_at", start_date)
            if isinstance(date_key, datetime):
                date_key = date_key.strftime("%Y-%m-%d")
            daily_revenue[date_key] = daily_revenue.get(date_key, 0) + inv.get("total", 0)
    
    for log in work_logs:
        date_key = log.get("date", start_date)
        if isinstance(date_key, datetime):
            date_key = date_key.strftime("%Y-%m-%d")
        daily_costs[date_key] = daily_costs.get(date_key, 0) + log.get("total_payment", 0)
    
    return {
        "type": "admin",
        "revenue": {
            "total": round(total_revenue, 2),
            "pending": round(pending_revenue, 2),
            "is_positive": total_revenue > 0
        },
        "costs": {
            "labor": round(total_labor_cost, 2),
            "expenses": round(total_expenses, 2),
            "total": round(total_costs, 2)
        },
        "margin": {
            "gross": round(gross_margin, 2),
            "percentage": round(margin_percentage, 2),
            "is_positive": gross_margin >= 0
        },
        "work_stats": {
            "total_jobs": len(work_logs),
            "total_hours": round(sum(log.get("total_hours", 0) for log in work_logs), 2),
            "total_area": round(sum(log.get("area", 0) for log in work_logs), 2)
        },
        "top_producers": top_producers,
        "trends": {
            "revenue": [{"date": k, "value": v} for k, v in sorted(daily_revenue.items())],
            "costs": [{"date": k, "value": v} for k, v in sorted(daily_costs.items())]
        }
    }

# ============== Work Log Endpoints (Akkord/Piece-rate) ==============

@api_router.get("/work-logs")
async def get_work_logs(request: Request, project_id: Optional[str] = None, user_id: Optional[str] = None):
    """Get work logs for the current user's group"""
    user = await get_current_user(request)
    
    query = {"group_id": user["group_id"]}
    if project_id:
        query["project_id"] = project_id
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.work_logs.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    
    # Enrich with project names and user names
    for log in logs:
        if log.get("project_id"):
            project = await db.projects.find_one({"project_id": log["project_id"]}, {"name": 1, "_id": 0})
            log["project_name"] = project["name"] if project else None
        user_doc = await db.users.find_one({"user_id": log["user_id"]}, {"name": 1, "_id": 0})
        log["user_name"] = user_doc["name"] if user_doc else None
    
    return logs

@api_router.get("/work-logs/my")
async def get_my_work_logs(request: Request, project_id: Optional[str] = None):
    """Get work logs for the current user only"""
    user = await get_current_user(request)
    
    query = {"group_id": user["group_id"], "user_id": user["user_id"]}
    if project_id:
        query["project_id"] = project_id
    
    logs = await db.work_logs.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    
    # Enrich with project names
    for log in logs:
        if log.get("project_id"):
            project = await db.projects.find_one({"project_id": log["project_id"]}, {"name": 1, "_id": 0})
            log["project_name"] = project["name"] if project else None
    
    return logs

@api_router.post("/work-logs")
async def create_work_log(request: Request, work: WorkLogCreate):
    """Create a new work log entry"""
    user = await get_current_user(request)
    
    # Validate project exists and belongs to group
    project = await db.projects.find_one({
        "project_id": work.project_id,
        "group_id": user["group_id"]
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get group settings for hourly rate
    group = await db.groups.find_one({"group_id": user["group_id"]})
    hourly_rate = group.get("hourly_rate", 0) if group else 0
    
    rate_per_sqm = 0
    total_payment = 0
    
    if work.work_type == "akkord":
        # Validate base operation for akkord work
        if not work.base_operation or work.base_operation not in AKKORD_BASE_PRICES:
            raise HTTPException(status_code=400, detail=f"Invalid base operation. Must be one of: {list(AKKORD_BASE_PRICES.keys())}")
        
        # Validate add-ons
        invalid_addons = [a for a in work.addons if a not in AKKORD_ADDON_PRICES]
        if invalid_addons:
            raise HTTPException(status_code=400, detail=f"Invalid add-ons: {invalid_addons}")
        
        # Calculate akkord payment
        rate_per_sqm = calculate_akkord_rate(work.base_operation, work.addons)
        total_payment = (work.area or 0) * rate_per_sqm
    else:
        # Hourly work
        total_payment = work.total_hours * hourly_rate
    
    # Process workers - calculate each worker's share
    workers_data = []
    total_worker_hours = sum(w.hours for w in work.workers) if work.workers else work.total_hours
    
    for worker in work.workers:
        # Get worker name
        worker_doc = await db.users.find_one({"user_id": worker.user_id}, {"name": 1, "_id": 0})
        worker_name = worker_doc["name"] if worker_doc else "Unknown"
        
        # Calculate worker's share
        if total_worker_hours > 0:
            share_percentage = worker.hours / total_worker_hours
            worker_payment = total_payment * share_percentage
        else:
            share_percentage = 0
            worker_payment = 0
        
        workers_data.append({
            "user_id": worker.user_id,
            "user_name": worker_name,
            "hours": worker.hours,
            "share_percentage": round(share_percentage * 100, 2),
            "payment": round(worker_payment, 2)
        })
    
    work_id = f"wrk_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    work_log = {
        "work_id": work_id,
        "group_id": user["group_id"],
        "project_id": work.project_id,
        "user_id": user["user_id"],
        "date": work.date,
        "description": work.description,
        "work_type": work.work_type,
        "area": work.area or 0,
        "base_operation": work.base_operation,
        "addons": work.addons,
        "total_hours": work.total_hours,
        "workers": workers_data,
        "rate_per_sqm": rate_per_sqm,
        "hourly_rate": hourly_rate,
        "total_payment": round(total_payment, 2),
        "created_at": now
    }
    
    await db.work_logs.insert_one(work_log)
    
    # Return without _id
    work_log.pop("_id", None)
    work_log["project_name"] = project["name"]
    
    return work_log

@api_router.get("/work-logs/{work_id}")
async def get_work_log(request: Request, work_id: str):
    """Get a specific work log entry"""
    user = await get_current_user(request)
    
    work_log = await db.work_logs.find_one({
        "work_id": work_id,
        "group_id": user["group_id"]
    }, {"_id": 0})
    
    if not work_log:
        raise HTTPException(status_code=404, detail="Work log not found")
    
    # Enrich with project name
    if work_log.get("project_id"):
        project = await db.projects.find_one({"project_id": work_log["project_id"]}, {"name": 1, "_id": 0})
        work_log["project_name"] = project["name"] if project else None
    
    return work_log

@api_router.delete("/work-logs/{work_id}")
async def delete_work_log(request: Request, work_id: str):
    """Delete a work log entry (own entries only, or admin)"""
    user = await get_current_user(request)
    
    work_log = await db.work_logs.find_one({
        "work_id": work_id,
        "group_id": user["group_id"]
    })
    
    if not work_log:
        raise HTTPException(status_code=404, detail="Work log not found")
    
    # Only allow deletion of own entries or by admin
    is_admin = user["role"] in ["admin", "owner"]
    is_owner = work_log["user_id"] == user["user_id"]
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="You can only delete your own work logs")
    
    await db.work_logs.delete_one({"work_id": work_id})
    return {"ok": True, "message": "Work log deleted"}

@api_router.get("/work-logs/summary/project/{project_id}")
async def get_project_work_summary(request: Request, project_id: str):
    """Get summary of work done on a project with payment breakdown per user"""
    user = await get_current_user(request)
    
    # Verify project exists and belongs to group
    project = await db.projects.find_one({
        "project_id": project_id,
        "group_id": user["group_id"]
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all work logs for the project
    logs = await db.work_logs.find({
        "project_id": project_id,
        "group_id": user["group_id"]
    }, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    total_area = sum(log["area"] for log in logs)
    total_hours = sum(log["hours_worked"] for log in logs)
    total_payment = sum(log["total_payment"] for log in logs)
    
    # Group by user
    user_totals = {}
    for log in logs:
        uid = log["user_id"]
        if uid not in user_totals:
            user_doc = await db.users.find_one({"user_id": uid}, {"name": 1, "_id": 0})
            user_totals[uid] = {
                "user_id": uid,
                "user_name": user_doc["name"] if user_doc else "Unknown",
                "total_area": 0,
                "total_hours": 0,
                "total_payment": 0,
                "entries_count": 0
            }
        user_totals[uid]["total_area"] += log["area"]
        user_totals[uid]["total_hours"] += log["hours_worked"]
        user_totals[uid]["total_payment"] += log["total_payment"]
        user_totals[uid]["entries_count"] += 1
    
    # Calculate percentage share based on hours
    for uid, data in user_totals.items():
        data["hours_percentage"] = (data["total_hours"] / total_hours * 100) if total_hours > 0 else 0
        data["payment_share"] = (data["total_hours"] / total_hours * total_payment) if total_hours > 0 else 0
    
    return {
        "project_id": project_id,
        "project_name": project["name"],
        "total_area": total_area,
        "total_hours": total_hours,
        "total_payment": total_payment,
        "entries_count": len(logs),
        "user_breakdown": list(user_totals.values())
    }

@api_router.get("/akkord/pricing")
async def get_akkord_pricing(request: Request):
    """Get the akkord pricing structure"""
    await get_current_user(request)
    
    return {
        "base_operations": [
            {"id": "avtrekk", "name": "Avtrekk", "price": 18},
            {"id": "skuring", "name": "Skuring", "price": 22},
            {"id": "glatting", "name": "Glatting", "price": 26}
        ],
        "addons": [
            {"id": "sikatop_x1", "name": "Sikatop x1", "price": 3},
            {"id": "sikatop_x2", "name": "Sikatop x2", "price": 6},
            {"id": "tykkelse_30_40", "name": "Tykkelse 30-40cm", "price": 3},
            {"id": "tykkelse_40_50", "name": "Tykkelse 40-50cm", "price": 5},
            {"id": "ashford", "name": "Ashford", "price": 10},
            {"id": "plastikk", "name": "Plastikk", "price": 5}
        ],
        "currency": "NOK",
        "unit": "kr/m²"
    }

# ============== Health Check ==============

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "app": "ProjectDash", "version": "1.0.0"}

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Run on server startup"""
    logger.info("ProjectDash API starting up...")
    
    # Create indexes for better query performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("group_id")
    await db.groups.create_index("slug", unique=True)
    await db.invoices.create_index("group_id")
    await db.employees.create_index("group_id")
    await db.expenses.create_index("group_id")
    await db.projects.create_index("group_id")
    await db.tasks.create_index("project_id")
    await db.checklists.create_index("group_id")
    await db.hse_documents.create_index("group_id")
    await db.payroll_runs.create_index("group_id")
    await db.files.create_index("group_id")
    await db.form_templates.create_index("group_id")
    await db.form_submissions.create_index("group_id")
    await db.form_submissions.create_index("form_id")
    
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_event():
    """Run on server shutdown"""
    logger.info("ProjectDash API shutting down...")
    client.close()
