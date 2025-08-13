import requests
import json

# Test the patent endpoints
base_url = "http://localhost:5000"

def test_patents():
    print("Testing patent endpoints...")
    
    # Test 1: Check the new patent test endpoint
    try:
        response = requests.get(f"{base_url}/api/test-patents")
        print(f"Patent test endpoint response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Total patents found: {data.get('total_patents_found')}")
            print(f"Total patents counted: {data.get('total_patents_counted')}")
            print("\nPatent details:")
            for patent in data.get('patent_details', []):
                print(f"  Collection: {patent['collection']}")
                print(f"  Title: {patent['title']}")
                print(f"  Patent field: {patent['patent_field']} (type: {patent['patent_type']})")
                print(f"  Counted: {patent['counted']}")
                print(f"  Year: {patent['year']}")
                print(f"  Teacher: {patent['teacherName']}")
                print("  ---")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error testing patent endpoint: {e}")
    
    # Test 2: Check community stats
    try:
        response = requests.get(f"{base_url}/api/community/yearly_stats")
        print(f"\nCommunity yearly stats response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            summary = data.get('summary', {})
            print(f"Summary:")
            print(f"  Total publications: {summary.get('total_publications')}")
            print(f"  Total conferences: {summary.get('total_conferences')}")
            print(f"  Total journals: {summary.get('total_journals')}")
            print(f"  Total books: {summary.get('total_books')}")
            print(f"  Total patents: {summary.get('total_patents')}")
            
            # Check debug info
            debug_info = data.get('debug_info', [])
            if debug_info:
                print(f"\nDebug info:")
                for info in debug_info:
                    print(f"  {info}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error testing community stats: {e}")

if __name__ == "__main__":
    test_patents()
