#!/bin/bash

# Test script for Custom Elements functionality
# This script tests the main endpoints we've created

echo "=== Testing Custom Elements Feature ==="
echo

# Set base URL (adjust if needed)
BASE_URL="http://localhost:8000/api/v1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make HTTP requests and check responses
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    local expected_status=$5
    
    echo -e "${YELLOW}Testing: $method $endpoint${NC}"
    
    if [ ! -z "$data" ]; then
        if [ ! -z "$auth_header" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method \
                -H "Content-Type: application/json" \
                -H "$auth_header" \
                -d "$data" \
                "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$BASE_URL$endpoint")
        fi
    else
        if [ ! -z "$auth_header" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method \
                -H "$auth_header" \
                "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method \
                "$BASE_URL$endpoint")
        fi
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ Status: $http_code (Expected: $expected_status)${NC}"
        if [ ! -z "$body" ] && [ "$body" != "null" ]; then
            echo "Response: $body"
        fi
    else
        echo -e "${RED}✗ Status: $http_code (Expected: $expected_status)${NC}"
        echo "Response: $body"
    fi
    echo
}

echo "Note: This test requires a running backend server with authentication."
echo "Make sure the backend is running on $BASE_URL"
echo

# Test API structure (these should return 401 without auth)
echo "=== Testing API Structure (without auth - should return 401) ==="
test_endpoint "GET" "/user-elements" "" "" 401
test_endpoint "POST" "/user-elements" '{"name":"test","element_data":{"type":"circle"}}' "" 401

echo "=== Testing with Mock Authentication ==="
echo "Note: Add proper authentication token for real testing"

# Mock auth header (replace with real token)
AUTH_HEADER="Authorization: Bearer mock-token"

# Test getting user elements (will fail without real auth, but shows endpoint exists)
test_endpoint "GET" "/user-elements" "" "$AUTH_HEADER" 401

echo "=== Manual Testing Instructions ==="
echo
echo "To properly test this feature:"
echo "1. Start the backend server: cd backend && python -m uvicorn app.main:app --reload"
echo "2. Create a user account and login to get a valid JWT token"
echo "3. Use the token in the Authorization header for API calls"
echo "4. Test the frontend by opening the Layout Designer and:"
echo "   - Select multiple elements"
echo "   - Click the save button (💾) in the My Elements section"
echo "   - Fill in the form and save"
echo "   - Check that the element appears in the custom elements list"
echo "   - Try clicking on it to add to layout"
echo "   - Test deleting custom elements"
echo
echo "Frontend files modified:"
echo "- LayoutDesigner.js (main component)"
echo "- userElementsAPI.js (API utility)"
echo
echo "Backend files created:"
echo "- models/models.py (UserElement model added)"
echo "- schemas/user_element.py (Pydantic schemas)"
echo "- api/v1/user_elements.py (API endpoints)"
echo "- api/v1/api.py (router registration)"
echo
echo "=== Feature Summary ==="
echo "✓ Database model for storing custom elements"
echo "✓ Backend API endpoints (CRUD operations)"
echo "✓ Frontend state management"
echo "✓ UI for displaying and managing custom elements"
echo "✓ Save dialog for creating elements from selection"
echo "✓ Delete confirmation dialog"
echo "✓ Thumbnail generation for element previews"
echo "✓ Tag-based filtering and search"
echo "✓ Usage tracking"
echo
echo "The custom elements feature is now ready for testing!"