"""FastAPI main application."""
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import uuid
from datetime import datetime
from typing import List

from models import (
    Paper, PaperMetadata, ImportRequest, ImportResponse,
    PaperUpdate, TagUpdate, BulkTagRequest, BulkTagResponse,
    HighlightCreate, HighlightUpdate, HighlightResponse, SearchResponse,
    Config as ConfigModel, Highlight, HighlightAnchor
)
from storage import (
    load_paper, save_paper, delete_paper, list_papers, paper_exists,
    find_paper_by_doi, save_pdf, get_pdf_path, add_highlight,
    update_highlight, delete_highlight, update_tags,
    bulk_update_tags, generate_paper_id
)
from importers import (
    extract_doi_from_input, import_by_doi, fetch_pdf
)
from search import (
    initialize_search_index, search_papers, add_paper_to_index, refresh_search_index
)
from config import load_config, save_config


app = FastAPI(title="Scholarita API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize search index on startup."""
    initialize_search_index()


# Papers endpoints
@app.get("/api/papers", response_model=List[PaperMetadata])
async def get_papers():
    """List all papers (metadata only)."""
    return list_papers()


@app.get("/api/papers/{paper_id}", response_model=Paper)
async def get_paper(paper_id: str):
    """Get full paper including highlights."""
    paper = load_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@app.post("/api/papers/import", response_model=ImportResponse)
async def import_paper(request: ImportRequest):
    """Import paper by URL or DOI."""
    # Extract DOI
    doi = extract_doi_from_input(request.input)
    if not doi:
        return ImportResponse(
            status="error",
            error="invalid_doi",
            message="Could not parse DOI from input. Try pasting the full URL or upload PDF manually."
        )

    # Check for duplicates
    existing_id = find_paper_by_doi(doi)
    if existing_id:
        existing_paper = load_paper(existing_id)
        return ImportResponse(
            status="error",
            error="duplicate",
            message=f"Paper already in library: '{existing_paper.title if existing_paper else 'Unknown'}'",
            existing_id=existing_id
        )

    # Import paper
    try:
        paper, pdf_content, import_status = await import_by_doi(doi)

        if not paper:
            return ImportResponse(
                status="error",
                error="fetch_failed",
                message="Could not fetch metadata. Check the DOI and try again."
            )

        # Save paper
        save_paper(paper)

        # Save PDF if available
        if pdf_content:
            save_pdf(paper.id, pdf_content)

        # Add to search index
        add_paper_to_index(paper)

        if import_status == 'success':
            return ImportResponse(
                status="success",
                paper_id=paper.id,
                message="Paper imported successfully"
            )
        else:
            return ImportResponse(
                status="partial",
                paper_id=paper.id,
                message="Metadata imported, but PDF unavailable",
                missing=["pdf"]
            )

    except Exception as e:
        return ImportResponse(
            status="error",
            error="import_failed",
            message=f"Import failed: {str(e)}"
        )



@app.put("/api/papers/{paper_id}")
async def update_paper(paper_id: str, update: PaperUpdate):
    """Update paper metadata."""
    paper = load_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Update fields
    if update.title is not None:
        paper.title = update.title
    if update.authors is not None:
        paper.authors = update.authors
    if update.abstract is not None:
        paper.abstract = update.abstract
    if update.journal is not None:
        paper.journal = update.journal
    if update.year is not None:
        paper.year = update.year
    if update.url is not None:
        paper.url = update.url

    save_paper(paper)
    add_paper_to_index(paper)

    return {"status": "success", "paper_id": paper_id}


@app.put("/api/papers/{paper_id}/tags")
async def update_paper_tags(paper_id: str, tag_update: TagUpdate):
    """Update paper tags."""
    if not update_tags(paper_id, tag_update.tags):
        raise HTTPException(status_code=404, detail="Paper not found")

    # Refresh search index
    paper = load_paper(paper_id)
    if paper:
        add_paper_to_index(paper)

    return {"status": "success", "paper_id": paper_id}


@app.post("/api/papers/bulk-tag", response_model=BulkTagResponse)
async def bulk_tag_papers(request: BulkTagRequest):
    """Bulk update tags for multiple papers."""
    updated_count = bulk_update_tags(request.paper_ids, request.add_tags, request.remove_tags)

    # Refresh search index for updated papers
    for paper_id in request.paper_ids:
        paper = load_paper(paper_id)
        if paper:
            add_paper_to_index(paper)

    return BulkTagResponse(
        status="success",
        updated_count=updated_count,
        message=f"Updated tags for {updated_count} papers"
    )


@app.delete("/api/papers/{paper_id}")
async def delete_paper_endpoint(paper_id: str):
    """Delete a paper and its PDF."""
    if not delete_paper(paper_id):
        raise HTTPException(status_code=404, detail="Paper not found")

    # Refresh search index
    refresh_search_index()

    return {"status": "success", "message": "Paper deleted"}


@app.get("/api/papers/{paper_id}/pdf")
async def get_paper_pdf(paper_id: str):
    """Serve the PDF file."""
    pdf_path = get_pdf_path(paper_id)
    if not pdf_path:
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(pdf_path, media_type="application/pdf")


@app.post("/api/papers/{paper_id}/refetch-pdf")
async def refetch_paper_pdf(paper_id: str):
    """Re-attempt to fetch PDF for a paper that doesn't have one."""
    paper = load_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Check if PDF already exists
    if get_pdf_path(paper_id):
        return {"status": "success", "message": "PDF already exists"}

    # Try to fetch PDF
    if not paper.doi:
        raise HTTPException(status_code=400, detail="Paper has no DOI")

    pdf_content = await fetch_pdf(paper.doi)
    if pdf_content and validate_pdf(pdf_content):
        save_pdf(paper_id, pdf_content)
        return {"status": "success", "message": "PDF fetched successfully"}
    else:
        return {"status": "error", "message": "Could not fetch PDF"}


# Highlights endpoints
@app.post("/api/papers/{paper_id}/highlights", response_model=HighlightResponse)
async def create_highlight(paper_id: str, highlight_data: HighlightCreate):
    """Add a highlight to a paper."""
    paper = load_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Validate same-page constraint
    if highlight_data.anchor.start['page'] != highlight_data.anchor.end['page']:
        return HighlightResponse(
            status="error",
            error="validation_failed",
            message="Highlight cannot span multiple pages"
        )

    if highlight_data.page != highlight_data.anchor.start['page']:
        return HighlightResponse(
            status="error",
            error="validation_failed",
            message="Page number mismatch in anchor"
        )

    if not highlight_data.text.strip():
        return HighlightResponse(
            status="error",
            error="validation_failed",
            message="Highlight text cannot be empty"
        )

    # Create highlight
    highlight_id = f"h_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat() + 'Z'

    highlight = Highlight(
        id=highlight_id,
        page=highlight_data.page,
        color=highlight_data.color,
        text=highlight_data.text,
        anchor=highlight_data.anchor,
        comment=highlight_data.comment,
        created_at=now
    )

    if add_highlight(paper_id, highlight):
        # Update search index
        paper = load_paper(paper_id)
        if paper:
            add_paper_to_index(paper)

        return HighlightResponse(
            status="success",
            highlight_id=highlight_id
        )

    return HighlightResponse(
        status="error",
        error="save_failed",
        message="Failed to save highlight"
    )


@app.put("/api/papers/{paper_id}/highlights/{highlight_id}")
async def update_highlight_endpoint(paper_id: str, highlight_id: str, update_data: HighlightUpdate):
    """Update a highlight."""
    if not update_highlight(paper_id, highlight_id, update_data.comment, update_data.color):
        raise HTTPException(status_code=404, detail="Highlight not found")

    # Update search index
    paper = load_paper(paper_id)
    if paper:
        add_paper_to_index(paper)

    return {"status": "success", "highlight_id": highlight_id}


@app.delete("/api/papers/{paper_id}/highlights/{highlight_id}")
async def delete_highlight_endpoint(paper_id: str, highlight_id: str):
    """Delete a highlight."""
    if not delete_highlight(paper_id, highlight_id):
        raise HTTPException(status_code=404, detail="Highlight not found")

    # Update search index
    paper = load_paper(paper_id)
    if paper:
        add_paper_to_index(paper)

    return {"status": "success", "message": "Highlight deleted"}


# Search endpoint
@app.get("/api/search", response_model=SearchResponse)
async def search(q: str):
    """Search across papers."""
    results = search_papers(q)
    return SearchResponse(
        query=q,
        results=results,
        total=len(results)
    )


# Config endpoints
@app.get("/api/config", response_model=ConfigModel)
async def get_config():
    """Get current config."""
    return load_config()


@app.put("/api/config")
async def update_config(config: ConfigModel):
    """Update config."""
    save_config(config)
    return {"status": "success", "message": "Config updated"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
