# 📂 FILE: backend/tests/test_email_rendering.py
import pytest
from app.services.email.engine import EmailTemplateEngine, TemplateContextBuilder


def test_template_context_builder():
    ctx = TemplateContextBuilder.build({"custom_var": "val"})
    assert ctx["company_name"] == "TaskSync Enterprise"
    assert ctx["custom_var"] == "val"
    assert "brand" in ctx
    assert "assets" in ctx


def test_layout_inheritance_rendering():
    engine = EmailTemplateEngine()
    context = {
        "employee_name": "Alice Smith",
        "task_title": "Design Database Schema",
        "actor_name": "Manager John",
        "priority": "HIGH",
        "due_date": "2026-08-01",
    }

    html_output = engine.render_html("task_assigned", context)

    # 1. Assert layout elements exist (inheritance check)
    assert "<!DOCTYPE html>" in html_output
    assert "TaskSync Enterprise" in html_output  # from header
    assert "This is an automated notification" in html_output  # from footer

    # 2. Assert template content blocks rendered correctly
    assert "<h2>Task Assigned</h2>" in html_output
    assert "Alice Smith" in html_output
    assert "Design Database Schema" in html_output
    assert "High" in html_output


def test_plain_text_rendering():
    engine = EmailTemplateEngine()
    context = {
        "employee_name": "Bob Jones",
        "task_title": "Refactor Code",
        "actor_name": "Team Lead",
        "priority": "Normal",
    }

    text_output = engine.render_plain("task_assigned", context)

    assert "Task Assigned" in text_output
    assert "Hello Bob Jones," in text_output
    assert "- Task Title: Refactor Code" in text_output


def test_missing_variables_safety():
    engine = EmailTemplateEngine()
    # Provide no variables at all
    context = {}

    try:
        html_output = engine.render_html("task_assigned", context)
        # Should render successfully without crash, with empty values or fallback string blocks
        assert "Task Assigned" in html_output
    except Exception as e:
        pytest.fail(f"Template rendering failed under empty variables: {e}")


def test_html_autoescaping_xss_protection():
    engine = EmailTemplateEngine()
    # Script tag injected inside user payload
    context = {
        "employee_name": "John Doe",
        "task_title": "<script>alert('XSS')</script>",
        "actor_name": "Attacker",
    }

    html_output = engine.render_html("task_assigned", context)

    # Assert tag was escaped to HTML entities rather than rendered as raw tag
    assert "<script>" not in html_output
    assert "&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;" in html_output


def test_security_directory_traversal_validation():
    engine = EmailTemplateEngine()

    with pytest.raises(ValueError) as exc:
        engine.render_html("../../../etc/passwd", {})
    assert "Security violation" in str(exc.value)

    with pytest.raises(ValueError) as exc_abs:
        engine.render_html("/absolute/path", {})
    assert "Security violation" in str(exc_abs.value)
