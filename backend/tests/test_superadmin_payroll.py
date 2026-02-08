"""
Tests for Super Admin Panel and Enhanced Payroll Earnings features.
Features tested:
1. Super Admin API endpoints - /api/superadmin/*
2. Payroll Earnings endpoint - /api/payroll/earnings
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
SUPER_ADMIN_EMAIL = "erlen.sletten@gmail.com"
SUPER_ADMIN_PASSWORD = "SuperAdmin123!"
REGULAR_ADMIN_EMAIL = "testadmin@test.com"
REGULAR_ADMIN_PASSWORD = "TestPass123!"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "TestPass123!"

# Known group IDs from context
SUPER_ADMIN_GROUP = "grp_8bed8e9e1558"  # Betongmann ASSs
TEST_GROUP = "grp_a26e6c784815"


class TestAuthentication:
    """Helper fixtures for authentication"""
    
    @pytest.fixture(scope="class")
    def super_admin_session(self):
        """Login as super admin and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert data.get("user", {}).get("is_super_admin") is True
        return session
    
    @pytest.fixture(scope="class")
    def regular_admin_session(self):
        """Login as regular admin and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Regular admin login failed: {response.text}"
        return session
    
    @pytest.fixture(scope="class")
    def employee_session(self):
        """Login as employee and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        return session


class TestSuperAdminStats(TestAuthentication):
    """Tests for GET /api/superadmin/stats"""
    
    def test_super_admin_can_get_stats(self, super_admin_session):
        """Super admin can access platform statistics"""
        response = super_admin_session.get(f"{BASE_URL}/api/superadmin/stats")
        assert response.status_code == 200
        
        data = response.json()
        # Verify all expected fields are present
        assert "groups" in data
        assert "users" in data
        assert "active_users" in data
        assert "banned_users" in data
        assert "invoices" in data
        assert "work_logs" in data
        
        # Verify types
        assert isinstance(data["groups"], int)
        assert isinstance(data["users"], int)
        assert isinstance(data["active_users"], int)
        assert isinstance(data["banned_users"], int)
        print(f"Stats: {data}")
    
    def test_regular_admin_forbidden_from_stats(self, regular_admin_session):
        """Regular admin cannot access super admin stats (403)"""
        response = regular_admin_session.get(f"{BASE_URL}/api/superadmin/stats")
        assert response.status_code == 403
        
    def test_employee_forbidden_from_stats(self, employee_session):
        """Employee cannot access super admin stats (403)"""
        response = employee_session.get(f"{BASE_URL}/api/superadmin/stats")
        assert response.status_code == 403


