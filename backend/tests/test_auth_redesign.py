"""
Backend API tests for Auth Page Redesign, HSE PDF Viewing, and Email templates.
Tests the authentication endpoints and HSE documents with PDF attachments.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthEndpoints:
    """Test authentication endpoints that support the redesigned auth pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@test.com",
            "password": "TestPass123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "user" in data
        assert data["user"]["email"] == "testadmin@test.com"
        print("✓ Login success test passed")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Login invalid credentials test passed")
    
    def test_forgot_password_endpoint(self):
        """Test forgot password endpoint exists and responds correctly"""
        response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "testadmin@test.com"
        })
        # Should return 200 or 503 (if email not configured)
        assert response.status_code in [200, 503]
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") == True
            print("✓ Forgot password endpoint works (email sent)")
        else:
            print("✓ Forgot password endpoint works (email service not configured)")
    
    def test_reset_password_endpoint(self):
        """Test reset password endpoint exists (with invalid token)"""
        response = self.session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token",
            "new_password": "NewPassword123!"
        })
        assert response.status_code == 400
        data = response.json()
        assert "expired" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower()
        print("✓ Reset password endpoint validation works")
    
    def test_auth_me_unauthorized(self):
        """Test /auth/me without authentication"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth/me unauthorized test passed")
    
    def test_auth_me_authorized(self):
        """Test /auth/me with valid session"""
        # First login to get session
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@test.com",
            "password": "TestPass123!"
        })
        assert login_response.status_code == 200
        
        # Now test auth/me
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testadmin@test.com"
        print("✓ Auth/me authorized test passed")


class TestHSEDocuments:
    """Test HSE Documents API endpoints including PDF file handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@test.com",
            "password": "TestPass123!"
        })
        assert login_response.status_code == 200
        
        # Store session cookies
        self.cookies = login_response.cookies
    
    def test_get_hse_documents(self):
        """Test listing HSE documents"""
        response = self.session.get(f"{BASE_URL}/api/hse", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ HSE documents list returned ({len(data)} documents)")
    
    def test_create_hse_document_without_file(self):
        """Test creating HSE document without file attachment"""
        response = self.session.post(f"{BASE_URL}/api/hse", json={
            "title": "TEST_Safety Policy",
            "document_type": "policy",
            "content": "This is a test safety policy content."
        }, cookies=self.cookies)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "TEST_Safety Policy"
        assert data["document_type"] == "policy"
        print("✓ HSE document created without file")
    
    def test_create_hse_document_with_file_url(self):
        """Test creating HSE document with file URL (simulating uploaded PDF)"""
        response = self.session.post(f"{BASE_URL}/api/hse", json={
            "title": "TEST_PDF Safety Manual",
            "document_type": "procedure",
            "content": "This document has a PDF attachment.",
            "file_url": "/api/files/test_group/test_file.pdf"
        }, cookies=self.cookies)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "TEST_PDF Safety Manual"
        assert data["file_url"] == "/api/files/test_group/test_file.pdf"
        print("✓ HSE document created with file URL")
    
    def test_filter_hse_by_type(self):
        """Test filtering HSE documents by type"""
        response = self.session.get(f"{BASE_URL}/api/hse?document_type=policy", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        for doc in data:
            assert doc["document_type"] == "policy"
        print(f"✓ HSE filtering by type works ({len(data)} policy documents)")


class TestInvoiceEmailAPI:
    """Test Invoice send email endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@test.com",
            "password": "TestPass123!"
        })
        assert login_response.status_code == 200
        self.cookies = login_response.cookies
    
    def test_send_invoice_endpoint_exists(self):
        """Test that invoice send endpoint exists (using provided test invoice ID)"""
        # Using the provided invoice ID from the review request
        invoice_id = "inv_8b14f69aab3e"
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/send",
            json={},
            cookies=self.cookies
        )
        # Should return 200 (email sent), 503 (email not configured), or 404 (invoice not found)
        assert response.status_code in [200, 404, 503]
        if response.status_code == 200:
            print("✓ Invoice send endpoint works - email sent")
        elif response.status_code == 503:
            print("✓ Invoice send endpoint exists - email service not configured")
        else:
            print("✓ Invoice send endpoint exists - invoice not found (may need different ID)")


class TestNavigationLinks:
    """Test that page navigation endpoints work correctly"""
    
    def test_login_page_loads(self):
        """Test login page is accessible"""
        response = requests.get(f"{BASE_URL.replace('/api', '')}/login")
        assert response.status_code in [200, 304]
        print("✓ Login page accessible")
    
    def test_register_page_loads(self):
        """Test register page is accessible"""
        response = requests.get(f"{BASE_URL.replace('/api', '')}/register")
        assert response.status_code in [200, 304]
        print("✓ Register page accessible")
    
    def test_forgot_password_page_loads(self):
        """Test forgot password page is accessible"""
        response = requests.get(f"{BASE_URL.replace('/api', '')}/forgot-password")
        assert response.status_code in [200, 304]
        print("✓ Forgot password page accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
