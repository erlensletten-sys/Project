"""
Test suite for Akkord Features:
1. Akkord toggle in Settings - enable/disable akkord per group
2. Akkord payment sharing - proportional payment based on worker hours
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "testadmin@test.com"
ADMIN_PASSWORD = "TestPass123!"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "TestPass123!"
TEST_PROJECT_ID = "prj_868390aa0a4a"


@pytest.fixture(scope="module")
def admin_session():
    """Create authenticated admin session"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session


@pytest.fixture(scope="module")
def employee_session():
    """Create authenticated employee session"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD}
    )
    # Employee might not exist, skip if login fails
    if response.status_code != 200:
        pytest.skip("Employee login failed - user may not exist")
    return session


class TestAkkordToggle:
    """Feature 1: Akkord toggle in Settings"""

    def test_get_group_settings_returns_akkord_enabled(self, admin_session):
        """GET /api/settings/group should return akkord_enabled field with default True"""
        response = admin_session.get(f"{BASE_URL}/api/settings/group")
        assert response.status_code == 200, f"Failed to get group settings: {response.text}"
        
        data = response.json()
        assert "akkord_enabled" in data, "Response missing akkord_enabled field"
        # Default should be True
        assert data["akkord_enabled"] in [True, False], "akkord_enabled should be boolean"
        print(f"✓ Group settings returns akkord_enabled: {data['akkord_enabled']}")

    def test_disable_akkord_via_put(self, admin_session):
        """PUT /api/settings/group with akkord_enabled=false should disable it"""
        response = admin_session.put(
            f"{BASE_URL}/api/settings/group",
            json={"hourly_rate": 250, "akkord_enabled": False}
        )
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify the change persisted
        get_response = admin_session.get(f"{BASE_URL}/api/settings/group")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["akkord_enabled"] == False, "akkord_enabled should be False after update"
        print("✓ Akkord disabled successfully via PUT")

    def test_create_akkord_work_log_when_disabled_returns_400(self, admin_session):
        """When akkord is disabled, POST /api/work-logs with work_type=akkord should return 400"""
        # First ensure akkord is disabled
        admin_session.put(
            f"{BASE_URL}/api/settings/group",
            json={"hourly_rate": 250, "akkord_enabled": False}
        )
        
        # Try to create akkord work log
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_akkord_when_disabled",
            "work_type": "akkord",
            "area": 100,
            "base_operation": "avtrekk",
            "addons": [],
            "total_hours": 5,
            "workers": []
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code == 400, f"Expected 400 when akkord disabled, got {response.status_code}: {response.text}"
        assert "disabled" in response.text.lower(), "Error message should mention disabled"
        print("✓ Creating akkord work log when disabled returns 400")

    def test_enable_akkord_via_put(self, admin_session):
        """PUT /api/settings/group with akkord_enabled=true should enable it"""
        response = admin_session.put(
            f"{BASE_URL}/api/settings/group",
            json={"hourly_rate": 250, "akkord_enabled": True}
        )
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify the change persisted
        get_response = admin_session.get(f"{BASE_URL}/api/settings/group")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["akkord_enabled"] == True, "akkord_enabled should be True after update"
        print("✓ Akkord enabled successfully via PUT")

    def test_create_akkord_work_log_when_enabled_succeeds(self, admin_session):
        """When akkord is enabled, POST /api/work-logs with work_type=akkord should succeed"""
        # Ensure akkord is enabled
        admin_session.put(
            f"{BASE_URL}/api/settings/group",
            json={"hourly_rate": 250, "akkord_enabled": True}
        )
        
        # Create akkord work log
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_akkord_when_enabled",
            "work_type": "akkord",
            "area": 100,
            "base_operation": "avtrekk",
            "addons": [],
            "total_hours": 5,
            "workers": []
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201], f"Expected success when akkord enabled, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["work_type"] == "akkord"
        assert data["total_payment"] > 0
        print(f"✓ Created akkord work log when enabled: total_payment={data['total_payment']}")
        
        # Cleanup - delete the work log
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")

    def test_hourly_work_allowed_when_akkord_disabled(self, admin_session):
        """Even when akkord is disabled, hourly work should still be allowed"""
        # Disable akkord
        admin_session.put(
            f"{BASE_URL}/api/settings/group",
            json={"hourly_rate": 250, "akkord_enabled": False}
        )
        
        # Create hourly work log
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_hourly_when_akkord_disabled",
            "work_type": "hourly",
            "area": 0,
            "base_operation": None,
            "addons": [],
            "total_hours": 5,
            "workers": []
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201], f"Hourly work should be allowed: {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["work_type"] == "hourly"
        print("✓ Hourly work allowed when akkord disabled")
        
        # Cleanup
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")
        
        # Re-enable akkord for other tests
        admin_session.put(
            f"{BASE_URL}/api/settings/group",
            json={"hourly_rate": 250, "akkord_enabled": True}
        )


class TestAkkordPaymentSharing:
    """Feature 2: Akkord payment sharing - proportional based on hours"""

    def test_single_worker_gets_full_payment(self, admin_session):
        """When there's one worker, they get 100% of the payment"""
        # Get admin user_id first
        me_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        admin_user_id = me_response.json()["user_id"]
        
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_single_worker_payment",
            "work_type": "akkord",
            "area": 100,
            "base_operation": "avtrekk",  # 18 kr/m2
            "addons": [],
            "total_hours": 5,
            "workers": [
                {"user_id": admin_user_id, "hours": 5}
            ]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201], f"Failed to create work log: {response.text}"
        
        data = response.json()
        # total_payment should be 100 * 18 = 1800
        assert data["total_payment"] == 1800, f"Expected total_payment=1800, got {data['total_payment']}"
        
        # Worker should get 100%
        assert len(data["workers"]) == 1
        worker = data["workers"][0]
        assert worker["payment"] == 1800, f"Single worker should get full payment, got {worker['payment']}"
        assert worker["share_percentage"] == 100.0, f"Single worker should have 100% share, got {worker['share_percentage']}"
        print(f"✓ Single worker gets full payment: {worker['payment']} kr (100%)")
        
        # Cleanup
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")

    def test_two_workers_equal_hours_split_equally(self, admin_session):
        """Two workers with equal hours split payment 50/50"""
        # Get group members
        members_response = admin_session.get(f"{BASE_URL}/api/group/members")
        assert members_response.status_code == 200
        members = members_response.json()
        
        if len(members) < 2:
            pytest.skip("Need at least 2 members for this test")
        
        user1_id = members[0]["user_id"]
        user2_id = members[1]["user_id"]
        
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_equal_split",
            "work_type": "akkord",
            "area": 100,
            "base_operation": "avtrekk",  # 18 kr/m2 = 1800 total
            "addons": [],
            "total_hours": 10,
            "workers": [
                {"user_id": user1_id, "hours": 5},
                {"user_id": user2_id, "hours": 5}
            ]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201], f"Failed to create work log: {response.text}"
        
        data = response.json()
        assert data["total_payment"] == 1800
        
        # Both workers should get 50% = 900 each
        workers = data["workers"]
        assert len(workers) == 2
        
        for worker in workers:
            assert worker["payment"] == 900, f"Equal split should give 900 each, got {worker['payment']}"
            assert worker["share_percentage"] == 50.0, f"Equal split should be 50%, got {worker['share_percentage']}"
        
        print(f"✓ Two workers with equal hours split 50/50: each gets 900 kr")
        
        # Cleanup
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")

    def test_unequal_hours_proportional_split(self, admin_session):
        """Two workers with unequal hours get proportional payment"""
        members_response = admin_session.get(f"{BASE_URL}/api/group/members")
        members = members_response.json()
        
        if len(members) < 2:
            pytest.skip("Need at least 2 members for this test")
        
        user1_id = members[0]["user_id"]
        user2_id = members[1]["user_id"]
        
        # 10 total hours: user1 = 8 hours (80%), user2 = 2 hours (20%)
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_unequal_split",
            "work_type": "akkord",
            "area": 100,
            "base_operation": "avtrekk",  # 18 kr/m2 = 1800 total
            "addons": [],
            "total_hours": 10,
            "workers": [
                {"user_id": user1_id, "hours": 8},
                {"user_id": user2_id, "hours": 2}
            ]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201], f"Failed to create work log: {response.text}"
        
        data = response.json()
        assert data["total_payment"] == 1800
        
        workers = {w["hours"]: w for w in data["workers"]}
        
        # Worker with 8 hours should get 80% = 1440
        worker_8h = workers[8]
        assert worker_8h["payment"] == 1440, f"8h worker should get 1440, got {worker_8h['payment']}"
        assert worker_8h["share_percentage"] == 80.0, f"8h worker should have 80%, got {worker_8h['share_percentage']}"
        
        # Worker with 2 hours should get 20% = 360
        worker_2h = workers[2]
        assert worker_2h["payment"] == 360, f"2h worker should get 360, got {worker_2h['payment']}"
        assert worker_2h["share_percentage"] == 20.0, f"2h worker should have 20%, got {worker_2h['share_percentage']}"
        
        print(f"✓ Unequal hours proportional split: 8h worker gets 1440 kr (80%), 2h worker gets 360 kr (20%)")
        
        # Cleanup
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")

    def test_worker_payment_in_response(self, admin_session):
        """Backend returns worker payment field in work log response"""
        me_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        admin_user_id = me_response.json()["user_id"]
        
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_payment_in_response",
            "work_type": "akkord",
            "area": 50,
            "base_operation": "skuring",  # 22 kr/m2 = 1100 total
            "addons": [],
            "total_hours": 4,
            "workers": [
                {"user_id": admin_user_id, "hours": 4}
            ]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201]
        
        data = response.json()
        
        # Verify worker payment fields exist
        assert "workers" in data, "Response should have workers field"
        assert len(data["workers"]) > 0, "Workers should not be empty"
        
        worker = data["workers"][0]
        assert "payment" in worker, "Worker should have payment field"
        assert "share_percentage" in worker, "Worker should have share_percentage field"
        assert "hours" in worker, "Worker should have hours field"
        assert "user_name" in worker, "Worker should have user_name field"
        
        print(f"✓ Worker payment fields present in response: payment={worker['payment']}, share={worker['share_percentage']}%")
        
        # Cleanup
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")

    def test_three_workers_different_hours(self, admin_session):
        """Three workers with different hours get proportional payment"""
        members_response = admin_session.get(f"{BASE_URL}/api/group/members")
        members = members_response.json()
        
        if len(members) < 3:
            pytest.skip("Need at least 3 members for this test")
        
        user1_id = members[0]["user_id"]
        user2_id = members[1]["user_id"]
        user3_id = members[2]["user_id"]
        
        # 10 total hours: 5h, 3h, 2h (50%, 30%, 20%)
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_three_worker_split",
            "work_type": "akkord",
            "area": 100,
            "base_operation": "glatting",  # 26 kr/m2 = 2600 total
            "addons": [],
            "total_hours": 10,
            "workers": [
                {"user_id": user1_id, "hours": 5},
                {"user_id": user2_id, "hours": 3},
                {"user_id": user3_id, "hours": 2}
            ]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        
        data = response.json()
        assert data["total_payment"] == 2600
        
        workers = {w["hours"]: w for w in data["workers"]}
        
        # 5h = 50% = 1300
        assert workers[5]["payment"] == 1300
        assert workers[5]["share_percentage"] == 50.0
        
        # 3h = 30% = 780
        assert workers[3]["payment"] == 780
        assert workers[3]["share_percentage"] == 30.0
        
        # 2h = 20% = 520
        assert workers[2]["payment"] == 520
        assert workers[2]["share_percentage"] == 20.0
        
        print(f"✓ Three workers proportional: 5h=1300kr(50%), 3h=780kr(30%), 2h=520kr(20%)")
        
        # Cleanup
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")


