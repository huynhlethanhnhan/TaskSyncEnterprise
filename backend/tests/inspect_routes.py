import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

for r in app.routes:
    print(f"Type: {type(r).__name__}")
    # Print all attributes of route to inspect
    print(dir(r))
    if hasattr(r, "routes"):
        print(f"Nested routes: {len(r.routes)}")
    print("---------------------------------")
