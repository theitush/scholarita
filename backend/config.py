"""Configuration management."""
import json
import os
from pathlib import Path
from models import Config


CONFIG_PATH = Path(__file__).parent.parent / "library" / "config.json"
LIBRARY_ROOT = Path(__file__).parent.parent / "library"


def load_config() -> Config:
    """Load configuration from config.json."""
    if not CONFIG_PATH.exists():
        # Create default config
        default_config = Config(
            scihub_domain="sci-hub.se",
            library_path="./papers",
            highlight_colors=["yellow", "green", "red", "blue"],
            default_highlight_color="yellow",
            remember_last_color=True,
            tag_colors={}
        )
        save_config(default_config)
        return default_config

    with open(CONFIG_PATH, 'r') as f:
        data = json.load(f)
    return Config(**data)


def save_config(config: Config) -> None:
    """Save configuration to config.json."""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config.model_dump(), f, indent=2)


def get_library_path() -> Path:
    """Get the absolute path to the papers library."""
    config = load_config()
    library_path = LIBRARY_ROOT / config.library_path
    library_path.mkdir(parents=True, exist_ok=True)
    return library_path
