# 📂 FILE: app/startup/production_check.py
from app.config import settings
from app.core.logger import app_logger
from app.monitoring.validators import SystemValidator


def run_production_readiness_check() -> dict:
    """
    Validates infrastructure status for production deployment.
    Calculates a Production Readiness Score (max 100).
    """
    app_logger.info("Starting Enterprise Production Readiness Audit...")
    
    checks = SystemValidator.run_all_checks()
    
    # Calculate Base Score (each pass adds 25 points, max 100)
    passed_checks = sum(1 for status in checks.values() if status == "PASS")
    base_score = int((passed_checks / len(checks)) * 100)
    
    # Security validations and deductions
    security_deductions = 0
    secret_key_val = settings.SECRET_KEY.get_secret_value()
    
    # Apply strict rules in production environment
    if settings.ENVIRONMENT == "production":
        if secret_key_val == "task_sync_enterprise_secret_key_chuandry_2026":
            app_logger.critical("PRODUCTION AUDIT FAILURE: Weak/default SECRET_KEY is used in production!")
            security_deductions += 50
        elif len(secret_key_val) < 32:
            app_logger.warning("PRODUCTION AUDIT WARNING: SECRET_KEY is too short (<32 chars) for production.")
            security_deductions += 20
            
        if "*" in settings.ALLOWED_HOSTS:
            app_logger.warning("PRODUCTION AUDIT WARNING: Wildcard '*' in ALLOWED_HOSTS is unsafe for production.")
            security_deductions += 10
            
    final_score = max(0, base_score - security_deductions)
    
    report = {
        "score": final_score,
        "checks": checks,
        "security_warnings": security_deductions > 0,
        "is_ready": final_score >= 80,
    }
    
    app_logger.info(
        f"Production Readiness Audit completed. Score: {final_score}/100. "
        f"Status: {'READY' if report['is_ready'] else 'NOT READY'}"
    )
    
    return report
