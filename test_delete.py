import requests
import json

# Test the backend endpoints
base_url = "http://localhost:5000"

def test_backend():
    print("Testing backend endpoints...")
    
    # Test 1: Check if backend is running
    try:
        response = requests.get(f"{base_url}/api/test-delete")
        print(f"Test endpoint response: {response.status_code}")
        if response.status_code == 200:
            print(f"Response data: {response.json()}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error testing endpoint: {e}")
    
    # Test 2: Get all projects
    try:
        response = requests.get(f"{base_url}/api/yearly-projects")
        print(f"\nGet projects response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Projects count: {len(data.get('projects', []))}")
            if data.get('projects'):
                first_project = data['projects'][0]
                print(f"First project: {json.dumps(first_project, indent=2)}")
                print(f"Project ID: {first_project.get('_id')}")
                print(f"Project ID type: {type(first_project.get('_id'))}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error getting projects: {e}")

if __name__ == "__main__":
    test_backend()
