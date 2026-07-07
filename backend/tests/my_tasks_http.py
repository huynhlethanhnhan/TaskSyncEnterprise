# FILE: app/tests/test_my_tasks_http.py
import http.client
import urllib.parse
import json

HOST = "127.0.0.1"
PORT = 8001

def test_user_my_tasks(email, password="123456"):
    print(f"\nTesting login & my-tasks query for user: {email}...")
    
    # 1. Login to retrieve access token
    conn = http.client.HTTPConnection(HOST, PORT)
    params = urllib.parse.urlencode({"username": email, "password": password})
    headers = {"Content-type": "application/x-www-form-urlencoded"}
    conn.request("POST", "/api/v1/auth/login", params, headers)
    
    res = conn.getresponse()
    body = json.loads(res.read().decode("utf-8", "ignore"))
    
    if res.status != 200:
        print(f"[FAIL] Login failed with status: {res.status}")
        conn.close()
        return
        
    token = body["access_token"]
    user_info = body["user"]
    print(f"[PASS] Login successful! User ID: {user_info['id']} | Role ID: {user_info['role_id']} | Role Name: {user_info['role']}")
    
    # 2. Query /tasks/my-tasks
    headers_auth = {"Authorization": f"Bearer {token}"}
    conn.request("GET", "/api/v1/tasks/my-tasks", headers=headers_auth)
    res_tasks = conn.getresponse()
    body_tasks = json.loads(res_tasks.read().decode("utf-8", "ignore"))
    
    if res_tasks.status == 200:
        print(f"[PASS] /tasks/my-tasks succeeded! Count: {len(body_tasks)}")
    else:
        print(f"[FAIL] /tasks/my-tasks failed! Status: {res_tasks.status}")
        # Print representation of body to avoid encoding error on terminal
        print(f"       Response Keys: {list(body_tasks.keys())}")
        print(f"       Response Message: {body_tasks.get('message', 'N/A').encode('ascii', 'ignore').decode('ascii')}")
        
    conn.close()

if __name__ == "__main__":
    # Test for standard employee
    test_user_my_tasks("employee@gmail.com")
    # Test for admin user
    test_user_my_tasks("manager@gmail.com")
