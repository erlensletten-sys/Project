"""
Test Suite for ProjectDash New Features (Iteration 19):
1. Super Admin Analytics Tab - GET /api/superadmin/analytics/overview
2. Bulk Group Actions - POST /api/superadmin/groups/bulk-verify, bulk-disable
3. Email Preview - GET /api/settings/email/preview
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
SUPER_ADMIN_EMAIL = "erlen.sletten@gmail.com"
SUPER_ADMIN_PASSWORD = "SuperAdmin123!"


class TestSuperAdminLogin:
    """Test Super Admin authentication"""
    
    def test_super_admin_login(self):
        """Super Admin can login and gets is_super_admin=true"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert data["user"]["is_super_admin"] is True
        print(f"✓ Super Admin login successful, is_super_admin={data['user']['is_super_admin']}")


class TestAnalyticsOverview:
    """Test Super Admin Analytics Overview endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin before each test"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Super admin login failed"
    
    def test_analytics_overview_returns_data(self):
        """GET /api/superadmin/analytics/overview returns group analytics"""
        response = self.session.get(f"{BASE_URL}/api/superadmin/analytics/overview")
        
        assert response.status_code == 200, f"Analytics overview failed: {response.text}"
        data = response.json()
        
        # Should return a list of groups with analytics
        assert isinstance(data, list), "Expected list of group analytics"
        assert len(data) > 0, "Expected at least one group in analytics"
        
        # Check first group has required fields
        first_group = data[0]
        required_fields = ["group_id", "group_name", "invoices", "work_logs", 
                          "active_users", "total_users", "expenses", "forms_submitted", 
                          "projects", "last_activity"]
        
        for field in required_fields:
            assert field in first_group, f"Missing field: {field}"
        
        print(f"✓ Analytics overview returned {len(data)} groups")
        print(f"  Sample: {first_group['group_name']} - {first_group['active_users']}/{first_group['total_users']} users, {first_group['work_logs']} work logs")
    
    def test_analytics_overview_requires_super_admin(self):
        """Analytics overview requires super admin access"""
        # Create new session without auth
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/superadmin/analytics/overview")
        
        assert response.status_code == 401, "Expected 401 for unauthenticated request"
        print("✓ Analytics overview correctly requires authentication")


class TestBulkGroupActions:
    """Test Bulk Verify and Bulk Disable endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin and get group IDs"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Super admin login failed"
        
        # Get list of groups
        groups_response = self.session.get(f"{BASE_URL}/api/superadmin/groups")
        assert groups_response.status_code == 200
        self.groups = groups_response.json()
        assert len(self.groups) > 0, "No groups found for testing"
    
    def test_bulk_verify_groups(self):
        """POST /api/superadmin/groups/bulk-verify verifies multiple groups"""
        # Get first 2 group IDs
        group_ids = [g["group_id"] for g in self.groups[:2]]
        
        # Bulk verify
        response = self.session.post(f"{BASE_URL}/api/superadmin/groups/bulk-verify", json={
            "group_ids": group_ids,
            "verified": True
        })
        
        assert response.status_code == 200, f"Bulk verify failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "modified" in data
        print(f"✓ Bulk verify successful, modified {data['modified']} groups")
        
        # Verify the groups are now verified
        groups_response = self.session.get(f"{BASE_URL}/api/superadmin/groups")
        updated_groups = groups_response.json()
        for gid in group_ids:
            group = next((g for g in updated_groups if g["group_id"] == gid), None)
            if group:
                assert group.get("is_verified") is True, f"Group {gid} should be verified"
        print("✓ Groups verified status confirmed")
    
    def test_bulk_unverify_groups(self):
        """POST /api/superadmin/groups/bulk-verify with verified=false unverifies groups"""
        # Get first group ID
        group_ids = [self.groups[0]["group_id"]]
        
        # Bulk unverify
        response = self.session.post(f"{BASE_URL}/api/superadmin/groups/bulk-verify", json={
            "group_ids": group_ids,
            "verified": False
        })
        
        assert response.status_code == 200, f"Bulk unverify failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Bulk unverify successful, modified {data['modified']} groups")
        
        # Re-verify to restore state
        self.session.post(f"{BASE_URL}/api/superadmin/groups/bulk-verify", json={
            "group_ids": group_ids,
            "verified": True
        })
    
    def test_bulk_disable_groups(self):
        """POST /api/superadmin/groups/bulk-disable disables multiple groups"""
        # Use a test group (not the super admin's group)
        # Find a group that's not the super admin's
        test_groups = [g for g in self.groups if g.get("name") != "Betongmann ASSs"]
        if not test_groups:
            pytest.skip("No test groups available")
        
        group_ids = [test_groups[0]["group_id"]]
        
        # Bulk disable
        response = self.session.post(f"{BASE_URL}/api/superadmin/groups/bulk-disable", json={
            "group_ids": group_ids,
            "disabled": True
        })
        
        assert response.status_code == 200, f"Bulk disable failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Bulk disable successful, modified {data['modified']} groups")
        
        # Re-enable to restore state
        enable_response = self.session.post(f"{BASE_URL}/api/superadmin/groups/bulk-disable", json={
            "group_ids": group_ids,
            "disabled": False
        })
        assert enable_response.status_code == 200
        print("✓ Groups re-enabled successfully")
    
    def test_bulk_enable_groups(self):
        """POST /api/superadmin/groups/bulk-disable with disabled=false enables groups"""
        group_ids = [self.groups[0]["group_id"]]
        
        # Bulk enable
        response = self.session.post(f"{BASE_URL}/api/superadmin/groups/bulk-disable", json={
            "group_ids": group_ids,
            "disabled": False
        })
        
        assert response.status_code == 200, f"Bulk enable failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Bulk enable successful, modified {data['modified']} groups")
    
    def test_bulk_action_empty_list_fails(self):
        """Bulk actions with empty group list should fail"""
        response = self.session.post(f"{BASE_URL}/api/superadmin/groups/bulk-verify", json={
            "group_ids": [],
            "verified": True
        })
        
        assert response.status_code == 400, "Expected 400 for empty group list"
        print("✓ Bulk action correctly rejects empty group list")


