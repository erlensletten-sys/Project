import requests
import sys
import json
from datetime import datetime
import uuid

class NordicForgeAPITester:
    def __init__(self, base_url="https://moltbot-config-205.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        self.session = requests.Session()  # Maintain session across all requests
        self.user_token = None
        self.user_id = None
        self.group_id = None
        self.test_user_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        self.test_password = "TestPass123!"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_session=True):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            # Use persistent session for cookie management
            session = self.session if use_session else requests
            
            if method == 'GET':
                response = session.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = session.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = session.put(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = session.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = session.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {str(response_data)[:200]}...")
                    return True, response_data, response
                except:
                    print(f"   Response: {response.text[:200]}")
                    return True, response.text, response
            else:
                self.tests_failed += 1
                self.failed_tests.append(name)
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, None, response

        except requests.exceptions.Timeout:
            self.tests_failed += 1
            self.failed_tests.append(name)
            print(f"❌ Failed - Request timeout")
            return False, None, None
        except requests.exceptions.ConnectionError as e:
            self.tests_failed += 1
            self.failed_tests.append(name)
            print(f"❌ Failed - Connection error: {str(e)}")
            return False, None, None
        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append(name)
            print(f"❌ Failed - Error: {str(e)}")
            return False, None, None

    def test_health_check(self):
        """Test health check endpoint"""
        print("\n--- Testing Health Check ---")
        success, data, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        if success and isinstance(data, dict):
            if data.get('status') == 'healthy' and data.get('app') == 'NordicForge':
                print("   ✓ Health check returned correct app info")
            else:
                print("   ⚠ Health check response missing expected fields")
        return success

    def test_register_user(self):
        """Test user registration with organization creation"""
        print("\n--- Testing User Registration ---")
        
        register_data = {
            "email": self.test_user_email,
            "password": self.test_password,
            "name": "Test User",
            "group_name": "Test Organization AS"
        }
        
        success, data, response = self.run_test(
            "Register User with Organization",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if success and isinstance(data, dict):
            user_info = data.get('user', {})
            self.user_id = user_info.get('user_id')
            self.group_id = user_info.get('group_id')
            
            if user_info.get('role') == 'owner' and user_info.get('email') == self.test_user_email:
                print("   ✓ User registered as organization owner")
                print(f"   User ID: {self.user_id}")
                print(f"   Group ID: {self.group_id}")
                
                # Check if session cookie was set
                if response and 'Set-Cookie' in response.headers:
                    print("   ✓ Session cookie set during registration")
                
                return True
            else:
                print("   ⚠ User registration response missing expected fields")
        
        return success

    def test_login_user(self):
        """Test user login"""
        print("\n--- Testing User Login ---")
        
        login_data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, data, response = self.run_test(
            "Login User",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and isinstance(data, dict):
            user_info = data.get('user', {})
            if user_info.get('user_id') == self.user_id and user_info.get('email') == self.test_user_email:
                print("   ✓ Login successful with correct user data")
                
                # Check if session cookie was set
                if response and 'Set-Cookie' in response.headers:
                    print("   ✓ Session cookie set during login")
                
                return True
            else:
                print("   ⚠ Login response missing expected user data")
        
        return success

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        print("\n--- Testing Invalid Login ---")
        
        login_data = {
            "email": self.test_user_email,
            "password": "wrong_password"
        }
        
        success, data, response = self.run_test(
            "Login with Invalid Password",
            "POST",
            "auth/login",
            401,
            data=login_data
        )
        
        return success

    def test_get_current_user(self):
        """Test getting current authenticated user"""
        print("\n--- Testing Get Current User ---")
        
        success, data, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and isinstance(data, dict):
            if data.get('user_id') == self.user_id and data.get('email') == self.test_user_email:
                print("   ✓ Current user data correct")
                return True
            else:
                print("   ⚠ Current user data mismatch")
        
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n--- Testing Dashboard Stats ---")
        
        success, data, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success and isinstance(data, dict):
            expected_sections = ['invoices', 'payroll', 'expenses', 'projects', 'checklists', 'hse']
            missing_sections = [section for section in expected_sections if section not in data]
            
            if not missing_sections:
                print("   ✓ All dashboard stat sections present")
                return True
            else:
                print(f"   ⚠ Missing sections: {missing_sections}")
        
        return success

    def test_create_invoice(self):
        """Test creating an invoice"""
        print("\n--- Testing Invoice Creation ---")
        
        invoice_data = {
            "customer_name": "Test Customer AS",
            "customer_email": "customer@example.com",
            "customer_address": "Test Address 123, Oslo",
            "items": [
                {
                    "description": "Consulting Services",
                    "quantity": 10,
                    "unit_price": 1500,
                    "vat_rate": 25.0
                }
            ],
            "notes": "Test invoice for API testing"
        }
        
        success, data, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            201,
            data=invoice_data
        )
        
        if success and isinstance(data, dict):
            if data.get('invoice_number') and data.get('total') == 18750.0:  # 15000 + 25% VAT
                print("   ✓ Invoice created with correct calculations")
                return True, data.get('invoice_id')
            else:
                print("   ⚠ Invoice creation response incorrect")
        
        return success, None

    def test_list_invoices(self):
        """Test listing invoices"""
        print("\n--- Testing Invoice Listing ---")
        
        success, data, response = self.run_test(
            "List Invoices",
            "GET",
            "invoices",
            200
        )
        
        if success and isinstance(data, list):
            print(f"   ✓ Retrieved {len(data)} invoices")
            return True
        
        return success

    def test_create_employee(self):
        """Test creating an employee"""
        print("\n--- Testing Employee Creation ---")
        
        employee_data = {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "position": "Senior Developer",
            "department": "Engineering",
            "salary": 75000
        }
        
        success, data, response = self.run_test(
            "Create Employee",
            "POST",
            "employees",
            201,
            data=employee_data
        )
        
        if success and isinstance(data, dict):
            if data.get('name') == employee_data['name'] and data.get('status') == 'active':
                print("   ✓ Employee created successfully")
                return True, data.get('employee_id')
            else:
                print("   ⚠ Employee creation response incorrect")
        
        return success, None

    def test_create_expense(self):
        """Test creating an expense"""
        print("\n--- Testing Expense Creation ---")
        
        expense_data = {
            "description": "Office Supplies",
            "amount": 2500.50,
            "category": "Office"
        }
        
        success, data, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            201,
            data=expense_data
        )
        
        if success and isinstance(data, dict):
            if data.get('description') == expense_data['description'] and data.get('status') == 'pending':
                print("   ✓ Expense created successfully")
                return True, data.get('expense_id')
            else:
                print("   ⚠ Expense creation response incorrect")
        
        return success, None

    def test_create_project(self):
        """Test creating a project"""
        print("\n--- Testing Project Creation ---")
        
        project_data = {
            "name": "Website Redesign",
            "description": "Complete redesign of company website",
            "client_name": "ABC Corp",
            "budget": 150000
        }
        
        success, data, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            201,
            data=project_data
        )
        
        if success and isinstance(data, dict):
            if data.get('name') == project_data['name'] and data.get('status') == 'planning':
                print("   ✓ Project created successfully")
                return True, data.get('project_id')
            else:
                print("   ⚠ Project creation response incorrect")
        
        return success, None

    def test_create_checklist(self):
        """Test creating a checklist"""
        print("\n--- Testing Checklist Creation ---")
        
        checklist_data = {
            "title": "Safety Inspection Checklist",
            "description": "Daily safety inspection procedures",
            "category": "safety",
            "items": [
                {"text": "Check fire extinguishers", "required": True},
                {"text": "Inspect safety equipment", "required": True},
                {"text": "Verify emergency exits", "required": False}
            ]
        }
        
        success, data, response = self.run_test(
            "Create Checklist",
            "POST",
            "checklists",
            201,
            data=checklist_data
        )
        
        if success and isinstance(data, dict):
            if data.get('title') == checklist_data['title'] and data.get('total_items') == 3:
                print("   ✓ Checklist created successfully")
                return True, data.get('checklist_id')
            else:
                print("   ⚠ Checklist creation response incorrect")
        
        return success, None

    def test_create_hse_document(self):
        """Test creating an HSE document"""
        print("\n--- Testing HSE Document Creation ---")
        
        hse_data = {
            "title": "Safety Policy 2024",
            "document_type": "policy",
            "content": "This is the company safety policy for 2024..."
        }
        
        success, data, response = self.run_test(
            "Create HSE Document",
            "POST",
            "hse-documents",
            201,
            data=hse_data
        )
        
        if success and isinstance(data, dict):
            if data.get('title') == hse_data['title'] and data.get('status') == 'active':
                print("   ✓ HSE document created successfully")
                return True, data.get('document_id')
            else:
                print("   ⚠ HSE document creation response incorrect")
        
        return success, None
    
    def test_payroll_runs(self):
        """Test payroll run creation and status updates"""
        print("\n--- Testing Payroll Run Management ---")
        
        # First, ensure we have employees
        employee_data = {
            "name": "Jane Smith",
            "email": "jane.smith@example.com",
            "position": "Software Engineer",
            "department": "Engineering", 
            "salary": 65000
        }
        
        emp_success, emp_data, emp_response = self.run_test(
            "Create Employee for Payroll",
            "POST", 
            "employees",
            201,
            data=employee_data
        )
        
        if not emp_success:
            return False
            
        # Test payroll run creation
        from datetime import datetime
        current_date = datetime.now()
        
        run_data = {
            "month": current_date.month,
            "year": current_date.year,
            "notes": "Test payroll run for API testing"
        }
        
        success, data, response = self.run_test(
            "Create Payroll Run",
            "POST",
            "payroll/runs", 
            201,
            data=run_data
        )
        
        run_id = None
        if success and isinstance(data, dict):
            run_id = data.get('run_id')
            if (run_id and data.get('status') == 'draft' and 
                data.get('month') == run_data['month'] and
                len(data.get('employees', [])) > 0):
                print("   ✓ Payroll run created with employees")
            else:
                print("   ⚠ Payroll run creation response incorrect")
                return False
        else:
            return False
            
        # Test payroll run listing
        list_success, list_data, list_response = self.run_test(
            "List Payroll Runs",
            "GET",
            "payroll/runs",
            200
        )
        
        if list_success and isinstance(list_data, list) and len(list_data) > 0:
            print("   ✓ Payroll runs listed successfully")
        else:
            print("   ⚠ Failed to list payroll runs")
            return False
            
        # Test status updates - process the run
        process_success, process_data, process_response = self.run_test(
            "Process Payroll Run",
            "PATCH",
            f"payroll/runs/{run_id}/status?status=processed",
            200
        )
        
        if process_success and isinstance(process_data, dict) and process_data.get('status') == 'processed':
            print("   ✓ Payroll run processed successfully")
        else:
            print("   ⚠ Failed to process payroll run")
            return False
            
        # Test marking as paid
        paid_success, paid_data, paid_response = self.run_test(
            "Mark Payroll Run as Paid",
            "PATCH", 
            f"payroll/runs/{run_id}/status?status=paid",
            200
        )
        
        if paid_success and isinstance(paid_data, dict) and paid_data.get('status') == 'paid':
            print("   ✓ Payroll run marked as paid successfully")
            return True
        else:
            print("   ⚠ Failed to mark payroll run as paid")
            return False
            
    def test_file_upload(self):
        """Test file upload functionality"""
        print("\n--- Testing File Upload ---")
        
        # Create a simple test file content (use PDF which is allowed)
        test_file_content = b"Test receipt content for API testing"
        
        # Test file upload endpoint with allowed file type
        files = {'file': ('test_receipt.pdf', test_file_content, 'application/pdf')}
        headers = {}  # Don't set Content-Type for multipart uploads
        
        try:
            url = f"{self.base_url}/upload"
            print(f"   URL: {url}")
            
            response = self.session.post(url, files=files, timeout=10)
            
            success = response.status_code == 200
            self.tests_run += 1
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - File Upload - Status: {response.status_code}")
                
                try:
                    response_data = response.json()
                    if (response_data.get('file_id') and 
                        response_data.get('file_url') and
                        response_data.get('filename') == 'test_receipt.pdf'):
                        print("   ✓ File upload returned correct response data")
                        print(f"   File URL: {response_data.get('file_url')}")
                        return True, response_data
                    else:
                        print("   ⚠ File upload response missing expected fields")
                        return False, None
                        
                except Exception as e:
                    print(f"   ⚠ Failed to parse upload response: {e}")
                    return False, None
            else:
                self.tests_failed += 1
                self.failed_tests.append("File Upload")
                print(f"❌ Failed - File Upload - Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, None
                
        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append("File Upload")
            print(f"❌ Failed - File Upload - Error: {str(e)}")
            return False, None
            
    def test_send_invoice_email(self, invoice_id):
        """Test sending invoice email"""
        print("\n--- Testing Invoice Email Sending ---")
        
        if not invoice_id:
            print("   ⚠ No invoice ID provided, skipping email test")
            return False
            
        email_data = {
            "recipient_email": "test@example.com"
        }
        
        success, data, response = self.run_test(
            "Send Invoice Email",
            "POST",
            f"invoices/{invoice_id}/send",
            200,
            data=email_data
        )
        
        if success and isinstance(data, dict):
            if data.get('ok') and 'queued for delivery' in data.get('message', ''):
                print("   ✓ Invoice email queued successfully")
                return True
            else:
                print("   ⚠ Email send response unexpected")
        
        return success

    def test_group_management(self):
        """Test group management endpoints"""
        print("\n--- Testing Group Management ---")
        
        # Test get my group
        success1, data, response = self.run_test(
            "Get My Group",
            "GET",
            "group",
            200
        )
        
        group_valid = False
        if success1 and isinstance(data, dict):
            if data.get('group_id') == self.group_id and data.get('name'):
                print("   ✓ Group data retrieved correctly")
                group_valid = True
            else:
                print("   ⚠ Group data incorrect")
        
        # Test get group members
        success2, data, response = self.run_test(
            "Get Group Members",
            "GET",
            "group/members",
            200
        )
        
        members_valid = False
        if success2 and isinstance(data, list):
            if len(data) > 0 and data[0].get('user_id') == self.user_id:
                print("   ✓ Group members retrieved correctly")
                members_valid = True
            else:
                print("   ⚠ Group members data incorrect")
        
        return success1 and success2 and group_valid and members_valid

    def test_logout(self):
        """Test logout functionality"""
        print("\n--- Testing Logout ---")
        
        success, data, response = self.run_test(
            "Logout User",
            "POST",
            "auth/logout",
            200
        )
        
        if success and isinstance(data, dict):
            if data.get('ok') and data.get('message'):
                print("   ✓ Logout successful")
                
                # Check if cookie was cleared
                if response and 'Set-Cookie' in response.headers:
                    cookie_header = response.headers['Set-Cookie']
                    if 'session_token=' in cookie_header and 'Max-Age=0' in cookie_header:
                        print("   ✓ Session cookie cleared")
                    else:
                        print("   ⚠ Session cookie may not be properly cleared")
                
                return True
        
        return success

    def test_form_builder_features(self):
        """Test comprehensive form builder functionality"""
        print("\n--- Testing Form Builder Features ---")
        
        # Test 1: Create form template (admin only)
        form_template_data = {
            "title": "Safety Inspection Form",
            "description": "Daily safety inspection checklist with multiple field types",
            "category": "safety",
            "fields": [
                {
                    "field_type": "text",
                    "label": "Inspector Name",
                    "required": True,
                    "placeholder": "Enter inspector name"
                },
                {
                    "field_type": "textarea",
                    "label": "General Comments",
                    "required": False,
                    "placeholder": "Any additional comments"
                },
                {
                    "field_type": "number",
                    "label": "Temperature Reading",
                    "required": True,
                    "placeholder": "Temperature in Celsius"
                },
                {
                    "field_type": "checkbox",
                    "label": "Emergency exits clear",
                    "required": True
                },
                {
                    "field_type": "select",
                    "label": "Safety Level",
                    "required": True,
                    "options": ["Excellent", "Good", "Needs Improvement", "Poor"]
                },
                {
                    "field_type": "date",
                    "label": "Inspection Date",
                    "required": True
                }
            ]
        }
        
        success1, form_data, response = self.run_test(
            "Create Form Template",
            "POST",
            "forms",
            201,
            data=form_template_data
        )
        
        form_id = None
        if success1 and isinstance(form_data, dict):
            form_id = form_data.get('form_id')
            if (form_id and form_data.get('title') == form_template_data['title'] and
                len(form_data.get('fields', [])) == 6):
                print("   ✓ Form template created with all field types")
            else:
                print("   ⚠ Form template creation response incorrect")
                return False
        else:
            return False
            
        # Test 2: List form templates
        success2, forms_data, response = self.run_test(
            "List Form Templates",
            "GET",
            "forms",
            200
        )
        
        if success2 and isinstance(forms_data, list) and len(forms_data) > 0:
            found_form = next((f for f in forms_data if f.get('form_id') == form_id), None)
            if found_form:
                print("   ✓ Form template listed successfully")
            else:
                print("   ⚠ Created form not found in list")
                return False
        else:
            print("   ⚠ Failed to list form templates")
            return False
            
        # Test 3: Get specific form template
        success3, single_form, response = self.run_test(
            "Get Form Template",
            "GET",
            f"forms/{form_id}",
            200
        )
        
        if success3 and isinstance(single_form, dict):
            if single_form.get('form_id') == form_id:
                print("   ✓ Form template retrieved successfully")
            else:
                print("   ⚠ Form template retrieval incorrect")
                return False
        else:
            return False
            
        # Test 4: Submit form response (requires project for linking)
        project_id = self.get_or_create_project_for_testing()
        
        form_submission_data = {
            "form_id": form_id,
            "project_id": project_id,
            "responses": {
                # Get field IDs from the created form
                single_form['fields'][0]['field_id']: "John Safety Inspector",
                single_form['fields'][1]['field_id']: "All safety equipment in good condition",
                single_form['fields'][2]['field_id']: "22.5",
                single_form['fields'][3]['field_id']: True,
                single_form['fields'][4]['field_id']: "Good",
                single_form['fields'][5]['field_id']: "2024-12-26"
            }
        }
        
        success4, submission_data, response = self.run_test(
            "Submit Form Response",
            "POST",
            f"forms/{form_id}/submissions",
            201,
            data=form_submission_data
        )
        
        submission_id = None
        if success4 and isinstance(submission_data, dict):
            submission_id = submission_data.get('submission_id')
            if (submission_id and submission_data.get('form_title') == form_template_data['title']):
                print("   ✓ Form submission created successfully")
            else:
                print("   ⚠ Form submission response incorrect")
                return False
        else:
            return False
            
        # Test 5: List all submissions
        success5, all_submissions, response = self.run_test(
            "List All Submissions",
            "GET",
            "submissions",
            200
        )
        
        if success5 and isinstance(all_submissions, list) and len(all_submissions) > 0:
            found_submission = next((s for s in all_submissions if s.get('submission_id') == submission_id), None)
            if found_submission:
                print("   ✓ Form submission listed in all submissions")
            else:
                print("   ⚠ Form submission not found in all submissions")
                return False
        else:
            print("   ⚠ Failed to list all submissions")
            return False
            
        # Test 6: Get specific submission
        success6, single_submission, response = self.run_test(
            "Get Form Submission",
            "GET",
            f"submissions/{submission_id}",
            200
        )
        
        if success6 and isinstance(single_submission, dict):
            if single_submission.get('submission_id') == submission_id:
                print("   ✓ Form submission retrieved successfully")
            else:
                print("   ⚠ Form submission retrieval incorrect")
                return False
        else:
            return False
            
        # Test 7: List submissions for specific form
        success7, form_submissions, response = self.run_test(
            "List Form Submissions",
            "GET",
            f"forms/{form_id}/submissions",
            200
        )
        
        if success7 and isinstance(form_submissions, list) and len(form_submissions) > 0:
            if form_submissions[0].get('submission_id') == submission_id:
                print("   ✓ Form submissions for specific form retrieved")
            else:
                print("   ⚠ Form submissions for specific form incorrect")
                return False
        else:
            print("   ⚠ Failed to list submissions for specific form")
            return False
            
        # Test 8: Generate PDF for submission
        success8, pdf_response, response = self.run_test(
            "Generate Submission PDF",
            "GET",
            f"submissions/{submission_id}/pdf",
            200
        )
        
        if success8 and response:
            content_type = response.headers.get('content-type', '')
            if 'application/pdf' in content_type:
                print("   ✓ PDF generated successfully")
            else:
                print(f"   ⚠ PDF generation returned wrong content type: {content_type}")
                return False
        else:
            print("   ⚠ Failed to generate PDF")
            return False
            
        # Test 9: Delete form template (admin only)
        success9, delete_data, response = self.run_test(
            "Delete Form Template",
            "DELETE",
            f"forms/{form_id}",
            200
        )
        
        if success9 and isinstance(delete_data, dict):
            if delete_data.get('ok'):
                print("   ✓ Form template deleted successfully")
            else:
                print("   ⚠ Form template deletion response incorrect")
                return False
        else:
            return False
            
        # Test 10: Verify form template is deleted
        success10, deleted_form, response = self.run_test(
            "Verify Form Template Deleted",
            "GET",
            f"forms/{form_id}",
            404
        )
        
        if success10:
            print("   ✓ Form template properly deleted and inaccessible")
            return True
        else:
            print("   ⚠ Deleted form template still accessible")
            return False
            
    def get_or_create_project_for_testing(self):
        """Helper method to get or create a project for form testing"""
        # Try to get existing projects first
        success, projects, response = self.run_test(
            "Get Projects for Form Testing",
            "GET", 
            "projects",
            200
        )
        
        if success and isinstance(projects, list) and len(projects) > 0:
            return projects[0]['project_id']
        
        # If no projects exist, create one
        project_data = {
            "name": "Form Testing Project",
            "description": "Project created for form builder testing",
            "client_name": "Test Client"
        }
        
        success, project, response = self.run_test(
            "Create Project for Form Testing",
            "POST",
            "projects", 
            201,
            data=project_data
        )
        
        if success and isinstance(project, dict):
            return project.get('project_id')
        
        return None

    def test_unauthenticated_access(self):
        """Test that protected endpoints require authentication"""
        print("\n--- Testing Unauthenticated Access Protection ---")
        
        # Test endpoints that should require authentication
        protected_endpoints = [
            ("auth/me", "GET"),
            ("dashboard/stats", "GET"),
            ("invoices", "GET"),
            ("employees", "GET"),
            ("expenses", "GET"),
            ("projects", "GET"),
            ("checklists", "GET"),
            ("hse-documents", "GET"),
            ("forms", "GET"),
            ("submissions", "GET"),
            ("group", "GET")
        ]
        
        all_protected = True
        for endpoint, method in protected_endpoints:
            success, data, response = self.run_test(
                f"Protected Endpoint: {method} {endpoint}",
                method,
                endpoint,
                401,
                use_session=False  # Don't use authenticated session for this test
            )
            if not success:
                all_protected = False
        
        return all_protected

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 NORDICFORGE API TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"✅ Passed: {self.tests_passed}")
        print(f"❌ Failed: {self.tests_failed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        print("="*60)

def main():
    print("="*60)
    print("🏗️ NORDICFORGE BUSINESS MANAGEMENT API TESTING")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = NordicForgeAPITester()
    
    # Run comprehensive tests
    print("\n--- Infrastructure Tests ---")
    tester.test_health_check()
    
    print("\n--- Authentication Flow Tests ---")
    tester.test_register_user()
    tester.test_login_user()
    tester.test_login_invalid_credentials()
    tester.test_get_current_user()
    
    print("\n--- Core Business Features ---")
    tester.test_dashboard_stats()
    
    # Test all major features
    success, invoice_id = tester.test_create_invoice()
    tester.test_list_invoices()
    
    success, employee_id = tester.test_create_employee()
    success, expense_id = tester.test_create_expense()
    success, project_id = tester.test_create_project()
    success, checklist_id = tester.test_create_checklist()
    success, hse_id = tester.test_create_hse_document()
    
    print("\n--- NEW FEATURES TESTING ---")
    
    # Test NEW FEATURE 1: Payroll runs
    print("\n🆕 Testing Payroll Run Management...")
    tester.test_payroll_runs()
    
    # Test NEW FEATURE 2 & 3: File upload functionality
    print("\n🆕 Testing File Upload...")
    tester.test_file_upload()
    
    # Test NEW FEATURE 4: Invoice email sending
    print("\n🆕 Testing Invoice Email Sending...")
    if invoice_id:
        tester.test_send_invoice_email(invoice_id)
    else:
        print("   ⚠ Skipping email test - no invoice available")
    
    # Test NEW FEATURE 5: Form Builder System
    print("\n🆕 Testing Form Builder System...")
    tester.test_form_builder_features()
    
    print("\n--- Group Management ---")
    tester.test_group_management()
    
    print("\n--- Security Tests ---")
    tester.test_unauthenticated_access()
    
    print("\n--- Session Management ---")
    tester.test_logout()
    
    # Print summary
    tester.print_summary()
    
    # Return exit code
    return 0 if tester.tests_failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())