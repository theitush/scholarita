"""DOI parsing, metadata fetch, and PDF download."""
import re
import httpx
import fitz  # PyMuPDF
from typing import Optional, Dict, Any, Tuple
from pathlib import Path
from models import Paper, Author
from datetime import datetime
from storage import generate_paper_id
from config import load_config


# Timeouts for external requests
TIMEOUT = 30.0


def extract_doi_from_input(input_str: str) -> Optional[str]:
    """Extract DOI from various input formats."""
    input_str = input_str.strip()

    # Direct DOI pattern
    doi_pattern = r'10\.\d{4,}/[^\s]+'

    # Check if it's a direct DOI
    if re.match(r'^10\.\d{4,}/', input_str):
        return input_str

    # Extract from DOI URL
    if 'doi.org' in input_str:
        match = re.search(doi_pattern, input_str)
        if match:
            return match.group(0)

    # arXiv URL
    arxiv_match = re.search(r'arxiv\.org/abs/(\d+\.\d+)', input_str)
    if arxiv_match:
        return f"arXiv:{arxiv_match.group(1)}"

    # bioRxiv URL
    biorxiv_match = re.search(r'biorxiv\.org/content/([^v\s]+)', input_str)
    if biorxiv_match:
        return f"bioRxiv:{biorxiv_match.group(1)}"

    # Try to extract DOI from any URL
    match = re.search(doi_pattern, input_str)
    if match:
        return match.group(0)

    return None


async def fetch_metadata_semantic_scholar(doi: str) -> Optional[Dict[str, Any]]:
    """Fetch metadata from Semantic Scholar API."""
    try:
        # Handle arXiv DOIs
        if doi.startswith('arXiv:'):
            arxiv_id = doi.split(':')[1]
            url = f"https://api.semanticscholar.org/v1/paper/arXiv:{arxiv_id}"
        else:
            url = f"https://api.semanticscholar.org/v1/paper/{doi}"

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return {
                    'title': data.get('title', ''),
                    'authors': [{'name': a.get('name', ''), 'affiliation': None} for a in data.get('authors', [])],
                    'abstract': data.get('abstract', ''),
                    'journal': data.get('venue', ''),
                    'year': data.get('year'),
                    'url': data.get('url', ''),
                    'pdf_url': data.get('openAccessPdf', {}).get('url') if data.get('openAccessPdf') else None
                }
    except Exception as e:
        print(f"Semantic Scholar error: {e}")
    return None


async def fetch_metadata_crossref(doi: str) -> Optional[Dict[str, Any]]:
    """Fetch metadata from CrossRef API (fallback)."""
    try:
        if doi.startswith('arXiv:') or doi.startswith('bioRxiv:'):
            return None

        url = f"https://api.crossref.org/works/{doi}"
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()['message']
                authors = []
                for author in data.get('author', []):
                    name = f"{author.get('given', '')} {author.get('family', '')}".strip()
                    authors.append({'name': name, 'affiliation': None})

                return {
                    'title': data.get('title', [''])[0] if data.get('title') else '',
                    'authors': authors,
                    'abstract': data.get('abstract', ''),
                    'journal': data.get('container-title', [''])[0] if data.get('container-title') else '',
                    'year': data.get('published-print', {}).get('date-parts', [[None]])[0][0] or
                            data.get('published-online', {}).get('date-parts', [[None]])[0][0],
                    'url': data.get('URL', ''),
                    'pdf_url': None
                }
    except Exception as e:
        print(f"CrossRef error: {e}")
    return None


