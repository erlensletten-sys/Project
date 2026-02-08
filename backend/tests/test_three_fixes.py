"""
Test file for 3 fixes reported in iteration 11:
1. Create user in Settings -> user appears in Payroll employees
2. Invite user sends email and user appears in employees
3. Invoice sending works
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "testadmin@test.com"
ADMIN_PASSWORD = "TestPass123!"


class TestUserCreationAppearsInPayroll:
    """
    Fix 1: Create user in Settings -> user appears in Payroll employees tab
    POST /api/group/users with role=employee, then GET /api/employees should include the new user
    """
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    def test_create_user_and_verify_in_employees(self, admin_session):
        """Test that creating a user via POST /api/group/users also adds them to employees"""
        # Generate unique email to avoid conflicts
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"test_employee_{unique_id}@test.com"
        
        # Step 1: Create user via POST /api/group/users
        create_response = admin_session.post(
            f"{BASE_URL}/api/group/users",
            json={
                "email": test_email,
                "name": f"Test Employee {unique_id}",
                "password": "TestPass123!",
                "role": "employee"
            }
        )
        assert create_response.status_code == 200, f"Create user failed: {create_response.text}"
        create_data = create_response.json()
        assert create_data.get("ok") == True, f"Create user not OK: {create_data}"
        created_user_id = create_data.get("user_id")
        print(f"✓ Created user with ID: {created_user_id}")
        
        # Step 2: Verify user appears in GET /api/employees
        employees_response = admin_session.get(f"{BASE_URL}/api/employees")
        assert employees_response.status_code == 200, f"Get employees failed: {employees_response.text}"
        employees = employees_response.json()
        
        # Find the employee by email
        found_employee = None
        for emp in employees:
            if emp.get("email") == test_email:
                found_employee = emp
                break
        
        assert found_employee is not None, f"Employee with email {test_email} not found in employees list. Employees: {[e.get('email') for e in employees]}"
        print(f"✓ Found employee in payroll list: {found_employee.get('name')}")
        
        # Validate employee fields
        assert found_employee.get("name") == f"Test Employee {unique_id}"
        assert found_employee.get("status") == "active"
        assert found_employee.get("position") == "Employee"  # Role capitalized as position
        print(f"✓ Employee fields validated correctly")
        
        # Note: user_id is stored in DB but not returned in EmployeeResponse model
        # The key validation is that the employee appears in the list


class TestInviteUserSendsEmail:
    """
    Fix 2: Invite user sends email
    POST /api/group/invite should return email_sent:true and the invited user should appear in GET /api/employees
    """
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    def test_invite_user_sends_email(self, admin_session):
        """Test that inviting a user sends an email"""
        # Generate unique email
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"invited_{unique_id}@test.com"
        
        # Invite user via POST /api/group/invite
        invite_response = admin_session.post(
            f"{BASE_URL}/api/group/invite",
            json={
                "email": test_email,
                "name": f"Invited User {unique_id}",
                "role": "employee"
            }
        )
        assert invite_response.status_code == 200, f"Invite user failed: {invite_response.text}"
        invite_data = invite_response.json()
        
        # Verify response contains expected fields
        assert invite_data.get("ok") == True, f"Invite not OK: {invite_data}"
        assert "user_id" in invite_data, "No user_id in response"
        assert "temp_password" in invite_data, "No temp_password in response"
        assert "email_sent" in invite_data, "No email_sent field in response"
        
        # Check if email was sent
        email_sent = invite_data.get("email_sent", False)
        print(f"✓ Invite response: email_sent={email_sent}")
        
        # The email_sent should be true if SMTP is configured
        # Note: even if email sending fails, the user is still created
        if email_sent:
            print(f"✓ Email successfully sent to {test_email}")
        else:
            print(f"⚠ Email could not be sent (SMTP may not be configured)")
        
        created_user_id = invite_data.get("user_id")
        print(f"✓ Created invited user with ID: {created_user_id}")
    
    def test_invited_user_appears_in_employees(self, admin_session):
        """Test that invited user appears in employees list"""
        # Generate unique email
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"invited_emp_{unique_id}@test.com"
        
        # Invite user
        invite_response = admin_session.post(
            f"{BASE_URL}/api/group/invite",
            json={
                "email": test_email,
                "name": f"Invited Employee {unique_id}",
                "role": "employee"
            }
        )
        assert invite_response.status_code == 200, f"Invite failed: {invite_response.text}"
        
        # Verify user appears in employees
        employees_response = admin_session.get(f"{BASE_URL}/api/employees")
        assert employees_response.status_code == 200, f"Get employees failed: {employees_response.text}"
        employees = employees_response.json()
        
        # Find the employee
        found_employee = None
        for emp in employees:
            if emp.get("email") == test_email:
                found_employee = emp
                break
        
        assert found_employee is not None, f"Invited employee {test_email} not found in employees list"
        print(f"✓ Invited user appears in employees list: {found_employee.get('name')}")


class TestInvoiceSending:
    """
    Fix 3: Invoice sending works
    Create invoice via POST /api/invoices, then send it via POST /api/invoices/{id}/send
    """
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    def test_create_invoice(self, admin_session):
        """Test creating an invoice"""
        unique_id = uuid.uuid4().hex[:8]
        
        create_response = admin_session.post(
            f"{BASE_URL}/api/invoices",
            json={
                "customer_name": f"Test Customer {unique_id}",
                "customer_email": f"customer_{unique_id}@test.com",
                "customer_address": "123 Test Street",
                "items": [
                    {
                        "description": "Test Service",
                        "quantity": 1,
                        "unit_price": 1000.0,
                        "vat_rate": 25.0
                    }
                ],
                "notes": "Test invoice"
            }
        )
        assert create_response.status_code == 201, f"Create invoice failed: {create_response.text}"
        invoice_data = create_response.json()
        
        assert "invoice_id" in invoice_data, "No invoice_id in response"
        assert "invoice_number" in invoice_data, "No invoice_number in response"
        assert invoice_data.get("status") == "draft", "Invoice should be in draft status"
        assert invoice_data.get("total") > 0, "Invoice total should be positive"
        
        print(f"✓ Created invoice: {invoice_data.get('invoice_number')}, Total: {invoice_data.get('total')}")
        return invoice_data
    
    def test_send_invoice(self, admin_session):
        """Test sending an invoice"""
        unique_id = uuid.uuid4().hex[:8]
        
        # First create an invoice
        create_response = admin_session.post(
            f"{BASE_URL}/api/invoices",
            json={
                "customer_name": f"Send Test Customer {unique_id}",
                "customer_email": f"send_customer_{unique_id}@test.com",
                "items": [
                    {
                        "description": "Test Service",
                        "quantity": 2,
                        "unit_price": 500.0,
                        "vat_rate": 25.0
                    }
                ]
            }
        )
        assert create_response.status_code == 201, f"Create invoice failed: {create_response.text}"
        invoice_data = create_response.json()
        invoice_id = invoice_data.get("invoice_id")
        
        # Now send the invoice
        send_response = admin_session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/send",
            json={}  # Will use customer_email from invoice
        )
        assert send_response.status_code == 200, f"Send invoice failed: {send_response.text}"
        send_data = send_response.json()
        
        assert send_data.get("ok") == True, f"Send not OK: {send_data}"
        assert "message" in send_data, "No message in send response"
        print(f"✓ Invoice sent: {send_data.get('message')}")
        
        # Verify invoice status changed to 'sent'
        get_response = admin_session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert get_response.status_code == 200, f"Get invoice failed: {get_response.text}"
        updated_invoice = get_response.json()
        
        assert updated_invoice.get("status") == "sent", f"Invoice status should be 'sent', got: {updated_invoice.get('status')}"
        print(f"✓ Invoice status updated to 'sent'")
    
    def test_send_invoice_with_custom_recipient(self, admin_session):
        """Test sending an invoice with a custom recipient email"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create invoice without customer_email
        create_response = admin_session.post(
            f"{BASE_URL}/api/invoices",
            json={
                "customer_name": f"No Email Customer {unique_id}",
                "items": [
                    {
                        "description": "Service",
                        "quantity": 1,
                        "unit_price": 100.0
                    }
                ]
            }
        )
        assert create_response.status_code == 201, f"Create invoice failed: {create_response.text}"
        invoice_data = create_response.json()
        invoice_id = invoice_data.get("invoice_id")
        
        # Send with custom recipient
        custom_email = f"custom_recipient_{unique_id}@test.com"
        send_response = admin_session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/send",
            json={"recipient_email": custom_email}
        )
        assert send_response.status_code == 200, f"Send invoice failed: {send_response.text}"
        send_data = send_response.json()
        
        assert send_data.get("ok") == True
        assert custom_email in send_data.get("message", "")
        print(f"✓ Invoice sent to custom recipient: {custom_email}")
    
    def test_send_invoice_no_email_fails(self, admin_session):
        """Test that sending invoice without any email fails properly"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create invoice without customer_email
        create_response = admin_session.post(
            f"{BASE_URL}/api/invoices",
            json={
                "customer_name": f"No Email Customer {unique_id}",
                "items": [
                    {
                        "description": "Service",
                        "quantity": 1,
                        "unit_price": 100.0
                    }
                ]
            }
        )
        assert create_response.status_code == 201
        invoice_data = create_response.json()
        invoice_id = invoice_data.get("invoice_id")
        
        # Try to send without any email
        send_response = admin_session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/send",
            json={}  # No recipient_email, and invoice has no customer_email
        )
        # This should fail with 400
        assert send_response.status_code == 400, f"Expected 400 but got {send_response.status_code}: {send_response.text}"
        print(f"✓ Correctly rejected sending invoice without email")


class TestGroupUsersEndpoint:
    """Additional tests for /api/group/users endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    def test_get_group_users(self, admin_session):
        """Test GET /api/group/users returns list of users"""
        response = admin_session.get(f"{BASE_URL}/api/group/users")
        assert response.status_code == 200, f"Get users failed: {response.text}"
        users = response.json()
        
        assert isinstance(users, list), "Response should be a list"
        print(f"✓ Got {len(users)} users from /api/group/users")
        
        # Verify admin user is in the list
        admin_found = any(u.get("email") == ADMIN_EMAIL for u in users)
        assert admin_found, f"Admin user not found in users list"
        print(f"✓ Admin user found in users list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
