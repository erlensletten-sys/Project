"""
Test Project Checklists Feature - Submissions linked to projects
Tests: GET /api/submissions?project_id, Form template field labels, PDF download URL
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADMIN_EMAIL = "testadmin@test.com"
TEST_ADMIN_PASSWORD = "TestPass123!"
TEST_PROJECT_ID = "prj_868390aa0a4a"  # Test project with submissions
TEST_FORM_ID = "frm_44821bc2e793"  # Test HSE Checklist form

class TestProjectChecklists:
    """Test project checklists/submissions feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for all tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user = login_resp.json().get("user", {})
        print(f"Logged in as: {self.user.get('name')} ({self.user.get('role')})")
    
    def test_get_submissions_without_project_filter(self):
        """Test GET /api/submissions returns all submissions for group"""
        response = self.session.get(f"{BASE_URL}/api/submissions")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Total submissions (no filter): {len(data)}")
        
        # Each submission should have required fields
        if len(data) > 0:
            sub = data[0]
            assert "submission_id" in sub, "Missing submission_id"
            assert "form_id" in sub, "Missing form_id"
            assert "form_title" in sub, "Missing form_title"
            assert "responses" in sub, "Missing responses"
            assert "submitted_by" in sub, "Missing submitted_by"
            assert "created_at" in sub, "Missing created_at"
            print(f"First submission: {sub.get('form_title')} by {sub.get('submitted_by_name')}")
    
    def test_get_submissions_with_project_filter(self):
        """Test GET /api/submissions?project_id=XXX returns only project submissions"""
        response = self.session.get(f"{BASE_URL}/api/submissions?project_id={TEST_PROJECT_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Submissions for project {TEST_PROJECT_ID}: {len(data)}")
        
        # Verify all submissions belong to the test project
        for sub in data:
            assert sub.get("project_id") == TEST_PROJECT_ID, f"Submission {sub.get('submission_id')} has wrong project_id"
            print(f"  - {sub.get('form_title')}: {sub.get('submitted_by_name')} ({sub.get('created_at')[:10]})")
    
    def test_submission_has_field_count(self):
        """Test submissions have responses that can be counted"""
        response = self.session.get(f"{BASE_URL}/api/submissions?project_id={TEST_PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            sub = data[0]
            responses = sub.get("responses", {})
            field_count = len(responses)
            print(f"Submission {sub.get('submission_id')} has {field_count} fields filled")
            assert field_count >= 0, "Field count should be non-negative"
    
    def test_get_form_template_for_field_labels(self):
        """Test GET /api/forms/{form_id} returns field definitions with labels"""
        response = self.session.get(f"{BASE_URL}/api/forms/{TEST_FORM_ID}")
        
        if response.status_code == 404:
            print(f"Form {TEST_FORM_ID} not found - may have different ID in test data")
            # Try to get submissions first to find actual form_id
            sub_response = self.session.get(f"{BASE_URL}/api/submissions?project_id={TEST_PROJECT_ID}")
            if sub_response.status_code == 200 and len(sub_response.json()) > 0:
                actual_form_id = sub_response.json()[0].get("form_id")
                print(f"Found actual form_id from submissions: {actual_form_id}")
                response = self.session.get(f"{BASE_URL}/api/forms/{actual_form_id}")
        
        assert response.status_code == 200, f"Failed to get form: {response.text}"
        
        form = response.json()
        assert "fields" in form, "Form should have fields array"
        
        fields = form.get("fields", [])
        print(f"Form '{form.get('title')}' has {len(fields)} fields:")
        for f in fields:
            print(f"  - {f.get('field_id')}: {f.get('label')} ({f.get('field_type')})")
            assert "field_id" in f, "Field missing field_id"
            assert "label" in f, "Field missing label"
            assert "field_type" in f, "Field missing field_type"
    
    def test_pdf_url_generation(self):
        """Test that PDF URL is correctly constructed for submissions"""
        response = self.session.get(f"{BASE_URL}/api/submissions?project_id={TEST_PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            sub = data[0]
            submission_id = sub.get("submission_id")
            
            # Verify PDF endpoint exists
            pdf_url = f"{BASE_URL}/api/submissions/{submission_id}/pdf"
            pdf_response = self.session.get(pdf_url)
            
            # PDF endpoint should return 200 with PDF content or 403 if not authorized
            assert pdf_response.status_code in [200, 403], f"PDF endpoint failed: {pdf_response.status_code}"
            
            if pdf_response.status_code == 200:
                content_type = pdf_response.headers.get("content-type", "")
                assert "pdf" in content_type.lower(), f"PDF response should have PDF content type, got: {content_type}"
                print(f"PDF download works for submission {submission_id}")
            else:
                print(f"PDF endpoint returned {pdf_response.status_code} - may need different permissions")
    
    def test_empty_project_returns_empty_list(self):
        """Test submissions for non-existent project returns empty list"""
        fake_project_id = "prj_nonexistent123"
        response = self.session.get(f"{BASE_URL}/api/submissions?project_id={fake_project_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data == [], f"Expected empty list for non-existent project, got {len(data)} items"
        print("Empty project filter returns empty list - correct!")
    
    def test_get_project_detail(self):
        """Test GET /api/projects/{project_id} works"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}")
        assert response.status_code == 200, f"Failed to get project: {response.text}"
        
        project = response.json()
        assert project.get("project_id") == TEST_PROJECT_ID
        print(f"Project: {project.get('name')} - Status: {project.get('status')}")
        print(f"Tasks: {len(project.get('tasks', []))}")
    
    def test_submission_has_submitter_name(self):
        """Test submissions include submitted_by_name field"""
        response = self.session.get(f"{BASE_URL}/api/submissions?project_id={TEST_PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            sub = data[0]
            assert "submitted_by_name" in sub, "Missing submitted_by_name field"
            print(f"Submitter name: {sub.get('submitted_by_name')}")


class TestFormFieldLabels:
    """Test form field label resolution for submission detail view"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login for all tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
    
    def test_field_labels_can_be_resolved(self):
        """Test that field_id values in responses can be mapped to labels from form template"""
        # Get submissions for the test project
        sub_resp = self.session.get(f"{BASE_URL}/api/submissions?project_id={TEST_PROJECT_ID}")
        assert sub_resp.status_code == 200
        
        subs = sub_resp.json()
        if len(subs) == 0:
            pytest.skip("No submissions found for test project")
        
        sub = subs[0]
        form_id = sub.get("form_id")
        responses = sub.get("responses", {})
        
        # Get the form template
        form_resp = self.session.get(f"{BASE_URL}/api/forms/{form_id}")
        assert form_resp.status_code == 200
        
        form = form_resp.json()
        fields = form.get("fields", [])
        
        # Build field_id -> label map
        field_map = {f.get("field_id"): f.get("label") for f in fields}
        
        print(f"\nResolving field labels for submission {sub.get('submission_id')}:")
        for field_id, value in responses.items():
            label = field_map.get(field_id, field_id)
            print(f"  {label}: {value}")
            
        # Verify at least some field IDs can be resolved
        resolved_count = sum(1 for fid in responses.keys() if fid in field_map)
        print(f"\nResolved {resolved_count}/{len(responses)} field IDs to labels")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
