# 📂 FILE: backend/scripts/debug_post_tasks_live.py
import urllib.request
import urllib.parse
import json

def debug_live():
    base_url = "http://127.0.0.1:8000/api/v1"
    
    # 1. Login
    login_url = f"{base_url}/auth/login"
    data = urllib.parse.urlencode({
        "username": "admin@tasksync.example.com",
        "password": "TaskSync@2026"
    }).encode("utf-8")
    
    req = urllib.request.Request(login_url, data=data, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            login_data = json.loads(resp.read().decode("utf-8"))
            token = login_data["access_token"]
            print("Login successful! Token acquired.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 2. Get active project
    proj_req = urllib.request.Request(f"{base_url}/projects", headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(proj_req) as resp:
            projects = json.loads(resp.read().decode("utf-8"))
            target_project = projects[0]
            print(f"Project acquired: id={target_project['id']}, name='{target_project['name']}'")
    except Exception as e:
        print(f"Fetch projects failed: {e}")
        return

    # 3. POST /tasks
    payload = {
        "title": "E2E Minimal Task Test",
        "name": "E2E Minimal Task Test",
        "description": None,
        "status": "To Do",
        "priority": "Medium",
        "project_id": target_project["id"],
        "assigned_to": None,
        "sprint_id": None,
        "topic_id": None,
        "deadline": None,
        "story_points": None
    }
    
    task_req = urllib.request.Request(
        f"{base_url}/tasks",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(task_req) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print("POST /tasks SUCCESS 201!")
            print(result)
    except urllib.error.HTTPError as err:
        print(f"\nPOST /tasks FAILED with HTTP {err.code}:")
        body = err.read().decode("utf-8")
        print(body)

if __name__ == "__main__":
    debug_live()
