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
db = client[os.environ.get('DB_NAME', 'nordicforge')]

# Create the main app
app = FastAPI(title="NordicForge API", version="1.0.0")

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

# Email Settings Model
class EmailSettingsUpdate(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    sender_email: str
    sender_name: str = "NordicForge"

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
    role: str = "member"  # member, admin

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

def get_email_config():
    """Get email configuration from environment"""
    return {
        "smtp_host": os.environ.get('SMTP_HOST', ''),
        "smtp_port": int(os.environ.get('SMTP_PORT', 587)),
        "smtp_user": os.environ.get('SMTP_USER', ''),
        "smtp_password": os.environ.get('SMTP_PASSWORD', ''),
        "smtp_use_tls": os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true',
        "sender_email": os.environ.get('SENDER_EMAIL', ''),
        "sender_name": os.environ.get('SENDER_NAME', 'NordicForge')
    }

def is_email_configured():
    """Check if email is properly configured"""
    config = get_email_config()
    return bool(config["smtp_host"] and config["smtp_user"] and config["sender_email"])

async def send_email_smtp(to_email: str, subject: str, html_content: str, text_content: str = None):
    """Send email via SMTP"""
    config = get_email_config()
    
    if not is_email_configured():
        logger.warning("SMTP not configured, skipping email")
        return False
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{config['sender_name']} <{config['sender_email']}>"
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
            hostname=config["smtp_host"],
            port=config["smtp_port"],
            username=config["smtp_user"],
            password=config["smtp_password"],
            start_tls=config["smtp_use_tls"]
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
    elements.append(Paragraph(f"Generated by NordicForge • {group_name}", footer_style))
    
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
    
    # Create user with temporary password
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    temp_password = secrets.token_urlsafe(12)
    password_hash = hash_password(temp_password)
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": invite.email,
        "name": invite.name,
        "password_hash": password_hash,
        "role": invite.role if invite.role in ["member", "admin"] else "member",
        "group_id": user["group_id"],
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
    group_name = group["name"] if group else "NordicForge"
    
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
    group_name = group_doc.get("name", "NordicForge") if group_doc else "NordicForge"
    
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
    """Get email configuration status (admin only)"""
    user = await require_admin(request)
    
    config = get_email_config()
    
    return {
        "configured": is_email_configured(),
        "smtp_host": config["smtp_host"],
        "smtp_port": config["smtp_port"],
        "smtp_user": config["smtp_user"][:3] + "***" if config["smtp_user"] else "",
        "smtp_use_tls": config["smtp_use_tls"],
        "sender_email": config["sender_email"],
        "sender_name": config["sender_name"]
    }

@api_router.post("/settings/email/test")
async def test_email_settings(request: Request, test_email: str):
    """Send a test email to verify SMTP configuration"""
    user = await require_admin(request)
    
    if not is_email_configured():
        raise HTTPException(status_code=400, detail="SMTP is not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SENDER_EMAIL in environment variables.")
    
    html_content = """
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #FF4500;">NordicForge Email Test</h1>
        <p>This is a test email to verify your SMTP configuration is working correctly.</p>
        <p>If you received this email, your email settings are configured properly!</p>
        <hr>
        <p style="color: #666; font-size: 0.9em;">Sent from NordicForge Business Management Platform</p>
    </body>
    </html>
    """
    
    success = await send_email_smtp(test_email, "NordicForge - Email Configuration Test", html_content)
    
    if success:
        return {"ok": True, "message": f"Test email sent successfully to {test_email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Please check your SMTP configuration and server logs.")

# ============== Health Check ==============

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "app": "NordicForge", "version": "1.0.0"}

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
    logger.info("NordicForge API starting up...")
    
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
    logger.info("NordicForge API shutting down...")
    client.close()
