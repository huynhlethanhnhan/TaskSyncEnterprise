# FILE: app/tests/test_stress.py
import sys
import os
import time
import threading
import http.client
import json

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Target Host Configuration
HOST = "127.0.0.1"
PORT = 8001
CONCURRENT_USERS = 100
REQUESTS_PER_USER = 5

success_count = 0
failure_count = 0
latencies = []
lock = threading.Lock()

def make_request(token, path):
    global success_count, failure_count
    start_time = time.time()
    try:
        conn = http.client.HTTPConnection(HOST, PORT, timeout=5)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-type": "application/json"
        }
        conn.request("GET", path, headers=headers)
        response = conn.getresponse()
        data = response.read()
        latency = time.time() - start_time
        
        with lock:
            latencies.append(latency)
            if response.status == 200:
                success_count += 1
            else:
                failure_count += 1
        conn.close()
    except Exception as e:
        latency = time.time() - start_time
        with lock:
            latencies.append(latency)
            failure_count += 1

def worker_thread(token, path):
    for _ in range(REQUESTS_PER_USER):
        make_request(token, path)

def run_stress_test(token, path="/api/v1/dashboard/progress"):
    print("======================================================================")
    print(f"🚀 STARTING LOAD / STRESS TEST: {CONCURRENT_USERS} CONCURRENT USERS")
    print(f"Target Endpoint: {path}")
    print("======================================================================\n")

    threads = []
    start_test_time = time.time()

    for i in range(CONCURRENT_USERS):
        t = threading.Thread(target=worker_thread, args=(token, path))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    total_test_time = time.time() - start_test_time
    total_requests = success_count + failure_count

    print("----------------------------------------------------------------------")
    print("LOAD TEST METRICS:")
    print("----------------------------------------------------------------------")
    print(f"  Total Requests Sent: {total_requests}")
    print(f"  Successful (200 OK): {success_count}")
    print(f"  Failed / Timeout:    {failure_count}")
    print(f"  Total Elapsed Time:  {total_test_time:.2f} seconds")
    
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        print(f"  Average Latency:     {avg_latency:.4f} seconds")
        print(f"  Min Latency:         {min_latency:.4f} seconds")
        print(f"  Max Latency:         {max_latency:.4f} seconds")
        print(f"  Throughput:          {total_requests / total_test_time:.2f} req/sec")
    print("\n======================================================================")

if __name__ == "__main__":
    # Standard fallback mock token for manual validation
    mock_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-41a"
    run_stress_test(mock_token)
