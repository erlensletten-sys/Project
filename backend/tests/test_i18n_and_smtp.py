"""
Test Suite for NordicForge i18n Language Switching and SMTP Email Settings

Tests the following features:
1. PUT /api/settings/email - Save SMTP configuration
2. GET /api/settings/email - Get SMTP configuration status
3. Authentication requirements for email settings endpoints
"""
import pytest
import requests
import os

# Get base URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "Test1234!"

class TestEmailSettingsAPI:
    """Test SMTP/Email configuration endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Authenticate and return session with auth cookie"""
        # Login to get session cookie
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Login response ok should be True"
        print(f"✓ Logged in as {TEST_EMAIL}")
        return session
    
    def test_01_health_check(self, session):
        """Verify API is accessible"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ API health check passed")
    
    def test_02_get_email_settings_unauthenticated(self, session):
        """Verify email settings endpoint requires authentication"""
        # Use a fresh session without auth
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Email settings endpoint correctly requires authentication")
    
    def test_03_get_email_settings_authenticated(self, auth_session):
        """Get current email configuration status"""
        response = auth_session.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code == 200, f"Failed to get email settings: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "configured" in data, "Response should include 'configured' field"
        assert "smtp_host" in data, "Response should include 'smtp_host' field"
        assert "smtp_port" in data, "Response should include 'smtp_port' field"
        assert "smtp_user" in data, "Response should include 'smtp_user' field"
        assert "smtp_use_tls" in data, "Response should include 'smtp_use_tls' field"
        assert "sender_email" in data, "Response should include 'sender_email' field"
        assert "sender_name" in data, "Response should include 'sender_name' field"
        
        print(f"✓ Got email settings - configured: {data.get('configured')}")
        return data
    
    def test_04_put_email_settings_unauthenticated(self, session):
        """Verify PUT email settings endpoint requires authentication"""
        fresh_session = requests.Session()
        response = fresh_session.put(
            f"{BASE_URL}/api/settings/email",
            json={
                "smtp_host": "smtp.test.com",
                "smtp_port": 587,
                "smtp_user": "user@test.com",
                "smtp_password": "password123",
                "smtp_use_tls": True,
                "sender_email": "noreply@test.com",
                "sender_name": "Test Sender"
            }
        )
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ PUT email settings correctly requires authentication")
    
    def test_05_put_email_settings_valid(self, auth_session):
        """Save SMTP configuration with valid data"""
        smtp_config = {
            "smtp_host": "smtp.testhost.com",
            "smtp_port": 587,
            "smtp_user": "testuser@testhost.com",
            "smtp_password": "test_password_123",
            "smtp_use_tls": True,
            "sender_email": "noreply@testhost.com",
            "sender_name": "NordicForge Test"
        }
        
        response = auth_session.put(
            f"{BASE_URL}/api/settings/email",
            json=smtp_config
        )
        assert response.status_code == 200, f"Failed to save email settings: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "message" in data, "Response should include a message"
        print(f"✓ Email settings saved successfully - message: {data.get('message')}")
    
    def test_06_verify_email_settings_persisted(self, auth_session):
        """Verify that saved SMTP settings are persisted"""
        response = auth_session.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code == 200, f"Failed to get email settings: {response.text}"
        
        data = response.json()
        # After saving, it should be configured
        assert data.get("configured") == True, "Email should be marked as configured after saving"
        assert data.get("smtp_host") == "smtp.testhost.com", "SMTP host should match saved value"
        assert data.get("smtp_port") == 587, "SMTP port should match saved value"
        assert data.get("sender_email") == "noreply@testhost.com", "Sender email should match saved value"
        assert data.get("sender_name") == "NordicForge Test", "Sender name should match saved value"
        # Password should be masked
        assert "***" in data.get("smtp_user", ""), "SMTP user should be partially masked"
        
        print("✓ Email settings persisted correctly in database")
    
    def test_07_put_email_settings_update_without_password(self, auth_session):
        """Update SMTP settings without providing password (should keep existing)"""
        update_config = {
            "smtp_host": "smtp.updated.com",
            "smtp_port": 465,
            "smtp_user": "updated@updated.com",
            "smtp_use_tls": False,
            "sender_email": "noreply@updated.com",
            "sender_name": "NordicForge Updated"
            # Note: no smtp_password - should keep existing
        }
        
        response = auth_session.put(
            f"{BASE_URL}/api/settings/email",
            json=update_config
        )
        assert response.status_code == 200, f"Failed to update email settings: {response.text}"
        print("✓ Email settings updated without password")
        
        # Verify update
        response = auth_session.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code == 200
        data = response.json()
        assert data.get("smtp_host") == "smtp.updated.com", "SMTP host should be updated"
        assert data.get("smtp_port") == 465, "SMTP port should be updated"
        assert data.get("smtp_use_tls") == False, "TLS setting should be updated"
        print("✓ Updated settings verified")
    
    def test_08_put_email_settings_missing_required_fields(self, auth_session):
        """Test validation for missing required fields"""
        # Missing smtp_host
        response = auth_session.put(
            f"{BASE_URL}/api/settings/email",
            json={
                "smtp_port": 587,
                "smtp_user": "user@test.com",
                "sender_email": "noreply@test.com"
            }
        )
        # Should fail with 422 validation error
        assert response.status_code == 422, f"Expected 422 for missing required fields, got {response.status_code}"
        print("✓ Missing required fields correctly rejected with 422")


class TestDashboardAndNavigation:
    """Test that dashboard and navigation endpoints work for verifying i18n context"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Authenticate and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return session
    
    def test_01_dashboard_stats(self, auth_session):
        """Verify dashboard stats endpoint works"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        
        data = response.json()
        assert "invoices" in data, "Should include invoices stats"
        assert "payroll" in data, "Should include payroll stats"
        assert "expenses" in data, "Should include expenses stats"
        assert "projects" in data, "Should include projects stats"
        print("✓ Dashboard stats endpoint working correctly")
    
    def test_02_group_info(self, auth_session):
        """Verify group info endpoint works (for Settings page)"""
        response = auth_session.get(f"{BASE_URL}/api/group")
        assert response.status_code == 200, f"Group info failed: {response.text}"
        
        data = response.json()
        assert "group_id" in data, "Should include group_id"
        assert "name" in data, "Should include name"
        print(f"✓ Group info retrieved - name: {data.get('name')}")
    
    def test_03_group_members(self, auth_session):
        """Verify group members endpoint works (for Settings page)"""
        response = auth_session.get(f"{BASE_URL}/api/group/members")
        assert response.status_code == 200, f"Group members failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of members"
        assert len(data) > 0, "Should have at least one member"
        print(f"✓ Group members retrieved - count: {len(data)}")


class TestAuthMeEndpoint:
    """Test the /auth/me endpoint used by frontend to get user info"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Authenticate and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return session
    
    def test_01_get_me(self, auth_session):
        """Verify /auth/me returns user info"""
        response = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Get me failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Should include user_id"
        assert "email" in data, "Should include email"
        assert "name" in data, "Should include name"
        assert "role" in data, "Should include role"
        assert "group_id" in data, "Should include group_id"
        assert data.get("email") == TEST_EMAIL, "Email should match logged in user"
        print(f"✓ User info retrieved - role: {data.get('role')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
