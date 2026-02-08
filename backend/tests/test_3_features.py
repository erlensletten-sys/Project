"""
Test suite for 3 new features:
1. Logo image placement (sidebar, login, register, forgot password pages)
2. Akkord price management in Settings (GET/PUT /api/settings/akkord-prices)
3. Work Log 'My Work' tab individual earnings (workers array with individual payment)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from context
ADMIN_EMAIL = "testadmin@test.com"
ADMIN_PASSWORD = "TestPass123!"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "TestPass123!"
TEST_PROJECT_ID = "prj_868390aa0a4a"


@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return session with cookies"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session


@pytest.fixture(scope="module")
def employee_session():
    """Login as employee and return session with cookies"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL,
        "password": EMPLOYEE_PASSWORD
    })
    assert response.status_code == 200, f"Employee login failed: {response.text}"
    return session


class TestFeature1Logo:
    """Feature 1: Logo image at /logo.png - backend serves static files from frontend/public"""
    
    def test_logo_file_accessible(self):
        """Verify /logo.png is accessible (served by frontend)"""
        # The logo is served by the frontend at /logo.png
        # We test that the file exists via the frontend URL
        response = requests.get(f"{BASE_URL}/logo.png", timeout=10)
        # Should return 200 with image content
        assert response.status_code == 200, f"Logo not accessible: {response.status_code}"
        # Check content type is image
        content_type = response.headers.get('content-type', '')
        assert 'image' in content_type.lower() or len(response.content) > 1000, f"Logo content invalid: {content_type}"


class TestFeature2AkkordPrices:
    """Feature 2: Akkord price management in Settings"""
    
    def test_get_akkord_prices(self, admin_session):
        """GET /api/settings/akkord-prices returns base_prices and addon_prices"""
        response = admin_session.get(f"{BASE_URL}/api/settings/akkord-prices")
        assert response.status_code == 200, f"GET akkord-prices failed: {response.text}"
        
        data = response.json()
        assert "base_prices" in data, "Response missing base_prices"
        assert "addon_prices" in data, "Response missing addon_prices"
        assert isinstance(data["base_prices"], dict), "base_prices should be a dict"
        assert isinstance(data["addon_prices"], dict), "addon_prices should be a dict"
    
    def test_get_akkord_pricing_formatted(self, admin_session):
        """GET /api/akkord/pricing returns formatted prices with base_operations and addons arrays"""
        response = admin_session.get(f"{BASE_URL}/api/akkord/pricing")
        assert response.status_code == 200, f"GET akkord/pricing failed: {response.text}"
        
        data = response.json()
        assert "base_operations" in data, "Response missing base_operations"
        assert "addons" in data, "Response missing addons"
        assert isinstance(data["base_operations"], list), "base_operations should be a list"
        assert isinstance(data["addons"], list), "addons should be a list"
        
        # Verify structure of base_operations
        if len(data["base_operations"]) > 0:
            op = data["base_operations"][0]
            assert "id" in op, "base_operation missing id"
            assert "name" in op, "base_operation missing name"
            assert "price" in op, "base_operation missing price"
    
    def test_put_akkord_prices_success(self, admin_session):
        """PUT /api/settings/akkord-prices saves custom prices"""
        # Save new prices
        new_prices = {
            "base_prices": {
                "avtrekk": 21,
                "skuring": 26,
                "glatting": 31,
                "polering": 36,
                "test_operation": 50
            },
            "addon_prices": {
                "sikatop_x1": 4,
                "sikatop_x2": 7,
                "ashford": 13
            }
        }
        
        response = admin_session.put(
            f"{BASE_URL}/api/settings/akkord-prices",
            json=new_prices
        )
        assert response.status_code == 200, f"PUT akkord-prices failed: {response.text}"
        
        # Verify prices were saved by fetching again
        get_response = admin_session.get(f"{BASE_URL}/api/settings/akkord-prices")
        assert get_response.status_code == 200
        
        saved_data = get_response.json()
        assert saved_data["base_prices"].get("test_operation") == 50, "test_operation price not saved"
        assert saved_data["base_prices"].get("avtrekk") == 21, "avtrekk price not updated"
    
    def test_put_akkord_prices_reflected_in_pricing(self, admin_session):
        """After PUT, GET /api/akkord/pricing returns updated prices"""
        response = admin_session.get(f"{BASE_URL}/api/akkord/pricing")
        assert response.status_code == 200
        
        data = response.json()
        # Check if test_operation is in the list
        test_op = next((op for op in data["base_operations"] if op["id"] == "test_operation"), None)
        assert test_op is not None, "test_operation should be in base_operations after save"
        assert test_op["price"] == 50, f"test_operation price should be 50, got {test_op['price']}"
    
    def test_put_akkord_prices_employee_forbidden(self, employee_session):
        """Employee cannot update akkord prices (403)"""
        response = employee_session.put(
            f"{BASE_URL}/api/settings/akkord-prices",
            json={"base_prices": {"test": 100}}
        )
        assert response.status_code == 403, f"Employee should get 403, got {response.status_code}"
    
    def test_cleanup_test_prices(self, admin_session):
        """Cleanup: Remove test_operation and restore original prices"""
        # Restore to known state
        restore_prices = {
            "base_prices": {
                "avtrekk": 20,
                "skuring": 25,
                "glatting": 30,
                "polering": 35
            },
            "addon_prices": {
                "sikatop_x1": 3,
                "sikatop_x2": 6,
                "ashford": 12
            }
        }
        response = admin_session.put(
            f"{BASE_URL}/api/settings/akkord-prices",
            json=restore_prices
        )
        assert response.status_code == 200, "Cleanup failed"