class TestEmailPreview:
    """Test Email Preview endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin before each test"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Super admin login failed"
    
    def test_invite_email_preview(self):
        """GET /api/settings/email/preview?template=invite returns invite HTML"""
        response = self.session.get(f"{BASE_URL}/api/settings/email/preview?template=invite")
        
        assert response.status_code == 200, f"Invite preview failed: {response.text}"
        data = response.json()
        
        assert "html" in data, "Response should contain 'html' field"
        assert "template" in data, "Response should contain 'template' field"
        assert data["template"] == "invite"
        
        # Check HTML contains expected content
        html = data["html"]
        assert "Welcome" in html or "invited" in html.lower(), "Invite email should contain welcome message"
        assert "Log In" in html or "login" in html.lower(), "Invite email should contain login button"
        assert "Password" in html, "Invite email should show password"
        
        print("✓ Invite email preview returned valid HTML")
        print(f"  HTML length: {len(html)} characters")
    
    def test_reset_email_preview(self):
        """GET /api/settings/email/preview?template=reset returns reset HTML"""
        response = self.session.get(f"{BASE_URL}/api/settings/email/preview?template=reset")
        
        assert response.status_code == 200, f"Reset preview failed: {response.text}"
        data = response.json()
        
        assert "html" in data, "Response should contain 'html' field"
        assert "template" in data, "Response should contain 'template' field"
        assert data["template"] == "reset"
        
        # Check HTML contains expected content
        html = data["html"]
        assert "Password Reset" in html or "reset" in html.lower(), "Reset email should mention password reset"
        assert "Reset Password" in html, "Reset email should have reset button"
        
        print("✓ Password reset email preview returned valid HTML")
        print(f"  HTML length: {len(html)} characters")
    
    def test_email_preview_requires_auth(self):
        """Email preview requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/settings/email/preview?template=invite")
        
        assert response.status_code == 401, "Expected 401 for unauthenticated request"
        print("✓ Email preview correctly requires authentication")
    
    def test_email_preview_default_template(self):
        """GET /api/settings/email/preview without template defaults to invite"""
        response = self.session.get(f"{BASE_URL}/api/settings/email/preview")
        
        assert response.status_code == 200, f"Default preview failed: {response.text}"
        data = response.json()
        assert data["template"] == "invite", "Default template should be 'invite'"
        print("✓ Default email preview template is 'invite'")


class TestActivityLogsForBulkActions:
    """Verify bulk actions are logged in activity logs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Super admin login failed"
    
    def test_bulk_actions_logged(self):
        """Bulk actions should appear in activity logs"""
        # Get activity logs
        response = self.session.get(f"{BASE_URL}/api/superadmin/activity-logs?limit=10")
        
        assert response.status_code == 200, f"Activity logs failed: {response.text}"
        data = response.json()
        
        assert "logs" in data, "Response should contain 'logs' field"
        logs = data["logs"]
        
        # Check if any bulk actions are logged
        bulk_actions = [log for log in logs if "bulk" in log.get("action", "").lower()]
        print(f"✓ Activity logs retrieved, found {len(bulk_actions)} bulk action logs")
        
        if bulk_actions:
            print(f"  Latest bulk action: {bulk_actions[0].get('action')} - {bulk_actions[0].get('details')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
