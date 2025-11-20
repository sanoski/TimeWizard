#!/usr/bin/env python3
"""
VRS Time Wizard Backend API Test Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
from datetime import datetime, date, timedelta
import sys
import traceback

# Base URL from frontend .env
BASE_URL = "https://timewizard-11.preview.emergentagent.com/api"

class VRSTimeWizardTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if not success:
            self.failed_tests.append(test_name)
        print()
    
    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Root Endpoint", True, f"Response: {data}")
                else:
                    self.log_test("Root Endpoint", False, "Missing message in response")
            else:
                self.log_test("Root Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
    
    def test_week_info_endpoint(self):
        """Test week info endpoint with various dates"""
        test_dates = [
            ("2025-11-16", True, "Nov 16 falls in week ending Nov 22 (pay week)"),
            ("2025-11-22", True, "Nov 22 should be pay week (base)"),
            ("2025-11-23", False, "Nov 23 falls in week ending Nov 29 (not pay week)"),
            ("2025-11-30", True, "Nov 30 falls in week ending Dec 6 (pay week, 14 days after base)"),
            ("2025-12-06", True, "Dec 6 should be pay week (14 days after Nov 22)"),
            ("2025-12-20", True, "Dec 20 should be pay week (28 days after Nov 22)"),
        ]
        
        for work_date, expected_pay_week, description in test_dates:
            try:
                response = self.session.get(f"{BASE_URL}/week-info", params={"work_date": work_date})
                if response.status_code == 200:
                    data = response.json()
                    
                    # Verify required fields
                    required_fields = ["week_ending_date", "is_pay_week", "week_start", "week_end"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        self.log_test(f"Week Info - {work_date}", False, 
                                    f"Missing fields: {missing_fields}")
                        continue
                    
                    # Verify week ending is Saturday
                    week_ending = datetime.strptime(data["week_ending_date"], "%Y-%m-%d").date()
                    if week_ending.weekday() != 5:  # Saturday is 5
                        self.log_test(f"Week Info - {work_date}", False, 
                                    f"Week ending {data['week_ending_date']} is not Saturday")
                        continue
                    
                    # Verify pay week calculation
                    if data["is_pay_week"] != expected_pay_week:
                        self.log_test(f"Week Info - {work_date}", False, 
                                    f"Expected pay_week={expected_pay_week}, got {data['is_pay_week']}. {description}")
                        continue
                    
                    self.log_test(f"Week Info - {work_date}", True, 
                                f"Week ending: {data['week_ending_date']}, Pay week: {data['is_pay_week']}")
                else:
                    self.log_test(f"Week Info - {work_date}", False, 
                                f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test(f"Week Info - {work_date}", False, f"Exception: {str(e)}")
    
    def test_line_codes_endpoints(self):
        """Test line codes CRUD operations"""
        
        # Test GET /lines - should have 10 default lines
        try:
            response = self.session.get(f"{BASE_URL}/lines")
            if response.status_code == 200:
                lines = response.json()
                if len(lines) >= 10:
                    default_lines = ["VTR", "GMRC", "CLP", "WACR", "WACR-CRD", "NEGS", "NHC", "NYOG", "PTO", "HOLIDAY"]
                    found_lines = [line["line_code"] for line in lines]
                    missing_defaults = [line for line in default_lines if line not in found_lines]
                    
                    if missing_defaults:
                        self.log_test("Get Lines - Default Lines", False, 
                                    f"Missing default lines: {missing_defaults}")
                    else:
                        self.log_test("Get Lines - Default Lines", True, 
                                    f"Found {len(lines)} lines including all defaults")
                else:
                    self.log_test("Get Lines - Default Lines", False, 
                                f"Expected at least 10 lines, got {len(lines)}")
            else:
                self.log_test("Get Lines - Default Lines", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Lines - Default Lines", False, f"Exception: {str(e)}")
        
        # Test POST /lines - Add a project line
        project_line_data = {
            "line_code": "PROJECT 1234",
            "label": "PROJECT 1234",
            "is_project": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/lines", json=project_line_data)
            if response.status_code == 200:
                created_line = response.json()
                if (created_line["line_code"] == "PROJECT 1234" and 
                    created_line["is_project"] == True):
                    self.log_test("Create Project Line", True, 
                                f"Created project line: {created_line['line_code']}")
                else:
                    self.log_test("Create Project Line", False, 
                                f"Unexpected response: {created_line}")
            else:
                self.log_test("Create Project Line", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create Project Line", False, f"Exception: {str(e)}")
        
        # Test PUT /lines/{code} - Toggle visibility
        try:
            response = self.session.put(f"{BASE_URL}/lines/VTR", json={"is_visible": False})
            if response.status_code == 200:
                updated_line = response.json()
                if updated_line["is_visible"] == False:
                    self.log_test("Update Line Visibility", True, 
                                f"VTR visibility set to false")
                    
                    # Set it back to visible
                    self.session.put(f"{BASE_URL}/lines/VTR", json={"is_visible": True})
                else:
                    self.log_test("Update Line Visibility", False, 
                                f"Expected is_visible=false, got {updated_line['is_visible']}")
            else:
                self.log_test("Update Line Visibility", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Update Line Visibility", False, f"Exception: {str(e)}")
        
        # Test DELETE /lines/{code} - Delete project line
        try:
            response = self.session.delete(f"{BASE_URL}/lines/PROJECT%201234")
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log_test("Delete Project Line", True, 
                                f"Deleted project line: {result['message']}")
                else:
                    self.log_test("Delete Project Line", False, 
                                f"Unexpected response: {result}")
            else:
                self.log_test("Delete Project Line", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Delete Project Line", False, f"Exception: {str(e)}")
        
        # Test DELETE standard line (should fail)
        try:
            response = self.session.delete(f"{BASE_URL}/lines/VTR")
            if response.status_code == 400:
                self.log_test("Delete Standard Line (Should Fail)", True, 
                            "Correctly prevented deletion of standard line")
            else:
                self.log_test("Delete Standard Line (Should Fail)", False, 
                            f"Expected 400 error, got {response.status_code}")
        except Exception as e:
            self.log_test("Delete Standard Line (Should Fail)", False, f"Exception: {str(e)}")
    
    def test_time_entries_endpoints(self):
        """Test time entries CRUD operations"""
        
        # Test POST /entries - Create entry
        entry_data = {
            "work_date": "2025-11-17",
            "line_code": "VTR",
            "st_hours": 8,
            "ot_hours": 2
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/entries", json=entry_data)
            if response.status_code == 200:
                created_entry = response.json()
                required_fields = ["id", "work_date", "week_ending_date", "line_code", "st_hours", "ot_hours", "is_pay_week"]
                missing_fields = [field for field in required_fields if field not in created_entry]
                
                if missing_fields:
                    self.log_test("Create Time Entry", False, 
                                f"Missing fields: {missing_fields}")
                elif (created_entry["work_date"] == "2025-11-17" and 
                      created_entry["st_hours"] == 8 and 
                      created_entry["ot_hours"] == 2):
                    self.log_test("Create Time Entry", True, 
                                f"Created entry for {created_entry['work_date']}, Week ending: {created_entry['week_ending_date']}")
                else:
                    self.log_test("Create Time Entry", False, 
                                f"Unexpected entry data: {created_entry}")
            else:
                self.log_test("Create Time Entry", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create Time Entry", False, f"Exception: {str(e)}")
        
        # Test POST /entries - Update existing entry (same work_date + line_code)
        updated_entry_data = {
            "work_date": "2025-11-17",
            "line_code": "VTR",
            "st_hours": 7,
            "ot_hours": 3
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/entries", json=updated_entry_data)
            if response.status_code == 200:
                updated_entry = response.json()
                if (updated_entry["st_hours"] == 7 and updated_entry["ot_hours"] == 3):
                    self.log_test("Update Time Entry", True, 
                                f"Updated entry: ST={updated_entry['st_hours']}, OT={updated_entry['ot_hours']}")
                else:
                    self.log_test("Update Time Entry", False, 
                                f"Expected ST=7, OT=3, got ST={updated_entry['st_hours']}, OT={updated_entry['ot_hours']}")
            else:
                self.log_test("Update Time Entry", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Update Time Entry", False, f"Exception: {str(e)}")
        
        # Create multiple entries for different days and lines
        additional_entries = [
            {"work_date": "2025-11-18", "line_code": "GMRC", "st_hours": 8, "ot_hours": 0},
            {"work_date": "2025-11-19", "line_code": "VTR", "st_hours": 6, "ot_hours": 4},
            {"work_date": "2025-11-20", "line_code": "PTO", "st_hours": 8, "ot_hours": 0},
        ]
        
        for entry in additional_entries:
            try:
                response = self.session.post(f"{BASE_URL}/entries", json=entry)
                if response.status_code == 200:
                    self.log_test(f"Create Entry - {entry['work_date']}", True, 
                                f"Created entry for {entry['work_date']} on {entry['line_code']}")
                else:
                    self.log_test(f"Create Entry - {entry['work_date']}", False, 
                                f"Status: {response.status_code}")
            except Exception as e:
                self.log_test(f"Create Entry - {entry['work_date']}", False, f"Exception: {str(e)}")
        
        # Test GET /entries by week
        try:
            response = self.session.get(f"{BASE_URL}/entries", params={"week_ending": "2025-11-22"})
            if response.status_code == 200:
                entries = response.json()
                if len(entries) >= 4:  # Should have at least the 4 entries we created
                    self.log_test("Get Entries by Week", True, 
                                f"Retrieved {len(entries)} entries for week ending 2025-11-22")
                    
                    # Verify entries have correct week_ending_date
                    wrong_week_entries = [e for e in entries if e["week_ending_date"] != "2025-11-22"]
                    if wrong_week_entries:
                        self.log_test("Get Entries - Week Ending Validation", False, 
                                    f"Found {len(wrong_week_entries)} entries with wrong week ending")
                    else:
                        self.log_test("Get Entries - Week Ending Validation", True, 
                                    "All entries have correct week_ending_date")
                else:
                    self.log_test("Get Entries by Week", False, 
                                f"Expected at least 4 entries, got {len(entries)}")
            else:
                self.log_test("Get Entries by Week", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Entries by Week", False, f"Exception: {str(e)}")
    
    def test_weekly_summary_endpoint(self):
        """Test weekly summary endpoint"""
        
        # Test with week that has entries
        try:
            response = self.session.get(f"{BASE_URL}/weekly-summary", params={"week_ending": "2025-11-22"})
            if response.status_code == 200:
                summary = response.json()
                required_fields = ["week_ending_date", "is_pay_week", "total_st", "total_ot", 
                                 "total_hours", "lines_used", "daily_totals", "line_totals"]
                missing_fields = [field for field in required_fields if field not in summary]
                
                if missing_fields:
                    self.log_test("Weekly Summary - With Entries", False, 
                                f"Missing fields: {missing_fields}")
                else:
                    # Verify calculations
                    expected_total = summary["total_st"] + summary["total_ot"]
                    if summary["total_hours"] == expected_total:
                        self.log_test("Weekly Summary - With Entries", True, 
                                    f"ST: {summary['total_st']}, OT: {summary['total_ot']}, Total: {summary['total_hours']}, Lines: {len(summary['lines_used'])}")
                    else:
                        self.log_test("Weekly Summary - With Entries", False, 
                                    f"Total hours calculation error: {summary['total_hours']} != {expected_total}")
            else:
                self.log_test("Weekly Summary - With Entries", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Weekly Summary - With Entries", False, f"Exception: {str(e)}")
        
        # Test with empty week
        try:
            response = self.session.get(f"{BASE_URL}/weekly-summary", params={"week_ending": "2025-12-27"})
            if response.status_code == 200:
                summary = response.json()
                if (summary["total_st"] == 0 and summary["total_ot"] == 0 and 
                    summary["total_hours"] == 0 and len(summary["lines_used"]) == 0):
                    self.log_test("Weekly Summary - Empty Week", True, 
                                "Correctly returned zero totals for empty week")
                else:
                    self.log_test("Weekly Summary - Empty Week", False, 
                                f"Expected zero totals, got: {summary}")
            else:
                self.log_test("Weekly Summary - Empty Week", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Weekly Summary - Empty Week", False, f"Exception: {str(e)}")
    
    def test_settings_endpoints(self):
        """Test settings endpoints"""
        
        # Test GET /settings
        try:
            response = self.session.get(f"{BASE_URL}/settings")
            if response.status_code == 200:
                settings = response.json()
                base_pay_week_setting = next((s for s in settings if s["key"] == "base_pay_week_ending"), None)
                
                if base_pay_week_setting:
                    if base_pay_week_setting["value"] == "2025-11-22":
                        self.log_test("Get Settings", True, 
                                    f"Base pay week ending: {base_pay_week_setting['value']}")
                    else:
                        self.log_test("Get Settings", False, 
                                    f"Expected base_pay_week_ending=2025-11-22, got {base_pay_week_setting['value']}")
                else:
                    self.log_test("Get Settings", False, 
                                "Missing base_pay_week_ending setting")
            else:
                self.log_test("Get Settings", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Settings", False, f"Exception: {str(e)}")
        
        # Test PUT /settings/{key} - Update setting
        try:
            new_setting = {"key": "base_pay_week_ending", "value": "2025-12-06"}
            response = self.session.put(f"{BASE_URL}/settings/base_pay_week_ending", json=new_setting)
            if response.status_code == 200:
                updated_setting = response.json()
                if updated_setting["value"] == "2025-12-06":
                    self.log_test("Update Setting", True, 
                                f"Updated base_pay_week_ending to {updated_setting['value']}")
                    
                    # Verify week-info endpoint updates accordingly
                    week_response = self.session.get(f"{BASE_URL}/week-info", params={"work_date": "2025-12-06"})
                    if week_response.status_code == 200:
                        week_data = week_response.json()
                        if week_data["is_pay_week"]:
                            self.log_test("Setting Update Verification", True, 
                                        "Week-info endpoint correctly reflects updated setting")
                        else:
                            self.log_test("Setting Update Verification", False, 
                                        "Week-info endpoint not reflecting updated setting")
                    
                    # Reset setting back to original
                    reset_setting = {"key": "base_pay_week_ending", "value": "2025-11-22"}
                    self.session.put(f"{BASE_URL}/settings/base_pay_week_ending", json=reset_setting)
                else:
                    self.log_test("Update Setting", False, 
                                f"Expected value=2025-12-06, got {updated_setting['value']}")
            else:
                self.log_test("Update Setting", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Update Setting", False, f"Exception: {str(e)}")
    
    def test_export_import_endpoints(self):
        """Test export/import endpoints"""
        
        # Test GET /export
        try:
            response = self.session.get(f"{BASE_URL}/export")
            if response.status_code == 200:
                export_data = response.json()
                required_sections = ["entries", "line_codes", "settings", "export_date"]
                missing_sections = [section for section in required_sections if section not in export_data]
                
                if missing_sections:
                    self.log_test("Export Data", False, 
                                f"Missing sections: {missing_sections}")
                else:
                    entries_count = len(export_data["entries"])
                    lines_count = len(export_data["line_codes"])
                    settings_count = len(export_data["settings"])
                    
                    self.log_test("Export Data", True, 
                                f"Exported {entries_count} entries, {lines_count} lines, {settings_count} settings")
                    
                    # Store export data for import test
                    self.export_data = export_data
            else:
                self.log_test("Export Data", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Export Data", False, f"Exception: {str(e)}")
        
        # Test POST /import
        if hasattr(self, 'export_data'):
            try:
                # Modify the export data slightly to test import
                import_data = self.export_data.copy()
                
                response = self.session.post(f"{BASE_URL}/import", json=import_data)
                if response.status_code == 200:
                    result = response.json()
                    if "message" in result and "success" in result["message"].lower():
                        self.log_test("Import Data", True, 
                                    f"Import successful: {result['message']}")
                    else:
                        self.log_test("Import Data", True, 
                                    f"Import completed: {result}")
                else:
                    self.log_test("Import Data", False, 
                                f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("Import Data", False, f"Exception: {str(e)}")
        else:
            self.log_test("Import Data", False, "No export data available for import test")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting VRS Time Wizard Backend API Tests")
        print(f"Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Run all test suites
        self.test_root_endpoint()
        self.test_week_info_endpoint()
        self.test_line_codes_endpoints()
        self.test_time_entries_endpoints()
        self.test_weekly_summary_endpoint()
        self.test_settings_endpoints()
        self.test_export_import_endpoints()
        
        # Print summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        print("\n" + "=" * 60)
        return failed_tests == 0

if __name__ == "__main__":
    tester = VRSTimeWizardTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)