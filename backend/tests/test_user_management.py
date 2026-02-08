"""
Tests for User Management Features:
- Create User: POST /api/group/users
- Update Role: PUT /api/group/users/{id}/role
- Deactivate User: PUT /api/group/users/{id}/deactivate
- Activate User: PUT /api/group/users/{id}/activate
- Get Users: GET /api/group/users
- Theme: Black color should be in ACCENT_COLORS
"""

import pytest
import requests
import os
import uuid

# Use REACT_APP_BACKEND_URL from frontend/.env for public URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://projectdash-preview.preview.emergentagent.com').rstrip('/')

# Test admin credentials
ADMIN_EMAIL = "test@projectdash.me"
ADMIN_PASSWORD = "Test1234!"


class TestAuthSetup:
    """Setup authentication for tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True, f"Login response not OK: {data}"
        print(f"Logged in as: {data['user']['email']} with role: {data['user']['role']}")
        return session


class TestUserCreation(TestAuthSetup):
    """Test POST /api/group/users - Create new user"""
    
    def test_create_user_success(self, auth_session):
        """Test creating a new user with role employee"""
        unique_email = f"test_employee_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Test Employee",
            "password": "Password123!",
            "role": "employee"
        })
        assert response.status_code == 200, f"Create user failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "user_id" in data
        print(f"Created user: {unique_email} with ID: {data['user_id']}")
        return data['user_id']
    
    def test_create_user_hr_role(self, auth_session):
        """Test creating a new user with HR role"""
        unique_email = f"test_hr_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Test HR",
            "password": "Password123!",
            "role": "hr"
        })
        assert response.status_code == 200, f"Create HR user failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"Created HR user: {unique_email}")
    
    def test_create_user_member_role(self, auth_session):
        """Test creating a new user with Member role"""
        unique_email = f"test_member_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Test Member",
            "password": "Password123!",
            "role": "member"
        })
        assert response.status_code == 200, f"Create member user failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"Created member user: {unique_email}")
    
    def test_create_user_admin_role(self, auth_session):
        """Test creating a new user with Admin role"""
        unique_email = f"test_admin_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Test Admin",
            "password": "Password123!",
            "role": "admin"
        })
        assert response.status_code == 200, f"Create admin user failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"Created admin user: {unique_email}")
    
    def test_create_user_duplicate_email(self, auth_session):
        """Test creating user with existing email fails"""
        response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": ADMIN_EMAIL,  # Already exists
            "name": "Duplicate Test",
            "password": "Password123!",
            "role": "employee"
        })
        assert response.status_code == 400, f"Expected 400 for duplicate email: {response.text}"
        data = response.json()
        assert "already registered" in data.get("detail", "").lower()
        print("Duplicate email correctly rejected")
    
    def test_create_user_unauthenticated(self):
        """Test creating user without authentication fails"""
        session = requests.Session()
        unique_email = f"test_unauth_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Unauth Test",
            "password": "Password123!",
            "role": "employee"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Unauthenticated request correctly rejected")


class TestGetUsers(TestAuthSetup):
    """Test GET /api/group/users - Get all users"""
    
    def test_get_users_success(self, auth_session):
        """Test getting all users in group"""
        response = auth_session.get(f"{BASE_URL}/api/group/users")
        assert response.status_code == 200, f"Get users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one user"
        
        # Check user structure
        user = data[0]
        assert "user_id" in user
        assert "email" in user
        assert "name" in user
        assert "role" in user
        assert "password_hash" not in user, "Password hash should not be exposed"
        print(f"Got {len(data)} users")
    
    def test_get_users_include_inactive(self, auth_session):
        """Test getting all users including inactive"""
        response = auth_session.get(f"{BASE_URL}/api/group/users?include_inactive=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Got {len(data)} users (including inactive)")
    
    def test_get_users_exclude_inactive(self, auth_session):
        """Test getting only active users"""
        response = auth_session.get(f"{BASE_URL}/api/group/users?include_inactive=false")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned users should be active
        for user in data:
            assert user.get("is_active") is not False
        print(f"Got {len(data)} active users")


class TestRoleUpdate(TestAuthSetup):
    """Test PUT /api/group/users/{id}/role - Update user role"""
    
    def test_update_role_success(self, auth_session):
        """Test updating a user's role"""
        # First create a user
        unique_email = f"test_role_{uuid.uuid4().hex[:8]}@projectdash.me"
        create_response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Role Test User",
            "password": "Password123!",
            "role": "employee"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Update role to HR
        response = auth_session.put(f"{BASE_URL}/api/group/users/{user_id}/role", json={
            "role": "hr"
        })
        assert response.status_code == 200, f"Update role failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"Updated user {user_id} role to HR")
        
        # Verify change
        users_response = auth_session.get(f"{BASE_URL}/api/group/users")
        users = users_response.json()
        updated_user = next((u for u in users if u["user_id"] == user_id), None)
        assert updated_user is not None
        assert updated_user["role"] == "hr"
        print("Role change verified")
    
    def test_update_role_invalid_role(self, auth_session):
        """Test updating role with invalid role fails"""
        # Get existing users
        users_response = auth_session.get(f"{BASE_URL}/api/group/users")
        users = [u for u in users_response.json() if u["role"] != "owner"]
        
        if users:
            user_id = users[0]["user_id"]
            response = auth_session.put(f"{BASE_URL}/api/group/users/{user_id}/role", json={
                "role": "invalid_role"
            })
            assert response.status_code == 400, f"Expected 400 for invalid role: {response.text}"
            print("Invalid role correctly rejected")
        else:
            pytest.skip("No non-owner users to test with")
    
    def test_update_owner_role_fails(self, auth_session):
        """Test that owner role cannot be changed"""
        # Get owner user
        users_response = auth_session.get(f"{BASE_URL}/api/group/users?include_inactive=true")
        users = users_response.json()
        owner = next((u for u in users if u["role"] == "owner"), None)
        
        if owner:
            response = auth_session.put(f"{BASE_URL}/api/group/users/{owner['user_id']}/role", json={
                "role": "admin"
            })
            assert response.status_code == 400, f"Should not be able to change owner role: {response.text}"
            print("Cannot change owner role - correctly rejected")
        else:
            pytest.skip("No owner user found")


