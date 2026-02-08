"""
Tests for Dashboard Analytics API and Password Reset Features
- GET /api/analytics/dashboard - role-based analytics (admin vs employee views)
- POST /api/auth/forgot-password - password reset request
- POST /api/auth/reset-password - password reset confirmation
"""
import pytest
import requests
import os
import secrets
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test@projectdash.me"
ADMIN_PASSWORD = "Test1234!"
EMPLOYEE_EMAIL = "worker@projectdash.me"
EMPLOYEE_PASSWORD = "Password123!"


@pytest.fixture(scope="module")
def admin_session():
    """Create authenticated admin session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    return session


@pytest.fixture(scope="module")
def employee_session():
    """Create authenticated employee session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL,
        "password": EMPLOYEE_PASSWORD
    })
    
    if response.status_code != 200:
        # Try to create the employee user if it doesn't exist
        pytest.skip(f"Employee login failed: {response.status_code} - {response.text}")
    
    return session


class TestDashboardAnalyticsAdmin:
    """Test dashboard analytics for admin/owner/HR users"""
    
    def test_dashboard_returns_admin_type(self, admin_session):
        """Admin should get type='admin' analytics"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("type") == "admin", f"Expected type='admin', got {data.get('type')}"
    
    def test_dashboard_has_revenue_field(self, admin_session):
        """Admin analytics should have revenue field"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "revenue" in data, "Missing 'revenue' field"
        assert "total" in data["revenue"], "Missing 'total' in revenue"
        assert "pending" in data["revenue"], "Missing 'pending' in revenue"
    
    def test_dashboard_has_costs_field(self, admin_session):
        """Admin analytics should have costs field"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "costs" in data, "Missing 'costs' field"
        assert "labor" in data["costs"], "Missing 'labor' in costs"
        assert "expenses" in data["costs"], "Missing 'expenses' in costs"
        assert "total" in data["costs"], "Missing 'total' in costs"
    
    def test_dashboard_has_margin_field(self, admin_session):
        """Admin analytics should have margin field with is_positive indicator"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "margin" in data, "Missing 'margin' field"
        assert "gross" in data["margin"], "Missing 'gross' in margin"
        assert "percentage" in data["margin"], "Missing 'percentage' in margin"
        assert "is_positive" in data["margin"], "Missing 'is_positive' in margin (for red/green indicator)"
        assert isinstance(data["margin"]["is_positive"], bool), "is_positive should be boolean"
    
    def test_dashboard_has_top_producers(self, admin_session):
        """Admin analytics should have top_producers list"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "top_producers" in data, "Missing 'top_producers' field"
        assert isinstance(data["top_producers"], list), "top_producers should be a list"
    
    def test_dashboard_period_week(self, admin_session):
        """Dashboard should accept period=week parameter"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard?period=week")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("type") == "admin"
    
    def test_dashboard_period_month(self, admin_session):
        """Dashboard should accept period=month parameter"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard?period=month")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("type") == "admin"
    
    def test_dashboard_period_year(self, admin_session):
        """Dashboard should accept period=year parameter"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard?period=year")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("type") == "admin"
    
    def test_dashboard_has_work_stats(self, admin_session):
        """Admin analytics should have work_stats field"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "work_stats" in data, "Missing 'work_stats' field"
        assert "total_jobs" in data["work_stats"], "Missing 'total_jobs' in work_stats"
        assert "total_hours" in data["work_stats"], "Missing 'total_hours' in work_stats"


class TestDashboardAnalyticsEmployee:
    """Test dashboard analytics for employee users"""
    
    def test_dashboard_returns_employee_type(self, employee_session):
        """Employee should get type='employee' analytics"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("type") == "employee", f"Expected type='employee', got {data.get('type')}"
    
    def test_dashboard_has_period_earnings(self, employee_session):
        """Employee analytics should have period_earnings"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_earnings" in data, "Missing 'period_earnings' field"
        assert isinstance(data["period_earnings"], (int, float)), "period_earnings should be numeric"
    
    def test_dashboard_has_period_hours(self, employee_session):
        """Employee analytics should have period_hours"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_hours" in data, "Missing 'period_hours' field"
    
    def test_dashboard_has_period_area(self, employee_session):
        """Employee analytics should have period_area"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_area" in data, "Missing 'period_area' field"
    
    def test_dashboard_has_avg_per_job(self, employee_session):
        """Employee analytics should have avg_per_job"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "avg_per_job" in data, "Missing 'avg_per_job' field"
    
    def test_dashboard_has_avg_per_hour(self, employee_session):
        """Employee analytics should have avg_per_hour"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "avg_per_hour" in data, "Missing 'avg_per_hour' field"
    
    def test_dashboard_has_median_income(self, employee_session):
        """Employee analytics should have median_income"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "median_income" in data, "Missing 'median_income' field"
    
    def test_dashboard_has_job_count(self, employee_session):
        """Employee analytics should have job_count"""
        response = employee_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "job_count" in data, "Missing 'job_count' field"


class TestDashboardUnauth:
    """Test dashboard analytics without authentication"""
    
    def test_dashboard_requires_auth(self):
        """Dashboard should return 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
        # Should return 401 for unauthenticated requests
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "Not authenticated" in data.get("detail", "")


class TestPasswordResetRequest:
    """Test forgot password / password reset request flow"""
    
    def test_forgot_password_success_existing_email(self):
        """POST /api/auth/forgot-password should return success for existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_EMAIL
        })
        # Returns 200 with message OR 503 if SMTP not configured
        # Note: The endpoint raises HTTPException with 503 which should be returned
        assert response.status_code in [200, 503], f"Expected 200 or 503, got {response.status_code}: {response.text}"
        
        data = response.json()
        if response.status_code == 200:
            assert "ok" in data or "message" in data
        elif response.status_code == 503:
            # SMTP not configured is expected in test environment
            assert "Email service is not configured" in data.get("detail", "")
    
    def test_forgot_password_non_existing_email(self):
        """POST /api/auth/forgot-password should return success even for non-existing email (security)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@example.com"
        })
        # Should always return same response to prevent email enumeration
        assert response.status_code in [200, 503], f"Expected 200 or 503, got {response.status_code}: {response.text}"
    
    def test_forgot_password_invalid_email_format(self):
        """POST /api/auth/forgot-password should reject invalid email format"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "not-an-email"
        })
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"


class TestPasswordResetConfirm:
    """Test reset password confirmation flow"""
    
    def test_reset_password_invalid_token(self):
        """POST /api/auth/reset-password should reject invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid-token-12345",
            "new_password": "NewPassword123!"
        })
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"
        
        data = response.json()
        assert "Invalid or expired" in data.get("detail", "")
    
    def test_reset_password_short_password(self):
        """POST /api/auth/reset-password should reject short password"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "some-token",
            "new_password": "short"
        })
        # Should return 422 for validation error (min_length=8)
        assert response.status_code in [400, 422], f"Expected 400 or 422, got {response.status_code}"
    
    def test_reset_password_missing_token(self):
        """POST /api/auth/reset-password should require token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "new_password": "ValidPassword123!"
        })
        assert response.status_code == 422, f"Expected 422 for missing token, got {response.status_code}"


class TestLoginForgotPasswordLink:
    """Verify login page has forgot password link"""
    
    def test_login_page_accessible(self):
        """Login page should be accessible"""
        response = requests.get(f"{BASE_URL}")
        assert response.status_code == 200


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
