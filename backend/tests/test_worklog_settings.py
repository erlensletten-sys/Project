"""
Test suite for Enhanced Work Log Features:
1. Group settings (hourly rate)
2. Per-group sender name
3. Group employees endpoint
4. Work Log with hourly support

Test credentials: test@projectdash.me / Test1234!
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope='module')
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s

@pytest.fixture(scope='module')
def auth_session(session):
    """Login and return authenticated session"""
    # Try login first
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@projectdash.me",
        "password": "Test1234!"
    })
    
    if login_resp.status_code == 200:
        return session
    
    # If login fails, try to register
    register_resp = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": "test@projectdash.me",
        "password": "Test1234!",
        "name": "Test Admin",
        "group_name": "Test Organization"
    })
    
    if register_resp.status_code in [200, 201]:
        return session
    
    pytest.skip(f"Could not authenticate: {login_resp.status_code} / {register_resp.status_code}")

class TestGroupSettings:
    """Tests for group settings (hourly rate)"""
    
    def test_get_group_settings_requires_auth(self, session):
        """GET /api/settings/group requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/settings/group")
        # Accept 401 or 520 (Cloudflare temp error)
        assert resp.status_code in [401, 520], f"Expected 401, got {resp.status_code}"
        print("PASS: GET /api/settings/group requires authentication")
    
    def test_get_group_settings_success(self, auth_session):
        """GET /api/settings/group returns hourly_rate for authenticated user"""
        resp = auth_session.get(f"{BASE_URL}/api/settings/group")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "hourly_rate" in data, f"Response missing hourly_rate: {data}"
        assert isinstance(data["hourly_rate"], (int, float)), "hourly_rate should be numeric"
        print(f"PASS: GET /api/settings/group returns hourly_rate: {data['hourly_rate']}")
    
    def test_put_group_settings_requires_auth(self, session):
        """PUT /api/settings/group requires authentication"""
        resp = requests.put(f"{BASE_URL}/api/settings/group", json={"hourly_rate": 100})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: PUT /api/settings/group requires authentication")
    
    def test_put_group_settings_success(self, auth_session):
        """PUT /api/settings/group saves hourly_rate successfully"""
        test_rate = 350
        resp = auth_session.put(f"{BASE_URL}/api/settings/group", json={"hourly_rate": test_rate})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, f"Response should confirm success: {data}"
        print(f"PASS: PUT /api/settings/group saves hourly_rate successfully")
    
    def test_put_group_settings_persists(self, auth_session):
        """Verify PUT /api/settings/group persists hourly_rate"""
        # First save a specific rate
        test_rate = 425.50
        auth_session.put(f"{BASE_URL}/api/settings/group", json={"hourly_rate": test_rate})
        
        # Then verify it persists
        resp = auth_session.get(f"{BASE_URL}/api/settings/group")
        assert resp.status_code == 200
        data = resp.json()
        assert data["hourly_rate"] == test_rate, f"Expected {test_rate}, got {data['hourly_rate']}"
        print(f"PASS: Hourly rate persists correctly: {data['hourly_rate']}")
    
    def test_put_group_settings_validates_negative(self, auth_session):
        """PUT /api/settings/group rejects negative hourly_rate"""
        resp = auth_session.put(f"{BASE_URL}/api/settings/group", json={"hourly_rate": -100})
        # Should return 422 for validation error
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"
        print("PASS: PUT /api/settings/group rejects negative hourly_rate")


