"""
Test suite for 5 backlog features:
1. Payment summary per worker report
2. Invoice PDF generation
3. Company logo upload in settings
4. Quick actions on dashboard
5. Mobile-responsive improvements (CSS only - not testable via API)

Test credentials:
- Admin: testadmin@test.com / TestPass123!
- Employee: employee@test.com / TestPass123!
- Invoice ID: inv_8b14f69aab3e
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return session"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "testadmin@test.com", "password": "TestPass123!"}
    )
    if response.status_code != 200:
        pytest.skip("Admin login failed - cannot proceed with tests")
    return session

@pytest.fixture(scope="module")
def employee_session():
    """Login as employee and return session"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "employee@test.com", "password": "TestPass123!"}
    )
    if response.status_code != 200:
        pytest.skip("Employee login failed - cannot proceed with tests")
    return session


class TestPaymentSummaryReport:
    """Feature 1: Payment summary per worker report"""
    
    def test_payment_summary_returns_200_for_admin(self, admin_session):
        """GET /api/reports/payment-summary returns 200 for admin"""
        response = admin_session.get(f"{BASE_URL}/api/reports/payment-summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_payment_summary_returns_correct_structure(self, admin_session):
        """Verify response contains expected fields"""
        response = admin_session.get(f"{BASE_URL}/api/reports/payment-summary?period=month")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level fields
        assert "period" in data, "Missing 'period' field"
        assert "total_labor_cost" in data, "Missing 'total_labor_cost' field"
        assert "total_hours" in data, "Missing 'total_hours' field"
        assert "worker_count" in data, "Missing 'worker_count' field"
        assert "workers" in data, "Missing 'workers' field"
        
        # Period should match request
        assert data["period"] == "month"
        
    def test_payment_summary_worker_structure(self, admin_session):
        """Verify worker breakdown structure"""
        response = admin_session.get(f"{BASE_URL}/api/reports/payment-summary?period=year")
        assert response.status_code == 200
        data = response.json()
        
        # If there are workers, check their structure
        if data["workers"]:
            worker = data["workers"][0]
            expected_fields = ["user_id", "user_name", "total_earnings", "total_hours", 
                             "akkord_earnings", "hourly_earnings", "avg_per_hour", "area_completed"]
            for field in expected_fields:
                assert field in worker, f"Missing worker field: {field}"
                
    def test_payment_summary_period_week(self, admin_session):
        """Test week period parameter"""
        response = admin_session.get(f"{BASE_URL}/api/reports/payment-summary?period=week")
        assert response.status_code == 200
        assert response.json()["period"] == "week"
        
    def test_payment_summary_period_year(self, admin_session):
        """Test year period parameter"""
        response = admin_session.get(f"{BASE_URL}/api/reports/payment-summary?period=year")
        assert response.status_code == 200
        assert response.json()["period"] == "year"
        
    def test_payment_summary_forbidden_for_employee(self, employee_session):
        """Employee should get 403 when accessing reports"""
        response = employee_session.get(f"{BASE_URL}/api/reports/payment-summary")
        assert response.status_code == 403, f"Expected 403 for employee, got {response.status_code}"


class TestInvoicePdfGeneration:
    """Feature 2: Invoice PDF generation"""
    
    def test_invoice_pdf_returns_pdf(self, admin_session):
        """GET /api/invoices/{id}/pdf returns PDF content"""
        invoice_id = "inv_8b14f69aab3e"
        response = admin_session.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf")
        
        # Could be 200 or 404 depending on invoice existence
        if response.status_code == 200:
            assert response.headers.get("Content-Type") == "application/pdf", \
                f"Expected application/pdf, got {response.headers.get('Content-Type')}"
            # PDF files start with %PDF
            assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        elif response.status_code == 404:
            # Invoice doesn't exist in test data - this is acceptable
            pytest.skip("Test invoice not found - skipping PDF test")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
            
    def test_invoice_pdf_returns_404_for_nonexistent(self, admin_session):
        """Non-existent invoice returns 404"""
        response = admin_session.get(f"{BASE_URL}/api/invoices/inv_nonexistent123/pdf")
        assert response.status_code == 404
        
    def test_invoice_pdf_requires_auth(self):
        """PDF endpoint requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/invoices/inv_8b14f69aab3e/pdf")
        assert response.status_code == 401


class TestLogoUpload:
    """Feature 3: Company logo upload in settings"""
    
    def test_logo_upload_returns_200(self, admin_session):
        """POST /api/settings/logo accepts image upload"""
        # Create a small test image (1x1 PNG)
        import base64
        # 1x1 transparent PNG
        png_bytes = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {'file': ('test_logo.png', png_bytes, 'image/png')}
        response = admin_session.post(f"{BASE_URL}/api/settings/logo", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "logo_url" in data, "Missing logo_url in response"
        
    def test_logo_upload_requires_admin(self, employee_session):
        """Employee cannot upload logo"""
        import base64
        png_bytes = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {'file': ('test_logo.png', png_bytes, 'image/png')}
        response = employee_session.post(f"{BASE_URL}/api/settings/logo", files=files)
        
        assert response.status_code == 403, f"Expected 403 for employee, got {response.status_code}"
        
    def test_logo_remove_returns_200(self, admin_session):
        """DELETE /api/settings/logo removes logo"""
        response = admin_session.delete(f"{BASE_URL}/api/settings/logo")
        assert response.status_code == 200
        assert response.json().get("ok") == True
        
    def test_group_settings_returns_logo_url(self, admin_session):
        """GET /api/settings/group includes logo_url field"""
        response = admin_session.get(f"{BASE_URL}/api/settings/group")
        assert response.status_code == 200
        data = response.json()
        
        # logo_url should be in response (can be null)
        assert "logo_url" in data, "Missing logo_url field in group settings"
        

class TestQuickActions:
    """Feature 4: Quick actions on dashboard - verify endpoints exist"""
    
    def test_dashboard_stats_endpoint(self, admin_session):
        """Dashboard stats endpoint returns data"""
        response = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Should have various stats sections
        assert "invoices" in data or "projects" in data or "expenses" in data
        
    def test_projects_endpoint(self, admin_session):
        """Projects endpoint returns list"""
        response = admin_session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_expenses_endpoint(self, admin_session):
        """Expenses endpoint returns list"""
        response = admin_session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_checklists_endpoint(self, admin_session):
        """Checklists endpoint returns list"""
        response = admin_session.get(f"{BASE_URL}/api/checklists")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_work_logs_endpoint(self, admin_session):
        """Work logs endpoint returns list"""
        response = admin_session.get(f"{BASE_URL}/api/work-logs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestInvoiceExistence:
    """Test that we can create invoice if needed for PDF test"""
    
    def test_create_and_get_invoice_pdf(self, admin_session):
        """Create invoice and verify PDF generation works"""
        # First create an invoice
        invoice_data = {
            "customer_name": "TEST_PDF_Customer",
            "customer_email": "test@example.com",
            "items": [
                {"description": "Test Item", "quantity": 1, "unit_price": 100.0, "vat_rate": 25.0}
            ],
            "notes": "Test invoice for PDF generation"
        }
        
        create_response = admin_session.post(
            f"{BASE_URL}/api/invoices", 
            json=invoice_data
        )
        assert create_response.status_code == 201, f"Failed to create invoice: {create_response.text}"
        
        created_invoice = create_response.json()
        invoice_id = created_invoice["invoice_id"]
        
        # Now get the PDF
        pdf_response = admin_session.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf")
        assert pdf_response.status_code == 200, f"Failed to get PDF: {pdf_response.status_code}"
        assert pdf_response.headers.get("Content-Type") == "application/pdf"
        assert pdf_response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"Successfully generated PDF for invoice {invoice_id}")


class TestReportsPageRoleRestriction:
    """Test that Reports page is restricted to admin/hr roles"""
    
    def test_reports_forbidden_for_employee(self, employee_session):
        """Employee cannot access payment summary"""
        response = employee_session.get(f"{BASE_URL}/api/reports/payment-summary")
        assert response.status_code == 403
        
    def test_reports_accessible_for_admin(self, admin_session):
        """Admin can access payment summary"""
        response = admin_session.get(f"{BASE_URL}/api/reports/payment-summary")
        assert response.status_code == 200
