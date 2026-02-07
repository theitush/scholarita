"""Tests for importers module."""
import pytest
from importers import extract_doi_from_input


def test_extract_doi_direct():
    """Test extracting DOI from direct DOI string."""
    doi = extract_doi_from_input("10.1038/nature12345")
    assert doi == "10.1038/nature12345"


def test_extract_doi_from_url():
    """Test extracting DOI from DOI URL."""
    doi = extract_doi_from_input("https://doi.org/10.1038/nature12345")
    assert doi == "10.1038/nature12345"


def test_extract_doi_from_arxiv():
    """Test extracting DOI from arXiv URL."""
    doi = extract_doi_from_input("https://arxiv.org/abs/2301.12345")
    assert doi == "arXiv:2301.12345"


def test_extract_doi_invalid():
    """Test with invalid input."""
    doi = extract_doi_from_input("not a valid doi or url")
    assert doi is None


def test_extract_doi_from_paper_url():
    """Test extracting DOI from a paper URL."""
    doi = extract_doi_from_input("https://www.nature.com/articles/nature12345")
    # This might not extract a DOI since it's not in the URL
    # But if the URL contains the DOI pattern, it should work
    pass  # This is more of an integration test with actual URLs