class TestSuperAdminGroups(TestAuthentication):
    """Tests for GET /api/superadmin/groups and PUT /api/superadmin/groups/{id}/features"""
    
    def test_super_admin_can_get_all_groups(self, super_admin_session):
        """Super admin can list all groups"""
        response = super_admin_session.get(f"{BASE_URL}/api/superadmin/groups")
        assert response.status_code == 200
        
        groups = response.json()
        assert isinstance(groups, list)
        assert len(groups) > 0
        
        # Verify group structure
        for group in groups:
            assert "group_id" in group
            assert "name" in group
            assert "member_count" in group
            assert "disabled_features" in group
            assert isinstance(group["disabled_features"], list)
        
        print(f"Found {len(groups)} groups")
    
    def test_regular_admin_forbidden_from_groups(self, regular_admin_session):
        """Regular admin cannot access super admin groups"""
        response = regular_admin_session.get(f"{BASE_URL}/api/superadmin/groups")
        assert response.status_code == 403
    
    def test_super_admin_can_toggle_features(self, super_admin_session):
        """Super admin can enable/disable features for a group"""
        # First, get current state
        response = super_admin_session.get(f"{BASE_URL}/api/superadmin/groups")
        groups = response.json()
        test_group = next((g for g in groups if g["group_id"] == TEST_GROUP), None)
        
        if test_group is None:
            pytest.skip(f"Test group {TEST_GROUP} not found")
        
        original_disabled = test_group.get("disabled_features", [])
        
        # Toggle - add 'reports' to disabled features
        new_disabled = list(set(original_disabled + ["reports"]))
        response = super_admin_session.put(
            f"{BASE_URL}/api/superadmin/groups/{TEST_GROUP}/features",
            json={"disabled_features": new_disabled}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "reports" in data.get("disabled_features", [])
        
        # Verify persistence
        response = super_admin_session.get(f"{BASE_URL}/api/superadmin/groups")
        groups = response.json()
        updated_group = next((g for g in groups if g["group_id"] == TEST_GROUP), None)
        assert "reports" in updated_group.get("disabled_features", [])
        
        # Restore original state
        response = super_admin_session.put(
            f"{BASE_URL}/api/superadmin/groups/{TEST_GROUP}/features",
            json={"disabled_features": original_disabled}
        )
        assert response.status_code == 200
        print(f"Feature toggle test passed for group {TEST_GROUP}")
    
    def test_invalid_feature_rejected(self, super_admin_session):
        """Invalid feature names are rejected"""
        response = super_admin_session.put(
            f"{BASE_URL}/api/superadmin/groups/{TEST_GROUP}/features",
            json={"disabled_features": ["invalid_feature_xyz"]}
        )
        assert response.status_code == 400


class TestSuperAdminUsers(TestAuthentication):
    """Tests for GET /api/superadmin/users and PUT /api/superadmin/users/{id}/ban"""
    
    def test_super_admin_can_get_all_users(self, super_admin_session):
        """Super admin can list all users"""
        response = super_admin_session.get(f"{BASE_URL}/api/superadmin/users")
        assert response.status_code == 200
        
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        
        # Verify user structure
        for user in users:
            assert "user_id" in user
            assert "email" in user
            assert "name" in user
            assert "group_name" in user
            assert "is_banned" in user
            assert "password_hash" not in user  # Ensure password not exposed
        
        print(f"Found {len(users)} users")
    
    def test_regular_admin_forbidden_from_users(self, regular_admin_session):
        """Regular admin cannot access super admin users"""
        response = regular_admin_session.get(f"{BASE_URL}/api/superadmin/users")
        assert response.status_code == 403
    
    def test_super_admin_can_filter_users_by_group(self, super_admin_session):
        """Super admin can filter users by group"""
        response = super_admin_session.get(f"{BASE_URL}/api/superadmin/users?group_id={TEST_GROUP}")
        assert response.status_code == 200
        
        users = response.json()
        # All returned users should belong to the filtered group
        for user in users:
            assert user["group_id"] == TEST_GROUP


class TestBanUnbanUser(TestAuthentication):
    """Tests for ban/unban functionality"""
    
    def test_ban_and_unban_user(self, super_admin_session):
        """Super admin can ban and unban a user"""
        # Find the employee user
        response = super_admin_session.get(f"{BASE_URL}/api/superadmin/users")
        users = response.json()
        employee_user = next((u for u in users if u["email"] == EMPLOYEE_EMAIL), None)
        
        if employee_user is None:
            pytest.skip("Employee user not found")
        
        user_id = employee_user["user_id"]
        original_banned = employee_user.get("is_banned", False)
        
        # Ban the user
        response = super_admin_session.put(
            f"{BASE_URL}/api/superadmin/users/{user_id}/ban",
            json={"banned": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("banned") is True
        
        # Verify banned user cannot login
        new_session = requests.Session()
        response = new_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 403, "Banned user should get 403 on login"
        
        # Unban the user (IMPORTANT: restore state for other tests)
        response = super_admin_session.put(
            f"{BASE_URL}/api/superadmin/users/{user_id}/ban",
            json={"banned": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("banned") is False
        
        # Verify unbanned user can login again
        response = new_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, "Unbanned user should be able to login"
        print("Ban/unban test passed - user restored to active state")


class TestPayrollEarnings(TestAuthentication):
    """Tests for GET /api/payroll/earnings"""
    
    def test_admin_can_get_earnings(self, regular_admin_session):
        """Admin can access payroll earnings"""
        # Use current month/year
        now = datetime.now()
        month = now.month
        year = now.year
        
        response = regular_admin_session.get(f"{BASE_URL}/api/payroll/earnings?month={month}&year={year}")
        assert response.status_code == 200
        
        earnings = response.json()
        assert isinstance(earnings, list)
        
        # If there are earnings, verify structure
        for e in earnings:
            assert "user_id" in e
            assert "user_name" in e
            assert "akkord_earnings" in e
            assert "hourly_earnings" in e
            assert "total_earnings" in e
            assert "total_hours" in e
            assert "job_count" in e
        
        print(f"Earnings for {month}/{year}: {len(earnings)} employees")
    
    def test_employee_forbidden_from_earnings(self, employee_session):
        """Employee cannot access payroll earnings"""
        now = datetime.now()
        response = employee_session.get(f"{BASE_URL}/api/payroll/earnings?month={now.month}&year={now.year}")
        assert response.status_code == 403
    
    def test_earnings_with_specific_month(self, regular_admin_session):
        """Earnings endpoint works with specific month/year"""
        # Test with February 2026 as mentioned in requirements
        response = regular_admin_session.get(f"{BASE_URL}/api/payroll/earnings?month=2&year=2026")
        assert response.status_code == 200
        
        earnings = response.json()
        assert isinstance(earnings, list)
        print(f"Earnings for Feb 2026: {len(earnings)} employees")


class TestSuperAdminNavVisibility:
    """Test that Super Admin nav is only visible for super admin"""
    
    def test_super_admin_login_returns_is_super_admin_true(self):
        """Login response includes is_super_admin: true for super admin"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("user", {}).get("is_super_admin") is True
    
    def test_regular_admin_login_returns_is_super_admin_false(self):
        """Login response includes is_super_admin: false for regular admin"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        # is_super_admin should be false or not present
        is_super = data.get("user", {}).get("is_super_admin", False)
        assert is_super is False or is_super is None
    
    def test_auth_me_returns_is_super_admin(self):
        """GET /auth/me returns is_super_admin field"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_super_admin") is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
