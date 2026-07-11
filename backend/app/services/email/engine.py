# 📂 FILE: app/services/email/engine.py
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.core.logger import app_logger


class BrandTheme:
    """Enterprise brand colors and typographic tokens."""
    PRIMARY_COLOR = "#2563eb"
    SECONDARY_COLOR = "#0f172a"
    BACKGROUND_COLOR = "#f8fafc"
    TEXT_COLOR = "#1e293b"
    FONT_FAMILY = "'Inter', -apple-system, sans-serif"


class EmailAssetsManager:
    """Manages paths and URLs for standard email assets (like logos)."""
    LOGO_URL = "https://tasksync.enterprise/assets/logo.png"


class TemplateContextBuilder:
    """Context builder ensuring core standard template variables are always supplied."""

    @staticmethod
    def build(extra_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        base = {
            "company_name": "TaskSync Enterprise",
            "current_year": str(datetime.now(timezone.utc).year),
            "support_email": "support@tasksync.enterprise",
            "notification_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "brand": {
                "primary": BrandTheme.PRIMARY_COLOR,
                "secondary": BrandTheme.SECONDARY_COLOR,
                "background": BrandTheme.BACKGROUND_COLOR,
                "text": BrandTheme.TEXT_COLOR,
                "font": BrandTheme.FONT_FAMILY
            },
            "assets": {
                "logo_url": EmailAssetsManager.LOGO_URL
            }
        }
        if extra_context:
            base.update(extra_context)
        return base


class EmailTemplateEngine:
    """Enterprise Template Engine implementing Jinja2 environments, auto-escaping, and secure loads."""

    def __init__(self, templates_dir: Optional[Path] = None) -> None:
        if not templates_dir:
            # Resolve relative to current file path
            templates_dir = Path(__file__).resolve().parent / "templates"
            
        self.templates_dir = templates_dir
        
        # Security: Configure autoescape for HTML templates only to prevent XSS script injections
        self._env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True
        )

    def _get_localized_env(self, locale: str) -> Environment:
        """
        Loads templates looking first in locale subdirectories (e.g. templates/vi/),
        falling back to default templates/ root.
        """
        locale_path = self.templates_dir / locale
        search_paths = [str(locale_path), str(self.templates_dir)]
        
        return Environment(
            loader=FileSystemLoader(search_paths),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True
        )

    def _validate_template_name(self, name: str) -> None:
        """Validates that template names do not allow directory traversal exploits."""
        # Block directory traversal sequences or absolute paths
        if ".." in name or name.startswith("/") or name.startswith("\\"):
            raise ValueError(f"Security violation: Invalid template name '{name}' detected.")
            
        # Ensure name only contains alphanumerics, underscores, slashes, and periods
        if not re.match(r"^[a-zA-Z0-9_\-\.\/]+$", name):
            raise ValueError(f"Validation failure: Template name '{name}' contains illegal characters.")

    def render_html(
        self,
        template_name: str,
        context: Dict[str, Any],
        locale: str = "en"
    ) -> str:
        """Renders the HTML email body with complete layout block inheritance."""
        self._validate_template_name(template_name)
        
        # Check if localized directory exists, otherwise use standard env
        env = self._get_localized_env(locale)
        
        # Add notifications directory prefix for html formats
        full_path = f"notifications/{template_name}.html"
        
        template = env.get_template(full_path)
        full_context = TemplateContextBuilder.build(context)
        return template.render(full_context)

    def render_plain(
        self,
        template_name: str,
        context: Dict[str, Any],
        locale: str = "en"
    ) -> str:
        """Renders the plain-text email content fallback."""
        self._validate_template_name(template_name)
        
        env = self._get_localized_env(locale)
        full_path = f"plain/{template_name}.txt"
        
        template = env.get_template(full_path)
        full_context = TemplateContextBuilder.build(context)
        return template.render(full_context)
