# 📂 FILE: backend/tests/test_nginx_security.py
"""
Automated Security & Configuration Validation Test Suite for Phase 3.8.6:
Nginx, Reverse Proxy & HTTPS Preparation (Final Hardening Pass).
"""

import os
import re
from pathlib import Path
import yaml
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_nginx_files_exist():
    """1. Verify required Nginx configuration files and directories exist."""
    required_paths = [
        REPO_ROOT / "nginx" / "nginx.conf",
        REPO_ROOT / "nginx" / "conf.d" / "tasksync.conf",
        REPO_ROOT / "nginx" / "ssl" / ".gitkeep",
        REPO_ROOT / "nginx" / "ssl" / "generate_self_signed_cert.ps1",
        REPO_ROOT / "nginx" / "README.md",
    ]
    for path in required_paths:
        assert path.exists(), f"Missing required Nginx file/directory: {path}"


def test_no_localhost_in_nginx_upstream():
    """Verify Docker service DNS is used instead of 'localhost' in proxy_pass directives."""
    conf_path = REPO_ROOT / "nginx" / "conf.d" / "tasksync.conf"
    content = conf_path.read_text(encoding="utf-8")
    localhost_proxy = re.findall(r"proxy_pass\s+http://localhost", content)
    assert (
        not localhost_proxy
    ), "Found illegal 'proxy_pass http://localhost' in Nginx configuration! Must use Docker service DNS."


def test_required_forwarded_headers_exist():
    """Verify all mandatory X-Forwarded-* and Host headers are configured in Nginx."""
    conf_path = REPO_ROOT / "nginx" / "conf.d" / "tasksync.conf"
    content = conf_path.read_text(encoding="utf-8")
    required_headers = [
        "proxy_set_header Host",
        "proxy_set_header X-Real-IP",
        "proxy_set_header X-Forwarded-For",
        "proxy_set_header X-Forwarded-Proto",
        "proxy_set_header X-Forwarded-Host",
        "proxy_set_header X-Forwarded-Port",
    ]
    for header in required_headers:
        assert (
            header in content
        ), f"Missing required header setting in Nginx config: '{header}'"


def test_no_wildcard_forwarded_allow_ips():
    """2 & 3. Ensure FORWARDED_ALLOW_IPS is not hardcoded to wildcard '*' in Compose or Dockerfile."""
    dockerfile_content = (REPO_ROOT / "backend" / "Dockerfile").read_text(
        encoding="utf-8"
    )
    assert (
        "--forwarded-allow-ips=*" not in dockerfile_content
    ), "Backend Dockerfile must not hardcode '--forwarded-allow-ips=*'!"

    compose_path = REPO_ROOT / "docker-compose.production.yml"
    with open(compose_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    backend_env = data["services"]["backend"]["environment"]
    env_str = str(backend_env)
    assert (
        "FORWARDED_ALLOW_IPS=*" not in env_str
    ), "docker-compose.production.yml must not use wildcard FORWARDED_ALLOW_IPS=*!"


def test_backend_network_has_fixed_subnet():
    """4. Ensure backend-network defines a fixed IPAM subnet (e.g. 172.30.0.0/24)."""
    compose_path = REPO_ROOT / "docker-compose.production.yml"
    with open(compose_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    backend_net = data.get("networks", {}).get("backend-network", {})
    ipam_config = backend_net.get("ipam", {}).get("config", [])
    assert (
        len(ipam_config) > 0
    ), "backend-network must define explicit IPAM config in docker-compose.production.yml!"
    subnet = ipam_config[0].get("subnet")
    assert subnet == "172.30.0.0/24", f"Unexpected backend network subnet: {subnet}"


def test_env_production_example_safe_forwarded_allow_ips():
    """5. Ensure .env.production.example contains safe FORWARDED_ALLOW_IPS subnet and documentation."""
    env_example = (REPO_ROOT / ".env.production.example").read_text(encoding="utf-8")
    assert (
        "FORWARDED_ALLOW_IPS=172.30.0.0/24" in env_example
    ), ".env.production.example must set FORWARDED_ALLOW_IPS=172.30.0.0/24"
    assert (
        "FORWARDED_ALLOW_IPS=*" not in env_example
    ), ".env.production.example must not suggest wildcard '*'"


def test_docker_compose_production_ports():
    """6 & 7. Verify Nginx is sole exposed service and backend/frontend ports are unexposed."""
    compose_path = REPO_ROOT / "docker-compose.production.yml"
    with open(compose_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    services = data.get("services", {})
    assert "nginx" in services, "Nginx service missing in docker-compose.production.yml"

    nginx_ports = services["nginx"].get("ports", [])
    assert (
        len(nginx_ports) >= 2
    ), "Nginx service must expose HTTP (80) and HTTPS (443) ports"

    backend_ports = services.get("backend", {}).get("ports")
    assert (
        backend_ports is None
    ), "Backend service must NOT publish ports directly to host in production!"

    frontend_ports = services.get("frontend", {}).get("ports")
    assert (
        frontend_ports is None
    ), "Frontend service must NOT publish ports directly to host in production!"


def test_gitignore_contains_tls_and_exceptions():
    """8 & 9. Verify .gitignore ignores TLS keys/certs while explicitly preserving .gitkeep & generator script."""
    gitignore = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    required_ignores = ["*.key", "*.pem", "*.crt", "nginx/ssl/*"]
    for rule in required_ignores:
        assert rule in gitignore, f"Missing TLS ignore rule in .gitignore: '{rule}'"

    required_exceptions = [
        "!nginx/ssl/.gitkeep",
        "!nginx/ssl/generate_self_signed_cert.ps1",
    ]
    for exception in required_exceptions:
        assert exception in gitignore, f"Missing exception in .gitignore: '{exception}'"


def test_documentation_secret_safe_commands():
    """10, 11, 13 & 14. Verify docs use --quiet config commands, GET for /health, correct Nginx privilege model, and safe secret docs."""
    guide_path = (
        REPO_ROOT
        / "docs"
        / "learning"
        / "phase-3.8.6-nginx-reverse-proxy-https-guide-vi.md"
    )
    if guide_path.exists():
        content = guide_path.read_text(encoding="utf-8")
        assert (
            "config --quiet" in content or "config" not in content
        ), "Documentation must use 'config --quiet' to prevent leaking secrets!"
        assert (
            "curl.exe -I http://localhost/health\n" not in content
        ), "Documentation must not use 'curl -I' for GET-only /health endpoint!"
        assert (
            "fully non-root" not in content.lower()
        ), "Documentation must not claim Nginx container runs fully non-root!"
        assert (
            "master process" in content.lower()
        ), "Documentation must accurately explain Nginx master (root) and worker (nginx) processes."


def test_no_tracked_private_keys():
    """Ensure no .key or .pem private key files exist in repository root or ssl directory."""
    ssl_dir = REPO_ROOT / "nginx" / "ssl"
    tracked_keys = list(ssl_dir.glob("*.key")) + list(ssl_dir.glob("*.pem"))
    assert (
        len(tracked_keys) == 0
    ), f"Found private key files in repository: {tracked_keys}"