class TestFeature3WorkLogIndividualEarnings:
    """Feature 3: Work Log 'My Work' tab shows individual worker earnings"""
    
    def test_create_work_log_with_workers(self, admin_session):
        """POST /api/work-logs with workers array creates log with individual payments"""
        # First get the admin user ID
        me_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        admin_user_id = me_response.json()["user_id"]
        
        # Create a work log with workers
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": "2026-01-15T10:00:00Z",
            "description": "TEST_individual_earnings_test",
            "work_type": "akkord",
            "area": 100,
            "base_operation": "skuring",
            "addons": ["sikatop_x1"],
            "total_hours": 8,
            "workers": [
                {"user_id": admin_user_id, "hours": 5}
            ]
        }
        
        response = admin_session.post(
            f"{BASE_URL}/api/work-logs",
            json=work_log_data
        )
        # API returns 200 or 201 for successful creation
        assert response.status_code in [200, 201], f"Create work log failed: {response.text}"
        
        data = response.json()
        assert "work_id" in data, "Response missing work_id"
        assert "workers" in data, "Response missing workers array"
        assert len(data["workers"]) > 0, "Workers array should not be empty"
        
        # Verify worker has individual payment calculated
        worker = data["workers"][0]
        assert "payment" in worker, "Worker should have payment field"
        assert "hours" in worker, "Worker should have hours field"
        assert "share_percentage" in worker, "Worker should have share_percentage field"
        assert worker["payment"] > 0, f"Worker payment should be > 0, got {worker['payment']}"
        
        # Store work_id for cleanup
        TestFeature3WorkLogIndividualEarnings.test_work_id = data["work_id"]
    
    def test_my_work_logs_contain_workers_array(self, admin_session):
        """GET /api/work-logs/my returns logs with workers array for individual earnings"""
        response = admin_session.get(f"{BASE_URL}/api/work-logs/my")
        assert response.status_code == 200, f"GET my work logs failed: {response.text}"
        
        logs = response.json()
        assert isinstance(logs, list), "Response should be a list"
        
        # Find our test log
        test_log = next(
            (log for log in logs if log.get("description") == "TEST_individual_earnings_test"),
            None
        )
        
        if test_log:
            assert "workers" in test_log, "Work log should have workers array"
            assert len(test_log["workers"]) > 0, "Workers array should not be empty"
            
            # Check worker structure
            worker = test_log["workers"][0]
            assert "payment" in worker, "Worker should have payment"
            assert "hours" in worker, "Worker should have hours"
    
    def test_work_log_with_custom_base_operation(self, admin_session):
        """POST /api/work-logs with custom base_operation (e.g., 'polering') works"""
        me_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        admin_user_id = me_response.json()["user_id"]
        
        # 'polering' is a custom operation added to the group prices
        work_log_data = {
            "project_id": TEST_PROJECT_ID,
            "date": "2026-01-16T10:00:00Z",
            "description": "TEST_custom_operation_polering",
            "work_type": "akkord",
            "area": 50,
            "base_operation": "polering",
            "addons": [],
            "total_hours": 4,
            "workers": [
                {"user_id": admin_user_id, "hours": 4}
            ]
        }
        
        response = admin_session.post(
            f"{BASE_URL}/api/work-logs",
            json=work_log_data
        )
        # API returns 200 or 201 for successful creation
        assert response.status_code in [200, 201], f"Create work log with polering failed: {response.text}"
        
        data = response.json()
        # Polering should be 35 kr/m² based on group prices
        # Area = 50 m², so total = 50 * 35 = 1750 kr
        assert data["base_operation"] == "polering", "base_operation should be polering"
        assert data["total_payment"] == 50 * 35, f"Total payment should be 1750, got {data['total_payment']}"
        
        TestFeature3WorkLogIndividualEarnings.test_work_id_2 = data["work_id"]
    
    def test_total_payment_vs_individual_payment(self, admin_session):
        """Verify total_payment is the job total, worker.payment is the individual share"""
        response = admin_session.get(f"{BASE_URL}/api/work-logs/my")
        assert response.status_code == 200
        
        logs = response.json()
        test_log = next(
            (log for log in logs if log.get("description") == "TEST_individual_earnings_test"),
            None
        )
        
        if test_log:
            total_payment = test_log.get("total_payment", 0)
            workers = test_log.get("workers", [])
            
            if workers:
                # Sum of individual payments should equal total_payment
                sum_individual = sum(w.get("payment", 0) for w in workers)
                assert abs(sum_individual - total_payment) < 0.01, \
                    f"Sum of worker payments ({sum_individual}) should equal total_payment ({total_payment})"
    
    def test_cleanup_work_logs(self, admin_session):
        """Cleanup: Delete test work logs"""
        work_ids = []
        if hasattr(TestFeature3WorkLogIndividualEarnings, 'test_work_id'):
            work_ids.append(TestFeature3WorkLogIndividualEarnings.test_work_id)
        if hasattr(TestFeature3WorkLogIndividualEarnings, 'test_work_id_2'):
            work_ids.append(TestFeature3WorkLogIndividualEarnings.test_work_id_2)
        
        for work_id in work_ids:
            response = admin_session.delete(f"{BASE_URL}/api/work-logs/{work_id}")
            # Don't assert, just try to clean up
            print(f"Cleanup work_id {work_id}: {response.status_code}")


class TestGroupSettingsIntegration:
    """Test that group settings properly store and return akkord prices"""
    
    def test_group_settings_include_akkord_prices(self, admin_session):
        """GET /api/settings/group returns akkord prices"""
        response = admin_session.get(f"{BASE_URL}/api/settings/group")
        assert response.status_code == 200, f"GET settings/group failed: {response.text}"
        
        data = response.json()
        # akkord_base_prices and akkord_addon_prices should be included
        assert "akkord_base_prices" in data or "akkord_enabled" in data, \
            "Group settings should include akkord configuration"