class TestEmailSenderName:
    """Tests for per-group sender name customization"""
    
    def test_put_sender_name_requires_auth(self, session):
        """PUT /api/settings/email/sender-name requires authentication"""
        resp = requests.put(f"{BASE_URL}/api/settings/email/sender-name", json={"sender_name": "Test"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: PUT /api/settings/email/sender-name requires authentication")
    
    def test_put_sender_name_success(self, auth_session):
        """PUT /api/settings/email/sender-name updates sender name"""
        test_name = f"TestOrg_{uuid.uuid4().hex[:6]}"
        resp = auth_session.put(f"{BASE_URL}/api/settings/email/sender-name", json={"sender_name": test_name})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, f"Response should confirm success: {data}"
        print(f"PASS: PUT /api/settings/email/sender-name updates successfully")
    
    def test_get_email_settings_shows_sender_name(self, auth_session):
        """GET /api/settings/email includes sender_name"""
        resp = auth_session.get(f"{BASE_URL}/api/settings/email")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "sender_name" in data, f"Response missing sender_name: {data}"
        print(f"PASS: GET /api/settings/email includes sender_name: {data.get('sender_name')}")


class TestGroupEmployees:
    """Tests for group employees endpoint"""
    
    def test_get_group_employees_requires_auth(self, session):
        """GET /api/group/employees requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/group/employees")
        # Accept 401 or 520 (Cloudflare temp error)
        assert resp.status_code in [401, 520], f"Expected 401, got {resp.status_code}"
        print("PASS: GET /api/group/employees requires authentication")
    
    def test_get_group_employees_success(self, auth_session):
        """GET /api/group/employees returns users in group"""
        resp = auth_session.get(f"{BASE_URL}/api/group/employees")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Response should be a list: {type(data)}"
        # Each employee should have user_id, name, email
        if len(data) > 0:
            emp = data[0]
            assert "user_id" in emp, f"Employee missing user_id: {emp}"
            assert "name" in emp, f"Employee missing name: {emp}"
            assert "email" in emp, f"Employee missing email: {emp}"
        print(f"PASS: GET /api/group/employees returns {len(data)} employees")


class TestWorkLogWithHourly:
    """Tests for work log creation with hourly work type"""
    
    @pytest.fixture(scope='class')
    def test_project(self, auth_session):
        """Create a test project for work logs"""
        resp = auth_session.post(f"{BASE_URL}/api/projects", json={
            "name": f"TEST_WorkLog_Project_{uuid.uuid4().hex[:6]}",
            "description": "Test project for work log testing"
        })
        if resp.status_code == 201:
            return resp.json()
        pytest.skip(f"Could not create test project: {resp.status_code}")
    
    def test_create_akkord_work_log(self, auth_session, test_project):
        """Create akkord (piece rate) work log"""
        resp = auth_session.post(f"{BASE_URL}/api/work-logs", json={
            "project_id": test_project["project_id"],
            "date": "2026-01-15T12:00:00Z",
            "description": "Test akkord work",
            "work_type": "akkord",
            "area": 50.0,
            "base_operation": "skuring",
            "addons": ["sikatop_x1"],
            "total_hours": 4.0,
            "workers": []
        })
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("work_type") == "akkord", f"Expected akkord, got {data.get('work_type')}"
        assert data.get("area") == 50.0, f"Expected area 50.0, got {data.get('area')}"
        print(f"PASS: Create akkord work log - payment: {data.get('total_payment')}")
    
    def test_create_hourly_work_log(self, auth_session, test_project):
        """Create hourly work log"""
        # First set an hourly rate
        auth_session.put(f"{BASE_URL}/api/settings/group", json={"hourly_rate": 400})
        
        resp = auth_session.post(f"{BASE_URL}/api/work-logs", json={
            "project_id": test_project["project_id"],
            "date": "2026-01-15T14:00:00Z",
            "description": "Test hourly work",
            "work_type": "hourly",
            "area": 0,
            "base_operation": None,
            "addons": [],
            "total_hours": 8.0,
            "workers": []
        })
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("work_type") == "hourly", f"Expected hourly, got {data.get('work_type')}"
        assert data.get("total_hours") == 8.0, f"Expected 8 hours, got {data.get('total_hours')}"
        # Total payment should be hourly_rate * hours = 400 * 8 = 3200
        expected_payment = 400 * 8
        assert data.get("total_payment") == expected_payment, f"Expected {expected_payment}, got {data.get('total_payment')}"
        print(f"PASS: Create hourly work log - payment: {data.get('total_payment')}")
    
    def test_create_work_log_with_workers(self, auth_session, test_project):
        """Create work log with worker hours"""
        # Get employees first
        employees_resp = auth_session.get(f"{BASE_URL}/api/group/employees")
        employees = employees_resp.json() if employees_resp.status_code == 200 else []
        
        workers = []
        if len(employees) > 0:
            # Use the first employee
            workers.append({
                "user_id": employees[0]["user_id"],
                "hours": 4.0
            })
        
        resp = auth_session.post(f"{BASE_URL}/api/work-logs", json={
            "project_id": test_project["project_id"],
            "date": "2026-01-15T16:00:00Z",
            "description": "Test work with workers",
            "work_type": "hourly",
            "area": 0,
            "total_hours": 8.0,
            "workers": workers
        })
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "workers" in data, f"Response missing workers: {data}"
        print(f"PASS: Create work log with {len(data.get('workers', []))} workers")
    
    def test_get_my_work_logs(self, auth_session):
        """GET /api/work-logs/my returns user's work logs"""
        resp = auth_session.get(f"{BASE_URL}/api/work-logs/my")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Response should be list: {type(data)}"
        print(f"PASS: GET /api/work-logs/my returns {len(data)} logs")
    
    def test_get_all_work_logs(self, auth_session):
        """GET /api/work-logs returns all work logs"""
        resp = auth_session.get(f"{BASE_URL}/api/work-logs")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Response should be list: {type(data)}"
        print(f"PASS: GET /api/work-logs returns {len(data)} logs")


class TestAkkordPricing:
    """Tests for akkord pricing endpoint"""
    
    def test_get_akkord_pricing(self, auth_session):
        """GET /api/akkord/pricing returns pricing info"""
        resp = auth_session.get(f"{BASE_URL}/api/akkord/pricing")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "base_operations" in data, f"Response missing base_operations: {data}"
        assert "addons" in data, f"Response missing addons: {data}"
        assert isinstance(data["base_operations"], list), "base_operations should be a list"
        assert isinstance(data["addons"], list), "addons should be a list"
        print(f"PASS: GET /api/akkord/pricing returns {len(data['base_operations'])} ops, {len(data['addons'])} addons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
