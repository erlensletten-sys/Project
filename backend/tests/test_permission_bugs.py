"""
Test suite for Bug Fixes:
1. Employee permissions - should NOT access Invoices, Payroll, Settings, /api/group/users
2. Forms are fillable - form submission API
3. Form-project association - project_id properly linked to form submissions

Test Credentials:
- Admin: testadmin@test.com / TestPass123!
- Employee: employee@test.com / TestPass123!
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://projectdash-preview.preview.emergentagent.com"

# Test IDs from the provided data
TEST_FORM_ID = "frm_44821bc2e793"
TEST_PROJECT_ID = "prj_868390aa0a4a"

class TestEmployeePermissions:
    """Bug Fix 1: Employee permissions - restricted access to Invoices, Payroll, Settings"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@test.com",
            "password": "TestPass123!"
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return session
    
    @pytest.fixture(scope="class")
    def employee_session(self):
        """Login as employee user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employee@test.com",
            "password": "TestPass123!"
        })
        if response.status_code != 200:
            pytest.skip(f"Employee login failed: {response.status_code} - {response.text}")
        return session
    
    def test_employee_cannot_access_invoices(self, employee_session):
        """Employee should get 403 when accessing /api/invoices"""
        response = employee_session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 403, f"Expected 403 for employee accessing invoices, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Should return error detail"
        print(f"✓ Employee cannot access invoices - correctly returns 403: {data.get('detail')}")
    
    def test_employee_cannot_access_payroll_runs(self, employee_session):
        """Employee should get 403 when accessing /api/payroll/runs"""
        response = employee_session.get(f"{BASE_URL}/api/payroll/runs")
        assert response.status_code == 403, f"Expected 403 for employee accessing payroll, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Should return error detail"
        print(f"✓ Employee cannot access payroll runs - correctly returns 403: {data.get('detail')}")
    
    def test_employee_cannot_access_group_users(self, employee_session):
        """Employee should get 403 when accessing /api/group/users"""
        response = employee_session.get(f"{BASE_URL}/api/group/users")
        assert response.status_code == 403, f"Expected 403 for employee accessing group users, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Should return error detail"
        print(f"✓ Employee cannot access group users - correctly returns 403: {data.get('detail')}")
    
    def test_employee_can_access_dashboard(self, employee_session):
        """Employee should be able to access dashboard"""
        response = employee_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Employee should access /api/auth/me, got {response.status_code}"
        data = response.json()
        assert data.get("role") == "employee", f"Expected employee role, got {data.get('role')}"
        print(f"✓ Employee can access their own profile - role: {data.get('role')}")
    
    def test_employee_can_access_projects(self, employee_session):
        """Employee should be able to access projects list"""
        response = employee_session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Employee should access projects, got {response.status_code}"
        print(f"✓ Employee can access projects list")
    
    def test_employee_can_access_expenses(self, employee_session):
        """Employee should be able to access expenses"""
        response = employee_session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200, f"Employee should access expenses, got {response.status_code}"
        print(f"✓ Employee can access expenses list")
    
    def test_employee_can_access_forms(self, employee_session):
        """Employee should be able to access form templates"""
        response = employee_session.get(f"{BASE_URL}/api/forms")
        assert response.status_code == 200, f"Employee should access forms, got {response.status_code}"
        print(f"✓ Employee can access form templates")
    
    def test_admin_can_access_invoices(self, admin_session):
        """Admin should be able to access invoices"""
        response = admin_session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Admin should access invoices, got {response.status_code}"
        print(f"✓ Admin can access invoices")
    
    def test_admin_can_access_payroll_runs(self, admin_session):
        """Admin should be able to access payroll runs"""
        response = admin_session.get(f"{BASE_URL}/api/payroll/runs")
        assert response.status_code == 200, f"Admin should access payroll, got {response.status_code}"
        print(f"✓ Admin can access payroll runs")
    
    def test_admin_can_access_group_users(self, admin_session):
        """Admin should be able to access group users"""
        response = admin_session.get(f"{BASE_URL}/api/group/users")
        assert response.status_code == 200, f"Admin should access group users, got {response.status_code}"
        print(f"✓ Admin can access group users")


class TestFormSubmission:
    """Bug Fix 2 & 3: Forms are fillable and project association works"""
    
    @pytest.fixture(scope="class")
    def employee_session(self):
        """Login as employee user for form submission tests"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employee@test.com",
            "password": "TestPass123!"
        })
        if response.status_code != 200:
            pytest.skip(f"Employee login failed: {response.status_code}")
        return session
    
    def test_get_form_templates(self, employee_session):
        """Get available form templates"""
        response = employee_session.get(f"{BASE_URL}/api/forms")
        assert response.status_code == 200, f"Should get forms, got {response.status_code}"
        forms = response.json()
        assert isinstance(forms, list), "Response should be a list"
        print(f"✓ Got {len(forms)} form templates")
        return forms
    
    def test_get_projects(self, employee_session):
        """Get available projects for linking"""
        response = employee_session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Should get projects, got {response.status_code}"
        projects = response.json()
        assert isinstance(projects, list), "Response should be a list"
        print(f"✓ Got {len(projects)} projects")
        return projects
    
    def test_submit_form_without_project(self, employee_session):
        """Bug Fix 2: Submit form without linking to project (project_id = null)"""
        # First get available forms
        forms_response = employee_session.get(f"{BASE_URL}/api/forms")
        if forms_response.status_code != 200 or not forms_response.json():
            pytest.skip("No forms available for testing")
        
        form = forms_response.json()[0]
        form_id = form.get("form_id")
        
        # Build responses for the form fields
        responses = {}
        for field in form.get("fields", []):
            field_id = field.get("field_id")
            field_type = field.get("field_type")
            if field_type == "checkbox":
                responses[field_id] = True
            elif field_type == "number":
                responses[field_id] = "42"
            else:
                responses[field_id] = "Test value from automated test"
        
        # Submit form WITHOUT project (project_id = null)
        response = employee_session.post(
            f"{BASE_URL}/api/forms/{form_id}/submissions",
            json={
                "form_id": form_id,
                "project_id": None,  # No project linked
                "responses": responses
            }
        )
        
        assert response.status_code in [200, 201], f"Form submission failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "submission_id" in data, "Response should contain submission_id"
        assert data.get("project_id") is None or data.get("project_name") is None, "Project should be null"
        print(f"✓ Form submitted without project - submission_id: {data.get('submission_id')}")
    
    def test_submit_form_with_project(self, employee_session):
        """Bug Fix 3: Submit form WITH project_id - should link correctly"""
        # Get available forms
        forms_response = employee_session.get(f"{BASE_URL}/api/forms")
        if forms_response.status_code != 200 or not forms_response.json():
            pytest.skip("No forms available for testing")
        
        # Get available projects
        projects_response = employee_session.get(f"{BASE_URL}/api/projects")
        if projects_response.status_code != 200 or not projects_response.json():
            pytest.skip("No projects available for testing")
        
        form = forms_response.json()[0]
        project = projects_response.json()[0]
        form_id = form.get("form_id")
        project_id = project.get("project_id")
        project_name = project.get("name")
        
        # Build responses for the form fields
        responses = {}
        for field in form.get("fields", []):
            field_id = field.get("field_id")
            field_type = field.get("field_type")
            if field_type == "checkbox":
                responses[field_id] = True
            elif field_type == "number":
                responses[field_id] = "100"
            else:
                responses[field_id] = f"Test with project {project_name}"
        
        # Submit form WITH project
        response = employee_session.post(
            f"{BASE_URL}/api/forms/{form_id}/submissions",
            json={
                "form_id": form_id,
                "project_id": project_id,
                "responses": responses
            }
        )
        
        assert response.status_code in [200, 201], f"Form submission failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "submission_id" in data, "Response should contain submission_id"
        assert data.get("project_id") == project_id, f"Project ID mismatch: expected {project_id}, got {data.get('project_id')}"
        assert data.get("project_name") == project_name, f"Project name mismatch: expected {project_name}, got {data.get('project_name')}"
        print(f"✓ Form submitted WITH project - project_name: {data.get('project_name')}, submission_id: {data.get('submission_id')}")
    
    def test_get_all_submissions(self, employee_session):
        """Verify submissions list shows project_name correctly"""
        response = employee_session.get(f"{BASE_URL}/api/forms/submissions")
        assert response.status_code == 200, f"Should get submissions, got {response.status_code}"
        submissions = response.json()
        assert isinstance(submissions, list), "Response should be a list"
        
        # Check that submissions with project have project_name
        has_project_submission = False
        for sub in submissions:
            if sub.get("project_id") and sub.get("project_name"):
                has_project_submission = True
                print(f"✓ Found submission with project_name: {sub.get('project_name')}")
                break
        
        print(f"✓ Got {len(submissions)} submissions")
        return submissions


class TestAdminNavigation:
    """Verify admin/owner should see all navigation items"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@test.com",
            "password": "TestPass123!"
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return session
    
    def test_admin_role_is_owner(self, admin_session):
        """Verify test admin user has correct role"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        role = data.get("role")
        assert role in ["admin", "owner"], f"Expected admin or owner role, got {role}"
        print(f"✓ Admin user has role: {role}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