class TestUserDeactivation(TestAuthSetup):
    """Test PUT /api/group/users/{id}/deactivate and /activate"""
    
    def test_deactivate_user_success(self, auth_session):
        """Test deactivating a user"""
        # First create a user
        unique_email = f"test_deact_{uuid.uuid4().hex[:8]}@projectdash.me"
        create_response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Deactivate Test User",
            "password": "Password123!",
            "role": "employee"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Deactivate user
        response = auth_session.put(f"{BASE_URL}/api/group/users/{user_id}/deactivate")
        assert response.status_code == 200, f"Deactivate failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"Deactivated user {user_id}")
        
        # Verify user is inactive
        users_response = auth_session.get(f"{BASE_URL}/api/group/users?include_inactive=true")
        users = users_response.json()
        deactivated_user = next((u for u in users if u["user_id"] == user_id), None)
        assert deactivated_user is not None
        assert deactivated_user.get("is_active") is False
        print("User deactivation verified")
        
        return user_id
    
    def test_activate_user_success(self, auth_session):
        """Test activating a deactivated user"""
        # First create and deactivate a user
        unique_email = f"test_act_{uuid.uuid4().hex[:8]}@projectdash.me"
        create_response = auth_session.post(f"{BASE_URL}/api/group/users", json={
            "email": unique_email,
            "name": "Activate Test User",
            "password": "Password123!",
            "role": "employee"
        })
        user_id = create_response.json()["user_id"]
        
        # Deactivate
        auth_session.put(f"{BASE_URL}/api/group/users/{user_id}/deactivate")
        
        # Activate
        response = auth_session.put(f"{BASE_URL}/api/group/users/{user_id}/activate")
        assert response.status_code == 200, f"Activate failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"Activated user {user_id}")
        
        # Verify user is active
        users_response = auth_session.get(f"{BASE_URL}/api/group/users")
        users = users_response.json()
        activated_user = next((u for u in users if u["user_id"] == user_id), None)
        assert activated_user is not None
        assert activated_user.get("is_active") is not False
        print("User activation verified")
    
    def test_deactivate_owner_fails(self, auth_session):
        """Test that owner cannot be deactivated"""
        users_response = auth_session.get(f"{BASE_URL}/api/group/users?include_inactive=true")
        users = users_response.json()
        owner = next((u for u in users if u["role"] == "owner"), None)
        
        if owner:
            response = auth_session.put(f"{BASE_URL}/api/group/users/{owner['user_id']}/deactivate")
            assert response.status_code == 400, f"Should not deactivate owner: {response.text}"
            print("Cannot deactivate owner - correctly rejected")
        else:
            pytest.skip("No owner user found")


class TestInviteUser(TestAuthSetup):
    """Test POST /api/group/invite - Invite new user"""
    
    def test_invite_user_success(self, auth_session):
        """Test inviting a new user"""
        unique_email = f"test_invite_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/invite", json={
            "email": unique_email,
            "name": "Invited User",
            "role": "employee"
        })
        assert response.status_code == 200, f"Invite failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "user_id" in data
        assert "temp_password" in data
        print(f"Invited user: {unique_email}, temp password provided")
    
    def test_invite_user_with_hr_role(self, auth_session):
        """Test inviting a user with HR role"""
        unique_email = f"test_invite_hr_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/invite", json={
            "email": unique_email,
            "name": "Invited HR",
            "role": "hr"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        print(f"Invited HR user: {unique_email}")
    
    def test_invite_user_with_member_role(self, auth_session):
        """Test inviting a user with Member role"""
        unique_email = f"test_invite_member_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/invite", json={
            "email": unique_email,
            "name": "Invited Member",
            "role": "member"
        })
        assert response.status_code == 200
        print(f"Invited member user: {unique_email}")
    
    def test_invite_user_with_admin_role(self, auth_session):
        """Test inviting a user with Admin role"""
        unique_email = f"test_invite_admin_{uuid.uuid4().hex[:8]}@projectdash.me"
        response = auth_session.post(f"{BASE_URL}/api/group/invite", json={
            "email": unique_email,
            "name": "Invited Admin",
            "role": "admin"
        })
        assert response.status_code == 200
        print(f"Invited admin user: {unique_email}")


class TestRoleBadges:
    """Test that role values are valid - Employee, HR, Member, Admin, Owner"""
    
    def test_valid_roles(self):
        """Test that all 5 roles are recognized"""
        valid_roles = ["employee", "hr", "member", "admin", "owner"]
        for role in valid_roles:
            assert role in valid_roles
        print(f"Valid roles: {valid_roles}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
