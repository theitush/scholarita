"""Tests for storage module."""
import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from models import Paper, Author, Highlight, HighlightAnchor
from storage import (
    slugify_doi, generate_paper_id, save_paper, load_paper,
    paper_exists, find_paper_by_doi
)
import config


@pytest.fixture
def temp_library(monkeypatch):
    """Create a temporary library directory for testing."""
    temp_dir = Path(tempfile.mkdtemp())
    library_path = temp_dir / "papers"
    library_path.mkdir(parents=True)

    # Monkey patch the library path
    monkeypatch.setattr(config, 'LIBRARY_ROOT', temp_dir)

    yield library_path

    # Cleanup
    shutil.rmtree(temp_dir)


def test_slugify_doi():
    """Test DOI slugification."""
    assert slugify_doi("10.1038/nature12345") == "10-1038-nature12345"
    assert slugify_doi("10.1000/xyz123") == "10-1000-xyz123"


def test_generate_paper_id():
    """Test paper ID generation."""
    # With DOI
    paper_id = generate_paper_id("10.1038/nature12345")
    assert paper_id == "10-1038-nature12345"

    # Without DOI (UUID)
    paper_id = generate_paper_id()
    assert paper_id.startswith("uuid-")


def test_save_and_load_paper(temp_library):
    """Test saving and loading a paper."""
    now = datetime.utcnow().isoformat() + 'Z'

    paper = Paper(
        id="test-paper-1",
        doi="10.1038/test123",
        title="Test Paper",
        authors=[Author(name="John Doe", affiliation="University")],
        abstract="This is a test abstract",
        journal="Nature",
        year=2024,
        url="https://doi.org/10.1038/test123",
        date_added=now,
        date_modified=now,
        tags=["test", "machine-learning"],
        highlights=[]
    )

    # Save paper
    save_paper(paper)

    # Check file exists
    assert paper_exists("test-paper-1")

    # Load paper
    loaded_paper = load_paper("test-paper-1")
    assert loaded_paper is not None
    assert loaded_paper.id == "test-paper-1"
    assert loaded_paper.title == "Test Paper"
    assert len(loaded_paper.authors) == 1
    assert loaded_paper.authors[0].name == "John Doe"
    assert loaded_paper.tags == ["test", "machine-learning"]


def test_find_paper_by_doi(temp_library):
    """Test finding a paper by DOI."""
    now = datetime.utcnow().isoformat() + 'Z'

    paper = Paper(
        id="10-1038-test456",
        doi="10.1038/test456",
        title="Test Paper 2",
        authors=[],
        date_added=now,
        date_modified=now,
        tags=[],
        highlights=[]
    )

    save_paper(paper)

    # Find by DOI
    found_id = find_paper_by_doi("10.1038/test456")
    assert found_id == "10-1038-test456"

    # Non-existent DOI
    not_found = find_paper_by_doi("10.1234/notfound")
    assert not_found is None