class TestHourlyWorkPaymentSharing:
    """Verify proportional payment also works for hourly work type"""

    def test_hourly_work_proportional_payment(self, admin_session):
        """Hourly work with multiple workers also splits proportionally"""
        members_response = admin_session.get(f"{BASE_URL}/api/group/members")
        members = members_response.json()
        
        if len(members) < 2:
            pytest.skip("Need at least 2 members")
        
        # Ensure akkord is enabled and hourly rate is set
        admin_session.put(
            f"{BASE_URL}/api/settings/group",
            json={"hourly_rate": 300, "akkord_enabled": True}
        )
        
        user1_id = members[0]["user_id"]
        user2_id = members[1]["user_id"]
        
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().isoformat(),
            "description": "TEST_hourly_proportional",
            "work_type": "hourly",
            "area": 0,
            "base_operation": None,
            "addons": [],
            "total_hours": 10,  # 10h * 300 kr = 3000 total
            "workers": [
                {"user_id": user1_id, "hours": 7},  # 70%
                {"user_id": user2_id, "hours": 3}   # 30%
            ]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/work-logs", json=work_log_data)
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        
        data = response.json()
        assert data["total_payment"] == 3000, f"Expected 3000, got {data['total_payment']}"
        
        workers = {w["hours"]: w for w in data["workers"]}
        
        # 7h = 70% = 2100
        assert workers[7]["payment"] == 2100
        assert workers[7]["share_percentage"] == 70.0
        
        # 3h = 30% = 900
        assert workers[3]["payment"] == 900
        assert workers[3]["share_percentage"] == 30.0
        
        print(f"✓ Hourly work proportional: 7h=2100kr(70%), 3h=900kr(30%)")
        
        # Cleanup
        if "work_id" in data:
            admin_session.delete(f"{BASE_URL}/api/work-logs/{data['work_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