async def fetch_metadata(doi: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Fetch metadata from available sources."""
    # Try Semantic Scholar first
    metadata = await fetch_metadata_semantic_scholar(doi)
    if metadata:
        return metadata, 'semantic_scholar'

    # Fallback to CrossRef
    metadata = await fetch_metadata_crossref(doi)
    if metadata:
        return metadata, 'crossref'

    return None, None


async def download_pdf_from_url(url: str) -> Optional[bytes]:
    """Download PDF from a direct URL."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code == 200 and response.headers.get('content-type', '').startswith('application/pdf'):
                return response.content
    except Exception as e:
        print(f"PDF download error from {url}: {e}")
    return None


async def fetch_pdf_scihub(doi: str) -> Optional[bytes]:
    """Fetch PDF from Sci-Hub."""
    try:
        config = load_config()
        scihub_domain = config.scihub_domain

        # Fetch the Sci-Hub page
        url = f"https://{scihub_domain}/{doi}"
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code == 200:
                html = response.text

                # Sci-Hub embeds PDFs in different ways. Try multiple patterns:

                # Pattern 1: <object data="/storage/..." or <embed src="..."
                object_match = re.search(r'<(?:object|embed)[^>]+(?:data|src)=["\']([^"\'#]+\.pdf)[^"\']*["\']', html, re.IGNORECASE)
                if object_match:
                    pdf_url = object_match.group(1)
                    # Handle relative URLs
                    if pdf_url.startswith('//'):
                        pdf_url = f"https:{pdf_url}"
                    elif pdf_url.startswith('/'):
                        pdf_url = f"https://{scihub_domain}{pdf_url}"
                    elif not pdf_url.startswith('http'):
                        pdf_url = f"https://{scihub_domain}/{pdf_url}"

                    print(f"Trying PDF URL from object/embed: {pdf_url}")
                    pdf_content = await download_pdf_from_url(pdf_url)
                    if pdf_content:
                        return pdf_content

                # Pattern 2: <iframe src="...pdf"
                iframe_match = re.search(r'<iframe[^>]+src=["\']([^"\']+\.pdf[^"\']*)["\']', html, re.IGNORECASE)
                if iframe_match:
                    pdf_url = iframe_match.group(1)
                    if pdf_url.startswith('//'):
                        pdf_url = f"https:{pdf_url}"
                    elif pdf_url.startswith('/'):
                        pdf_url = f"https://{scihub_domain}{pdf_url}"
                    elif not pdf_url.startswith('http'):
                        pdf_url = f"https://{scihub_domain}/{pdf_url}"

                    print(f"Trying PDF URL from iframe: {pdf_url}")
                    pdf_content = await download_pdf_from_url(pdf_url)
                    if pdf_content:
                        return pdf_content

                # Pattern 3: Download button/link href="/download/..." or href="/storage/..."
                download_match = re.search(r'href=["\'](/(?:download|storage)/[^"\'#]+\.pdf)["\']', html, re.IGNORECASE)
                if download_match:
                    pdf_url = f"https://{scihub_domain}{download_match.group(1)}"
                    print(f"Trying PDF URL from download link: {pdf_url}")
                    pdf_content = await download_pdf_from_url(pdf_url)
                    if pdf_content:
                        return pdf_content

                # Pattern 4: Try any relative URL ending in .pdf in the HTML
                all_pdf_urls = re.findall(r'/[^\s"\'<>]+\.pdf', html, re.IGNORECASE)
                for pdf_path in all_pdf_urls:
                    pdf_url = f"https://{scihub_domain}{pdf_path}"
                    print(f"Trying PDF URL from pattern search: {pdf_url}")
                    pdf_content = await download_pdf_from_url(pdf_url)
                    if pdf_content:
                        return pdf_content

                # Pattern 5: Try any absolute URL ending in .pdf
                abs_pdf_urls = re.findall(r'(?:https?:)?//[^\s"\'<>]+\.pdf', html, re.IGNORECASE)
                for pdf_url in abs_pdf_urls:
                    if pdf_url.startswith('//'):
                        pdf_url = f"https:{pdf_url}"
                    print(f"Trying absolute PDF URL: {pdf_url}")
                    pdf_content = await download_pdf_from_url(pdf_url)
                    if pdf_content:
                        return pdf_content

    except Exception as e:
        print(f"Sci-Hub error: {e}")
    return None


async def fetch_pdf(doi: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[bytes]:
    """Fetch PDF from available sources (waterfall approach)."""
    # 1. Semantic Scholar openAccessPdf
    if metadata and metadata.get('pdf_url'):
        pdf = await download_pdf_from_url(metadata['pdf_url'])
        if pdf:
            return pdf

    # 2. arXiv direct link
    if doi.startswith('arXiv:'):
        arxiv_id = doi.split(':')[1]
        arxiv_pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
        pdf = await download_pdf_from_url(arxiv_pdf_url)
        if pdf:
            return pdf

    # 3. bioRxiv direct link
    if doi.startswith('bioRxiv:'):
        biorxiv_id = doi.split(':')[1]
        biorxiv_pdf_url = f"https://www.biorxiv.org/content/{biorxiv_id}.full.pdf"
        pdf = await download_pdf_from_url(biorxiv_pdf_url)
        if pdf:
            return pdf

    # 4. Publisher-specific direct URLs
    publisher_urls = []

    # PLOS journals
    if 'journal.pone' in doi or 'journal.pcbi' in doi or 'journal.pgen' in doi or 'journal.ppat' in doi or 'journal.pbio' in doi or 'journal.pmed' in doi or 'journal.pntd' in doi:
        publisher_urls.append(f"https://journals.plos.org/plosone/article/file?id={doi}&type=printable")

    # eLife - handle version suffixes
    if 'elife' in doi.lower():
        # Extract article number from DOI like 10.7554/eLife.99545.4 or 10.7554/eLife.99545
        doi_lower = doi.lower()
        article_id = doi_lower.split('elife.')[-1].split('.')[0]  # Get first part after 'elife.'
        publisher_urls.append(f"https://cdn.elifesciences.org/articles/{article_id}/elife-{article_id}-v1.pdf")

    # JNeurosci - requires scraping the page for PDF link
    if 'jneurosci' in doi.lower():
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
                response = await client.get(f"https://www.jneurosci.org/lookup/doi/{doi}")
                if response.status_code == 200:
                    # Extract PDF link from HTML
                    import re
                    pdf_match = re.search(r'href="(/content/jneuro/[^"]+\.full\.pdf)"', response.text)
                    if pdf_match:
                        publisher_urls.append(f"https://www.jneurosci.org{pdf_match.group(1)}")
        except Exception as e:
            print(f"JNeurosci page scraping error: {e}")

    # Try publisher-specific URLs
    for url in publisher_urls:
        pdf = await download_pdf_from_url(url)
        if pdf:
            return pdf

    # 5. Sci-Hub (last resort)
    pdf = await fetch_pdf_scihub(doi)
    if pdf:
        return pdf

    return None


def extract_doi_from_pdf(pdf_path: Path) -> Optional[str]:
    """Extract DOI from first page of PDF."""
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return None

        # Get text from first page
        first_page = doc[0]
        text = first_page.get_text()

        # Search for DOI pattern
        doi_pattern = r'10\.\d{4,}/[^\s]+'
        match = re.search(doi_pattern, text)
        if match:
            return match.group(0)
    except Exception as e:
        print(f"Error extracting DOI from PDF: {e}")
    return None


def extract_text_from_pdf(pdf_path: Path, max_chars: int = 500) -> Optional[str]:
    """Extract text from first page of PDF."""
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return None

        first_page = doc[0]
        text = first_page.get_text()
        return text[:max_chars] if text else None
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return None


def validate_pdf(pdf_content: bytes) -> bool:
    """Check if PDF is valid and has content."""
    try:
        doc = fitz.open(stream=pdf_content, filetype="pdf")
        return len(doc) > 0
    except Exception:
        return False


async def import_by_doi(doi: str) -> Tuple[Optional[Paper], Optional[bytes], str]:
    """
    Import paper by DOI.
    Returns: (paper, pdf_content, status)
    status: 'success', 'partial', 'error'
    """
    # Fetch metadata
    metadata, source = await fetch_metadata(doi)
    if not metadata:
        return None, None, 'error'

    # Create paper object
    now = datetime.utcnow().isoformat() + 'Z'
    paper_id = generate_paper_id(doi)

    authors = [Author(**a) for a in metadata.get('authors', [])]

    paper = Paper(
        id=paper_id,
        doi=doi,
        title=metadata.get('title', 'Untitled'),
        authors=authors,
        abstract=metadata.get('abstract', ''),
        journal=metadata.get('journal', ''),
        year=metadata.get('year'),
        url=metadata.get('url', ''),
        date_added=now,
        date_modified=now,
        tags=[],
        highlights=[]
    )

    # Fetch PDF
    pdf_content = await fetch_pdf(doi, metadata)

    if pdf_content and validate_pdf(pdf_content):
        return paper, pdf_content, 'success'
    elif paper:
        return paper, None, 'partial'
    else:
        return None, None, 'error'
