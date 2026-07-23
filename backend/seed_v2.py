"""Backward-compatible entry point for the canonical Seed_Example dataset."""

from Seed_Example import seed


if __name__ == "__main__":
    seed(reset_existing=True)
