"""JSON file I/O operations for papers."""
import json
import uuid
import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from models import Paper, PaperMetadata, Highlight
from config import get_library_path


def slugify_doi(doi: str) -> str:
    """Convert DOI to filesystem-safe ID."""
    return doi.replace('/', '-').replace('.', '-').lower()


def generate_paper_id(doi: Optional[str] = None) -> str:
    """Generate paper ID from DOI or UUID."""
    if doi:
        return slugify_doi(doi)
    return f"uuid-{uuid.uuid4()}"


def get_paper_path(paper_id: str) -> tuple[Path, Path, Path]:
    """Get paths for paper JSON, PDF, and text files."""
    library_path = get_library_path()

    # Create subdirectories if they don't exist
    metadata_dir = library_path / "metadata"
    pdfs_dir = library_path / "pdfs"
    text_dir = library_path / "text"

    metadata_dir.mkdir(parents=True, exist_ok=True)
    pdfs_dir.mkdir(parents=True, exist_ok=True)
    text_dir.mkdir(parents=True, exist_ok=True)

    json_path = metadata_dir / f"{paper_id}.json"
    pdf_path = pdfs_dir / f"{paper_id}.pdf"
    text_path = text_dir / f"{paper_id}.txt"

    return json_path, pdf_path, text_path


def paper_exists(paper_id: str) -> bool:
    """Check if a paper exists."""
    json_path, _, _ = get_paper_path(paper_id)
    return json_path.exists()


def find_paper_by_doi(doi: str) -> Optional[str]:
    """Find a paper ID by its DOI."""
    paper_id = slugify_doi(doi)
    if paper_exists(paper_id):
        return paper_id

    # Also search through all papers in case of ID mismatch
    for paper in list_papers():
        if paper.doi and paper.doi.lower() == doi.lower():
            return paper.id
    return None


def load_paper(paper_id: str) -> Optional[Paper]:
    """Load a paper from JSON."""
    json_path, _, _ = get_paper_path(paper_id)
    if not json_path.exists():
        return None

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return Paper(**data)
    except Exception as e:
        print(f"Error loading paper {paper_id}: {e}")
        return None


def save_paper(paper: Paper) -> None:
    """Save a paper to JSON."""
    json_path, _, _ = get_paper_path(paper.id)
    paper.date_modified = datetime.utcnow().isoformat() + 'Z'

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(paper.model_dump(), f, indent=2, ensure_ascii=False)


def delete_paper(paper_id: str) -> bool:
    """Delete a paper, its PDF, and extracted text."""
    json_path, pdf_path, text_path = get_paper_path(paper_id)

    deleted = False
    if json_path.exists():
        json_path.unlink()
        deleted = True
    if pdf_path.exists():
        pdf_path.unlink()
        deleted = True
    if text_path.exists():
        text_path.unlink()
        deleted = True

    return deleted


def list_papers() -> List[PaperMetadata]:
    """List all papers (metadata only, no highlights)."""
    library_path = get_library_path()
    metadata_dir = library_path / "metadata"

    # Create metadata directory if it doesn't exist
    metadata_dir.mkdir(parents=True, exist_ok=True)

    papers = []
    for json_file in metadata_dir.glob("*.json"):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # Create PaperMetadata by excluding highlights
            metadata_data = {k: v for k, v in data.items() if k != 'highlights'}
            papers.append(PaperMetadata(**metadata_data))
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
            continue

    # Sort by date_added, newest first
    papers.sort(key=lambda p: p.date_added, reverse=True)
    return papers


def save_pdf(paper_id: str, pdf_content: bytes) -> None:
    """Save PDF file."""
    _, pdf_path, _ = get_paper_path(paper_id)
    with open(pdf_path, 'wb') as f:
        f.write(pdf_content)


def get_pdf_path(paper_id: str) -> Optional[Path]:
    """Get PDF path if it exists."""
    _, pdf_path, _ = get_paper_path(paper_id)
    return pdf_path if pdf_path.exists() else None


def add_highlight(paper_id: str, highlight: Highlight) -> bool:
    """Add a highlight to a paper."""
    paper = load_paper(paper_id)
    if not paper:
        return False

    paper.highlights.append(highlight)
    save_paper(paper)
    return True


def update_highlight(paper_id: str, highlight_id: str, comment: Optional[str] = None, color: Optional[str] = None, text: Optional[str] = None, anchor: Optional[dict] = None) -> bool:
    """Update a highlight."""
    from models import HighlightAnchor

    paper = load_paper(paper_id)
    if not paper:
        return False

    for hl in paper.highlights:
        if hl.id == highlight_id:
            if comment is not None:
                hl.comment = comment
            if color is not None:
                hl.color = color
            if text is not None:
                hl.text = text
            if anchor is not None:
                # Convert dict to HighlightAnchor model to ensure proper structure
                hl.anchor = HighlightAnchor(**anchor)
            save_paper(paper)
            return True

    return False


def delete_highlight(paper_id: str, highlight_id: str) -> bool:
    """Delete a highlight."""
    paper = load_paper(paper_id)
    if not paper:
        return False

    original_length = len(paper.highlights)
    paper.highlights = [hl for hl in paper.highlights if hl.id != highlight_id]

    if len(paper.highlights) < original_length:
        save_paper(paper)
        return True

    return False


def update_tags(paper_id: str, tags: List[str]) -> bool:
    """Update paper tags."""
    paper = load_paper(paper_id)
    if not paper:
        return False

    paper.tags = tags
    save_paper(paper)
    return True


def bulk_update_tags(paper_ids: List[str], add_tags: List[str], remove_tags: List[str]) -> int:
    """Update tags for multiple papers."""
    updated_count = 0

    for paper_id in paper_ids:
        paper = load_paper(paper_id)
        if not paper:
            continue

        # Add new tags
        for tag in add_tags:
            if tag not in paper.tags:
                paper.tags.append(tag)

        # Remove tags
        paper.tags = [tag for tag in paper.tags if tag not in remove_tags]

        save_paper(paper)
        updated_count += 1

    return updated_count


def extract_text_from_pdf(paper_id: str) -> Optional[str]:
    """Extract full text from a PDF file."""
    _, pdf_path, _ = get_paper_path(paper_id)

    if not pdf_path.exists():
        print(f"PDF not found for paper {paper_id}")
        return None

    try:
        doc = fitz.open(pdf_path)
        text_parts = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text:
                text_parts.append(text)

        doc.close()

        full_text = "\n\n".join(text_parts)
        return full_text if full_text.strip() else None

    except Exception as e:
        print(f"Error extracting text from PDF {paper_id}: {e}")
        return None


def save_extracted_text(paper_id: str, text: str) -> None:
    """Save extracted text to file."""
    _, _, text_path = get_paper_path(paper_id)

    with open(text_path, 'w', encoding='utf-8') as f:
        f.write(text)


def load_extracted_text(paper_id: str) -> Optional[str]:
    """Load extracted text from file."""
    _, _, text_path = get_paper_path(paper_id)

    if not text_path.exists():
        return None

    try:
        with open(text_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading extracted text for {paper_id}: {e}")
        return None


def get_or_extract_text(paper_id: str) -> Optional[str]:
    """Get cached text or extract it from PDF if not cached."""
    # Try to load cached text first
    text = load_extracted_text(paper_id)
    if text:
        return text

    # Extract from PDF and cache it
    text = extract_text_from_pdf(paper_id)
    if text:
        save_extracted_text(paper_id, text)

    return text
