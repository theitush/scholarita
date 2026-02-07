"""Pydantic models for data validation."""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class Author(BaseModel):
    name: str
    affiliation: Optional[str] = None


class HighlightAnchor(BaseModel):
    start: dict  # {"page": int, "offset": int}
    end: dict    # {"page": int, "offset": int}


class Highlight(BaseModel):
    id: str
    page: int
    color: str
    text: str
    anchor: HighlightAnchor
    comment: Optional[str] = None
    created_at: str


class Paper(BaseModel):
    id: str
    doi: Optional[str] = None
    title: str
    authors: List[Author] = []
    abstract: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    url: Optional[str] = None
    date_added: str
    date_modified: str
    tags: List[str] = []
    highlights: List[Highlight] = []


class PaperMetadata(BaseModel):
    """Paper without highlights - for listing."""
    id: str
    doi: Optional[str] = None
    title: str
    authors: List[Author] = []
    abstract: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    url: Optional[str] = None
    date_added: str
    date_modified: str
    tags: List[str] = []


class ImportRequest(BaseModel):
    input: str  # URL or DOI


class ImportResponse(BaseModel):
    status: Literal["success", "partial", "error"]
    paper_id: Optional[str] = None
    message: str
    missing: Optional[List[str]] = None
    existing_id: Optional[str] = None
    error: Optional[str] = None


class PaperUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[Author]] = None
    abstract: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    url: Optional[str] = None


class TagUpdate(BaseModel):
    tags: List[str]


class BulkTagRequest(BaseModel):
    paper_ids: List[str]
    add_tags: List[str] = []
    remove_tags: List[str] = []


class BulkTagResponse(BaseModel):
    status: str
    updated_count: int
    message: str


class HighlightCreate(BaseModel):
    page: int
    color: str
    text: str
    anchor: HighlightAnchor
    comment: Optional[str] = None


class HighlightUpdate(BaseModel):
    comment: Optional[str] = None
    color: Optional[str] = None


class HighlightResponse(BaseModel):
    status: str
    highlight_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class SearchMatch(BaseModel):
    field: str
    snippet: str
    page: Optional[int] = None


class SearchResult(BaseModel):
    paper_id: str
    title: str
    score: float
    matches: List[SearchMatch]


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int


class Config(BaseModel):
    scihub_domain: str
    library_path: str
    highlight_colors: List[str]
    default_highlight_color: str
    remember_last_color: bool
