from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_backend_container_bootstraps_a_clean_mssql_database():
    entrypoint = (REPO_ROOT / "backend" / "entrypoint.sh").read_text(encoding="utf-8")
    dockerfile = (REPO_ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")

    assert "database='master'" in entrypoint
    assert "re.fullmatch" in entrypoint
    assert "CREATE DATABASE [{database}]" in entrypoint
    assert "autocommit=True" in entrypoint
    assert "alembic upgrade head" in entrypoint
    assert "sed -i 's/\\r$//' /app/entrypoint.sh" in dockerfile


def test_compose_and_smoke_test_use_isolated_host_ports():
    compose = (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    smoke = (REPO_ROOT / "scripts" / "docker_smoke_test.ps1").read_text(
        encoding="utf-8"
    )

    for variable in (
        "MSSQL_HOST_PORT",
        "REDIS_HOST_PORT",
        "BACKEND_HOST_PORT",
        "FRONTEND_HOST_PORT",
    ):
        assert variable in compose
        assert variable in smoke

    assert '"tasksync-smoke"' in smoke
    assert "exec -T backend alembic current" in smoke
    assert "down --volumes --remove-orphans" in smoke


def test_ci_compose_validation_supplies_documented_environment_templates():
    ci_workflow = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text(
        encoding="utf-8"
    )
    release_workflow = (REPO_ROOT / ".github" / "workflows" / "release.yml").read_text(
        encoding="utf-8"
    )

    development_validation = (
        "docker compose --env-file .env.example -f docker-compose.yml config --quiet"
    )
    production_validation = (
        "docker compose --env-file .env.production.example "
        "-f docker-compose.production.yml config --quiet"
    )

    for workflow in (ci_workflow, release_workflow):
        assert development_validation in workflow
        assert production_validation in workflow
