# 🔬 FRONTEND CODE CLEANUP AUDITOR (frontend_audit.py)
import os
import re


def audit_frontend():
    frontend_dir = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__), "..", "..", "Project", "frontend", "src"
        )
    )
    if not os.path.exists(frontend_dir):
        # Retry with direct folder
        frontend_dir = "e:/Project_Backend_Frontend_90/Project/frontend/src"

    print(f"Auditing frontend src dir: {frontend_dir}\n")

    all_files = []
    for root, dirs, files in os.walk(frontend_dir):
        # Skip node_modules
        if "node_modules" in root:
            continue
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, frontend_dir)
            all_files.append(rel_path)

    print("Files found in frontend/src:")
    for f in sorted(all_files):
        print(f"  - {f}")

    # Check for test patterns
    test_keywords = ["test", "debug", "mock", "sample", "temp", "dummy"]
    print("\nScanning for test/debug keywords in filenames...")
    flagged_files = []
    for f in all_files:
        name_lower = os.path.basename(f).lower()
        if any(kw in name_lower for kw in test_keywords):
            flagged_files.append(f)

    if flagged_files:
        print("Flagged files:")
        for f in flagged_files:
            print(f"  ⚠️ {f}")
    else:
        print("No test/debug filenames detected.")


if __name__ == "__main__":
    audit_frontend()
