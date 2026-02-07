# Scholarita — Personal Research Annotation Tool

## Overview

A local-first webapp for annotating, tagging, and searching scientific papers. Built for personal use—no auth, no multi-user, optimized for a single researcher's workflow. No cloud, no collaboration, no accounts — just a folder of PDFs and JSONs served by a local web app.

**Browser:** Primarily tested and optimized for Firefox.

**Design Philosophy:**
- **Simple highlighting**: Text anchored within a single page only (no cross-page spans)
- **Auto-save everything**: All changes save immediately + explicit "Save" button for peace of mind
- **Single browser session**: Not designed for concurrent multi-tab editing (can skip file locking)
- **Meaningful errors**: Every import step provides clear, actionable feedback
- **No configuration complexity**: Settings in config.json, no environment files needed

---

## Quick Start for Implementers

**Goal:** Build a working app in one session without interruptions.

**Read these sections first:**
1. [Architecture](#architecture) - Understand stack and file structure
2. [Data Model](#data-model) - Know what you're storing
3. [API Endpoints](#api-endpoints) + [API Request/Response Formats](#api-requestresponse-formats) - Backend contract
4. [Implementation Priority](#implementation-priority) - Build order (Phase 1 → Phase 7)
5. [Testing Strategy](#testing-strategy) - Ensure completeness

**Key implementation notes:**
- Use the provided pseudo-code for search indexing (see [Search Implementation](#search-implementation-v1))
- Use the provided code examples for highlight anchoring (see [PDF.js Text Anchoring](#pdfjs-text-anchoring))
- Refer to [Edge Cases & Error Scenarios](#edge-cases--error-scenarios) for error handling
- Check [Troubleshooting Guide](#troubleshooting-guide) if you get stuck

**Success criteria:**
- [ ] Can import paper by DOI/URL with metadata and PDF
- [x] Can import papers by DOI or URL
- [ ] Can view PDF and create highlights
- [ ] Highlights persist and re-render correctly
- [ ] Can search across papers and highlights
- [ ] Can tag papers (single and bulk)
- [ ] Read status updates automatically on scroll
- [ ] All API endpoints work
- [ ] Backend tests pass (>70% coverage)
- [ ] Frontend critical flows tested (at least manual E2E)

**Expected timeline:** 7 days full-time (see [Implementation Priority](#implementation-priority))

---

## Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React (Vite) |
| PDF rendering | PDF.js |
| Storage | Filesystem — flat folder of PDFs + JSONs |

### Directory Structure

```
scholarita/                  # Project root
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # Pydantic models for validation
│   ├── storage.py           # JSON file I/O operations
│   ├── importers.py         # DOI parsing, metadata fetch, PDF download
│   ├── search.py            # In-memory search index
│   ├── config.py            # Config management
│   ├── requirements.txt     # Python dependencies
│   └── tests/
│       ├── fixtures/        # Test PDFs and JSON
│       ├── test_storage.py
│       ├── test_importers.py
│       ├── test_search.py
│       └── test_api.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── PDFViewer.tsx
│   │   │   ├── HighlightPopover.tsx
│   │   │   ├── AnnotationPanel.tsx
│   │   │   ├── SearchTab.tsx
│   │   │   └── TabBar.tsx
│   │   ├── hooks/
│   │   │   ├── useAPI.ts           # API calls
│   │   │   ├── usePDFJS.ts         # PDF.js integration
│   │   │   └── useHighlights.ts    # Highlight management
│   │   ├── services/
│   │   │   └── api.ts              # API client
│   │   ├── stores/
│   │   │   └── appStore.ts         # Zustand state management
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tests/
│       ├── Sidebar.test.tsx
│       ├── PDFViewer.test.tsx
│       └── e2e/
│           └── import-flow.spec.ts
├── library/                 # User's paper library (git-ignored if desired)
│   ├── config.json          # App settings (sci-hub domain, etc.)
│   └── papers/
│       ├── {paper-id}.pdf       # The paper
│       └── {paper-id}.json      # Metadata + annotations combined
├── scripts/
│   └── create_test_library.py   # Generate test data
├── README.md
└── .gitignore
```

**`paper-id` format:**
- Derived from DOI (slugified): `10.1038/nature12345` → `10-1038-nature12345`
- UUID fallback when no DOI: `uuid-a1b2c3d4-e5f6-...`
- Slugification rules: Replace `/` and `.` with `-`, lowercase, remove special chars

---

## Data Model

### Paper JSON (`{paper-id}.json`)

```json
{
  "id": "10-1038-s41586-024-07386-0",
  "doi": "10.1038/s41586-024-07386-0",
  "title": "Paper title",
  "authors": [
    { "name": "First Last", "affiliation": "University X" }
  ],
  "abstract": "Full abstract text for search indexing...",
  "journal": "Nature",
  "year": 2024,
  "url": "https://doi.org/10.1038/s41586-024-07386-0",
  "date_added": "2025-02-06T12:00:00Z",
  "date_modified": "2025-02-06T14:30:00Z",
  "tags": ["bayesian-inference", "neuroscience", "active-inference"],
  "highlights": [
    {
      "id": "h_uuid",
      "page": 3,
      "color": "yellow",
      "text": "The selected text content",
      "anchor": {
        "start": { "page": 3, "offset": 1247 },
        "end": { "page": 3, "offset": 1312 }
      },
      "comment": "This connects to Friston's earlier work on FEP",
      "created_at": "2025-02-06T13:00:00Z"
    }
  ]
}
```

**Highlight anchoring strategy:**
- Text-based anchoring using PDF.js text layer character offsets
- **Single-page only**: Highlights cannot span multiple pages (selection is constrained to current page)
- Each highlight stores the selected text verbatim as a fallback
- If offsets break (e.g., PDF.js update), the app attempts to re-anchor by fuzzy-matching the stored text on the same page
- Ignore selections that include images/figures (text-only highlighting)

**Read Status Field:**

### Config (`config.json`)

```json
{
  "scihub_domain": "sci-hub.se",
  "library_path": "./papers",
  "highlight_colors": ["yellow", "green", "red", "blue"],
  "default_highlight_color": "yellow",
  "remember_last_color": true
}
```

**Note:** When `remember_last_color` is true, the UI remembers the last-used highlight color for the session.

---

## Import Flow

### Primary: Paste URL or DOI

User pastes a URL or DOI into an import bar. The backend resolves it through this chain:

```
1. Parse input → extract DOI
   - Direct DOI: "10.1038/..." → use directly
   - DOI URL: "https://doi.org/10.1038/..." → extract DOI
   - arXiv URL: "https://arxiv.org/abs/2301.12345" → use arXiv API
   - bioRxiv URL: similar pattern
   - Other URL: attempt to scrape DOI from page meta tags

2. Fetch metadata (parallel where possible)
   - Semantic Scholar API → title, authors, abstract, journal, year
   - CrossRef API (fallback) → same fields
   - User can edit/override any field before saving

3. Fetch PDF (waterfall)
   a. Semantic Scholar openAccessPdf field
   b. Unpaywall API (email required, free)
   c. arXiv/bioRxiv direct PDF link (if applicable)
   d. Sci-hub (configurable domain from config.json)
   e. FAIL → show error:
      "Could not fetch PDF. You can:
       - Wait for next import
       - Update sci-hub domain in Settings"
```

**Error Handling & User Feedback:**
- **Duplicate detection**: If DOI already exists in library, show error: "Paper already in library: [Title]" with option to open existing paper
- **Partial success**: If metadata found but PDF fetch fails, save metadata anyway and show: "Metadata imported, but PDF unavailable. [Upload PDF manually]"
- **Progress indicator**: Show loading spinner with current step during import (e.g., "Fetching metadata from Semantic Scholar...")
- **Network errors**: "Network error while fetching from [source]. Check internet connection or try again."
- **Invalid DOI**: "Could not parse DOI from input. Try pasting the full URL or provide DOI or URL."

### Secondary: Manual PDF Upload

User drops/uploads a PDF. Backend attempts:

1. Extract text from page 1 using pymupdf
2. Regex for DOI pattern: `10\.\d{4,}/\S+`
3. If DOI found → run the metadata fetch chain above and check for duplicates
4. If no DOI → try matching extracted title against Semantic Scholar search
5. Fallback → user manually fills metadata (title required, rest optional)

**Error Handling:**
- **Corrupted PDF**: "Unable to read PDF file. File may be corrupted or password-protected."
- **No text extractable**: "PDF appears to be scanned/image-only. Metadata must be entered manually."
- **Duplicate via DOI**: Same duplicate detection as URL import
- **File too large**: If PDF >100MB, show warning: "Large file detected (XMB). Import may take longer."

---

## API Endpoints

### Papers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/papers` | List all papers (returns metadata only, no highlights) |
| GET | `/api/papers/{id}` | Get full paper JSON including highlights |
| POST | `/api/papers/import` | Import by URL/DOI — triggers fetch chain |
| PUT | `/api/papers/{id}` | Update paper metadata (title, authors, abstract, journal, year, url) |
| PUT | `/api/papers/{id}/tags` | Update tags for a single paper |
| POST | `/api/papers/bulk-tag` | Bulk add/remove tags to multiple papers. Body: `{paper_ids: [...], add_tags: [...], remove_tags: [...]}` |
| DELETE | `/api/papers/{id}` | Delete paper + PDF + JSON |
| GET | `/api/papers/{id}/pdf` | Serve the PDF file |

### Highlights

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/papers/{id}/highlights` | Add highlight |
| PUT | `/api/papers/{id}/highlights/{hid}` | Edit highlight (comment, color) |
| DELETE | `/api/papers/{id}/highlights/{hid}` | Delete highlight |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=...` | Search across metadata + tags + annotations |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get current config |
| PUT | `/api/config` | Update config (e.g., sci-hub domain) |

### API Request/Response Formats

**POST `/api/papers/import`**
```json
// Request
{
  "input": "10.1038/s41586-024-07386-0"  // or URL
}

// Response (success)
{
  "status": "success",
  "paper_id": "10-1038-s41586-024-07386-0",
  "message": "Paper imported successfully"
}

// Response (partial success - metadata only)
{
  "status": "partial",
  "paper_id": "10-1038-s41586-024-07386-0",
  "message": "Metadata imported, but PDF unavailable",
  "missing": ["pdf"]
}

// Response (error)
{
  "status": "error",
  "error": "duplicate",
  "message": "Paper already in library: 'Paper Title'",
  "existing_id": "10-1038-s41586-024-07386-0"
}
```

**POST `/api/papers/upload`**
```json
// Request (multipart/form-data)
// file: PDF binary

// Response (success - DOI found)
{
  "status": "success",
  "paper_id": "10-1038-nature12345",
  "metadata_source": "semantic_scholar",
  "message": "Paper uploaded and metadata fetched"
}

// Response (no DOI, manual entry required)
{
  "status": "needs_metadata",
  "paper_id": "uuid-generated-id",
  "extracted_text": "First 500 chars of page 1...",
  "message": "No DOI found. Please provide metadata."
}
```

**PUT `/api/papers/{id}`**
```json
// Request
{
  "title": "Updated Title",
  "authors": [{"name": "New Author", "affiliation": "Univ"}],
  "abstract": "Updated abstract",
  "journal": "Nature",
  "year": 2024,
  "url": "https://..."
}

// Response
{
  "status": "success",
  "paper_id": "10-1038-nature12345"
}
```

**POST `/api/papers/{id}/highlights`**
```json
// Request
{
  "page": 3,
  "color": "yellow",
  "text": "selected text content",
  "anchor": {
    "start": {"page": 3, "offset": 1247},
    "end": {"page": 3, "offset": 1312}
  },
  "comment": "Optional comment"
}

// Response
{
  "status": "success",
  "highlight_id": "h_uuid123"
}

// Response (validation error)
{
  "status": "error",
  "error": "validation_failed",
  "message": "Highlight cannot span multiple pages"
}
```

**POST `/api/papers/bulk-tag`**
```json
// Request
{
  "paper_ids": ["id1", "id2", "id3"],
  "add_tags": ["machine-learning", "review"],
  "remove_tags": ["draft"]
}

// Response
{
  "status": "success",
  "updated_count": 3,
  "message": "Updated tags for 3 papers"
}
```

**GET `/api/search?q=neural+networks`**
```json
// Response
{
  "query": "neural networks",
  "results": [
    {
      "paper_id": "10-1038-nature12345",
      "title": "Deep Neural Networks for...",
      "score": 18.5,
      "matches": [
        {
          "field": "title",
          "snippet": "Deep <mark>Neural Networks</mark> for..."
        },
        {
          "field": "highlight",
          "page": 3,
          "snippet": "...modern <mark>neural network</mark> architectures..."
        }
      ]
    }
  ],
  "total": 5
}
```

---

## UI Layout

### Overall Structure

```
┌──────────────────────────────────────────────────────┐
│  [Import bar: paste URL/DOI]              [Settings] │
├──────────┬───────────────────────────────────────────┤
│          │ [Tab: paper1.pdf] [Tab: paper2.pdf] [+]   │
│ SIDEBAR  │───────────────────────────────────────────│
│          │                                           │
│ [🔍 filter]                                         │
│          │          PDF VIEWER                       │
│ ┌──────┐ │        (PDF.js)                          │
│ │paper1│ │                                           │
│ │paper2│ │    Highlights rendered as                 │
│ │paper3│ │    colored overlays on                    │
│ │...   │ │    the text layer                         │
│ └──────┘ │                                           │
│          │                                           │
│ Tags:    │                                           │
│ [neuro]  │                                           │
│ [bayes]  │                                           │
│ [ml]     │                                           │
│          ├───────────────────────────────────────────│
│          │ ▲ ANNOTATIONS (drag to resize)            │
│          │ [All highlights] [Current page]           │
│          │ ┌─ p.3 ─────────────────────────────────┐ │
│          │ │ 🟡 "selected text snippet..."  [edit] │ │
│          │ │    → comment preview here              │ │
│          │ │ 🟢 "another highlight..."      [edit] │ │
│          │ └───────────────────────────────────────┘ │
├──────────┴───────────────────────────────────────────┤
│                    Status bar                        │
└──────────────────────────────────────────────────────┘
```

### Sidebar (left, collapsible)

- **Filter bar** at top: instant text filter across paper titles, authors, tags
- **Paper list**: shows title, first author, year, read status icon, tags as colored pills
- **Selection mode**: Ctrl+click or Shift+click to select multiple papers for bulk operations
- **Tag filter section** at bottom: click tags to filter paper list
- Click paper → opens in new tab (or focuses existing tab)
- Right-click menu options:
  - Open in new tab
  - Mark as Unread/Reading/Read
  - Edit tags (opens tag editor)
  - Edit metadata (opens metadata editor dialog)
  - Delete paper

### Tab Bar

- VSCode-style tabs for open papers
- Special tabs: Search Results, Settings
- Middle-click or X to close
- Tabs show paper short title

### PDF Viewer (center)

- PDF.js rendering with text layer enabled
- **Highlight interaction:**
  - Select text → popover appears: choose color, add comment
  - Click existing highlight → shows comment, edit/delete options
  - Highlights rendered as semi-transparent colored overlays
  - Text selection constrained to current page only (cannot span pages)
- Zoom controls, page navigation
- **Scroll position tracking:**
  - Remember scroll position per tab
- **Tab behavior**: PDF reloads when tab gains focus (don't keep all PDFs in memory)

### Annotation Panel (bottom, expandable)

- VSCode-terminal-style: collapsed by default, drag handle to resize, keyboard shortcut to toggle
- Collapsed state: thin bar showing highlight count for current paper (e.g., "12 highlights")
- Expanded state:
  - Tab filters: [All highlights] [Current page]
  - Highlights listed grouped by page, each showing: color dot, text snippet, comment preview
  - Click highlight → scrolls PDF to that location
  - Edit comment inline
  - Resizable via drag — remembers last height

### Search Tab

- Opens as a dedicated tab
- Full search across: titles, authors, abstracts, tags, highlight text, comments
- Results grouped by paper, with matching snippets shown
- Click result → opens paper and scrolls to match

---

## Interaction Flows

### Adding a Highlight

1. User selects text in PDF viewer
2. Small popover appears near selection with color buttons + comment input
3. User picks color (remembers last-used if enabled), optionally types comment
4. Click save → POST to `/api/papers/{id}/highlights`
5. Highlight immediately rendered on PDF
6. Annotation panel updates

**Keyboard shortcuts:**
- `Ctrl+1` through `Ctrl+4`: Highlight with specific color (yellow/green/red/blue)
- `Ctrl+/` or `Esc`: Cancel highlight popover

### Tagging a Paper

**Single paper:**
- In sidebar: right-click paper → "Edit tags"
- In paper view: tag pills shown below tab bar, click [+] to add
- Tags are free-text with autocomplete from existing tags across library
- No predefined tag taxonomy

**Bulk tagging:**
- Select multiple papers in sidebar (Ctrl+click or Shift+click for range selection)
- Right-click selection → "Edit tags for selected papers"
- Modal appears: "Add tags" and "Remove tags" inputs with autocomplete
- Apply → updates all selected papers and shows confirmation: "Updated tags for X papers"

### Quick Filter vs Deep Search

- **Sidebar filter**: Instant, client-side, filters visible paper list by title/author/tag substring match
- **Search tab**: Server-side, searches all fields including highlight text and comments, returns ranked results with snippets

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Open search tab |
| `Ctrl+1` to `Ctrl+4` | Highlight selected text with specific color (yellow/green/red/blue) |
| `Ctrl+S` | Manual save (even though auto-save is on) |
| `/` | Focus sidebar filter |
| `Esc` | Clear filters / Cancel highlight popover |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Navigate between tabs |
| `Ctrl+B` | Toggle annotation panel (bottom) |

---

## Technical Notes

### PDF.js Text Anchoring

Highlights are anchored using character offsets within PDF.js's text content items. The anchoring data structure:

```json
{
  "anchor": {
    "start": { "page": 3, "offset": 1247 },
    "end": { "page": 3, "offset": 1312 }
  },
  "text": "the exact selected text"
}
```

**Resilience strategy:** The `text` field is always stored. If offset-based rendering fails (PDF.js version change, different text extraction), the app falls back to:
1. Substring search on the same page to re-locate the highlight
2. (Future) Store bounding box rectangles as tertiary fallback for visual positioning

**Constraints:**
- Start and end must have the same page number (enforced on frontend and backend)
- Ignore selections containing non-text elements (images, figures)

**Implementation guidance for highlight anchoring:**

Frontend (React + PDF.js):
```typescript
// When user selects text
const handleTextSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  // Get PDF.js text content for current page
  const textContent = await pdfPage.getTextContent();

  // Convert DOM selection to character offsets
  const range = selection.getRangeAt(0);
  const startOffset = getCharacterOffset(range.startContainer, range.startOffset, textContent);
  const endOffset = getCharacterOffset(range.endContainer, range.endOffset, textContent);

  // Validate same page
  if (startOffset.page !== endOffset.page) {
    showError("Highlights cannot span multiple pages");
    return;
  }

  // Create highlight object
  const highlight = {
    page: startOffset.page,
    text: selection.toString(),
    anchor: {
      start: { page: startOffset.page, offset: startOffset.offset },
      end: { page: endOffset.page, offset: endOffset.offset }
    }
  };

  // Show popover for color/comment
  showHighlightPopover(highlight);
};

// Render existing highlights on PDF
const renderHighlights = (highlights) => {
  highlights.forEach(hl => {
    try {
      // Try offset-based rendering
      const rects = getRectsFromOffsets(hl.anchor.start.offset, hl.anchor.end.offset);
      drawHighlight(rects, hl.color);
    } catch (e) {
      // Fallback: search for text on the page
      const offset = findTextOnPage(hl.text, hl.page);
      if (offset) {
        const rects = getRectsFromOffsets(offset.start, offset.end);
        drawHighlight(rects, hl.color);
        // Update stored offsets
        updateHighlightOffsets(hl.id, offset);
      } else {
        console.warn(`Could not re-anchor highlight: ${hl.id}`);
        // Show warning icon on highlight in annotation panel
      }
    }
  });
};
```

Backend (FastAPI):
```python
# Validate highlight before saving
def validate_highlight(highlight: dict) -> bool:
    # Check required fields
    if not all(k in highlight for k in ['page', 'text', 'anchor']):
        raise ValueError("Missing required fields")

    # Check same-page constraint
    if highlight['anchor']['start']['page'] != highlight['anchor']['end']['page']:
        raise ValueError("Highlight cannot span multiple pages")

    # Check page number matches
    if highlight['page'] != highlight['anchor']['start']['page']:
        raise ValueError("Page number mismatch in anchor")

    # Check text not empty
    if not highlight['text'].strip():
        raise ValueError("Highlight text cannot be empty")

    return True
```

### Auto-save Strategy

**Auto-save behavior:**
- All changes (metadata edits, tag changes, highlights, comments) save immediately via API
- No "unsaved changes" state
- Visual feedback: Brief "Saved" indicator appears after each save (e.g., green checkmark in status bar for 2 seconds)

**Manual save button:**
- Always visible in toolbar (even though auto-save is on)
- Useful for user peace of mind
- Clicking it re-saves current document and shows "All changes saved" confirmation

**No file locking:**
- Single-session assumption: user won't open app in multiple browser tabs
- If user does open multiple tabs, last write wins (no conflict detection needed for v1)

### Search Implementation (v1)

Simple in-memory search on startup:
- Load all JSONs into memory (they're small)
- Build inverted index on: title, authors, abstract, tags, highlight text, comments
- Query: tokenize → match against index → rank by field weight (title > tags > highlights > abstract > comments)

For a personal library of <1000 papers, this is instant. No need for Elasticsearch or SQLite FTS.

**Note:** When full-text search is added (v2), heavily boost title/abstract/highlight matches to avoid low-quality results from body text.

**Implementation guidance:**
```python
# Pseudo-code for search index
class SearchIndex:
    def __init__(self):
        self.papers = {}  # paper_id -> paper data
        self.index = {}   # token -> [(paper_id, field, position)]

    def tokenize(self, text):
        # Lowercase, split on non-alphanumeric, remove stopwords
        return [word for word in re.findall(r'\w+', text.lower())
                if word not in STOPWORDS]

    def add_paper(self, paper):
        # Index title (weight: 10)
        for token in self.tokenize(paper['title']):
            self.index[token].append((paper['id'], 'title', 10))

        # Index tags (weight: 8)
        for tag in paper['tags']:
            for token in self.tokenize(tag):
                self.index[token].append((paper['id'], 'tag', 8))

        # Index highlights (weight: 6)
        for hl in paper['highlights']:
            for token in self.tokenize(hl['text'] + ' ' + hl.get('comment', '')):
                self.index[token].append((paper['id'], 'highlight', 6))

        # Index abstract (weight: 4)
        for token in self.tokenize(paper['abstract']):
            self.index[token].append((paper['id'], 'abstract', 4))

    def search(self, query):
        tokens = self.tokenize(query)
        scores = defaultdict(float)

        for token in tokens:
            for paper_id, field, weight in self.index.get(token, []):
                scores[paper_id] += weight

        # Return sorted by score
        return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

### Future Versions

**v2: Full-text search**
- Extract full PDF text at import time (pymupdf), store in JSON or separate `.txt`
- Add to search index

**v3: Semantic search**
- Embed paper chunks + annotations using a local model (e.g., sentence-transformers)
- Store vectors in FAISS or numpy arrays
- Hybrid search: keyword + semantic similarity

**v4: Export**
- Export highlights to Markdown (one file per paper or combined)
- CSV export for integration with spreadsheets
- JSON export for programmatic access

---

## Backup & Sync

The `library/` folder is fully self-contained and portable. To backup or sync across machines:
- Use git for version control (add `*.pdf` to `.gitignore` if repos get large, sync PDFs separately)
- Dropbox, Syncthing, or any file sync service
- Simple zip backups: `tar -czf library-backup-$(date +%F).tar.gz library/`

**No database, no migration scripts—just files.**

---

---

## Edge Cases & Error Scenarios

### Import Edge Cases
1. **Invalid DOI format**: Show error "Invalid DOI format. Example: 10.1038/nature12345"
2. **DOI not found in any API**: Save with partial metadata, allow manual editing
3. **All PDF sources fail**: Import metadata only, show prominent "Upload PDF" button
4. **Network timeout**: Show "Request timed out. Try again or check internet connection."
5. **Malformed PDF**: "Could not read PDF. File may be corrupted."
6. **Empty PDF (0 pages)**: "PDF has no pages or is corrupted."
7. **Very large PDF (>100MB)**: Warn before importing, allow cancel
8. **Rate limiting from APIs**: Show "Too many requests. Please wait a moment and try again."

### Highlight Edge Cases
1. **Selection spans pages**: Prevent creation, show tooltip: "Highlights cannot span multiple pages"
2. **Selection in header/footer**: Allow (user may want to highlight page numbers or footnotes)
3. **Selection includes whitespace only**: Prevent creation
4. **Overlapping highlights**: Allow (render with semi-transparency so both visible)
5. **Highlight text not found during re-anchor**: Show warning icon, allow manual repositioning
6. **PDF has no text layer (scanned)**: Disable highlighting, show message: "This PDF has no text layer. Highlighting not available."

### UI Edge Cases
1. **No papers in library**: Show welcome message: "Import your first paper to get started"
2. **Search returns no results**: "No results found for '[query]'"
3. **Filter excludes all papers**: Show "No papers match current filters. [Clear filters]"
4. **Delete last highlight in annotation panel**: Panel shows "No highlights yet"
5. **Close tab with unsaved... wait, we auto-save**: No need for "unsaved changes" dialog
6. **Very long paper title**: Truncate in sidebar/tabs with ellipsis, show full on hover
7. **Very long tag name**: Truncate with ellipsis
8. **100+ highlights on one paper**: Pagination in annotation panel (50 per page)

### File System Edge Cases
1. **Library folder doesn't exist**: Create on startup
2. **Config.json missing**: Create with defaults
3. **Corrupted JSON file**: Show error, attempt recovery, or skip that paper
4. **Disk full**: "Cannot save: disk full"
5. **Permission denied**: "Cannot write to library folder. Check permissions."
6. **Paper JSON exists but PDF missing**: Show warning icon, allow re-download or upload

---

## Implementation Priority

Build in this order to get a working MVP quickly:

### Phase 1: Core Infrastructure (Day 1-2)
1. Backend: Storage layer + API skeleton
2. Frontend: Basic React setup + routing
3. Create test library with sample PDFs
4. **Deliverable**: Backend serves paper list, frontend displays it

### Phase 2: Import Flow (Day 2-3)
1. DOI parsing
2. Semantic Scholar metadata fetch
3. URL import endpoint
4. Frontend import bar
5. **Deliverable**: Can import papers by URL

### Phase 3: PDF Viewing (Day 3-4)
1. PDF.js integration
2. Basic rendering
3. Tab system
4. **Deliverable**: Can view imported PDFs

### Phase 4: Highlighting (Day 4-5)
1. Text selection detection
2. Highlight creation (anchor + save)
3. Highlight rendering
4. Annotation panel
5. **Deliverable**: Can create and view highlights

### Phase 5: Search & Tags (Day 5-6)
1. In-memory search index
2. Search tab UI
3. Tag editing (single + bulk)
4. Sidebar filtering
5. **Deliverable**: Can search and organize papers

### Phase 6: Polish (Day 6-7)
1. Keyboard shortcuts
2. Read status tracking
3. Error handling improvements
4. Auto-save visual feedback
5. Manual testing with real papers
6. **Deliverable**: Production-ready v1

### Phase 7: Testing (Day 7)
1. Write backend unit tests
2. Write frontend component tests
3. E2E test for critical flow
4. Fix bugs found during testing
5. **Deliverable**: Tested, deployable application

**Total estimate**: 7 days for one developer working full-time

---

## Testing Strategy

### Backend Testing (Python + pytest)

**Unit Tests:**
- `test_storage.py`: JSON read/write, paper CRUD operations
- `test_importers.py`: DOI parsing, metadata fetching (with mocked external APIs)
- `test_search.py`: Search index building, query ranking
- `test_api.py`: All API endpoints (using FastAPI TestClient)

**Test Fixtures:**
Create `tests/fixtures/` directory with:
- `sample_doi.pdf` - Clean PDF with DOI on first page
- `sample_arxiv.pdf` - arXiv paper
- `sample_scanned.pdf` - Image-only PDF (no text layer)
- `sample_no_doi.pdf` - PDF without DOI
- `sample_metadata.json` - Pre-filled metadata for testing

**Mock External APIs:**
Use `unittest.mock` or `pytest-mock` to mock:
- Semantic Scholar API responses
- CrossRef API responses
- Unpaywall API responses
- Sci-Hub PDF downloads
- Test both success and failure scenarios

**Integration Tests:**
- `test_import_flow.py`: Full import chain with mocked external APIs
  - Test URL import → metadata fetch → PDF download → save
  - Test PDF upload → DOI extraction → metadata fetch
  - Test duplicate detection
  - Test partial failures (metadata success, PDF failure)

**What to test:**
1. DOI extraction from various formats (URL, direct DOI, embedded in page)
2. Metadata fallback chain (Semantic Scholar → CrossRef)
3. PDF waterfall (each source, including failures)
4. Highlight CRUD operations
5. Search ranking (title matches rank higher than abstract matches)
6. Bulk tag operations
7. Read status updates

**Run tests:**
```bash
cd backend
pytest -v --cov=. --cov-report=html
```

### Frontend Testing (React + Vitest + Testing Library)

**Component Tests:**
- `Sidebar.test.tsx`: Paper list, filtering, tag filters, multi-select
- `PDFViewer.test.tsx`: Basic rendering (mock PDF.js), scroll tracking
- `HighlightPopover.test.tsx`: Color selection, comment input
- `AnnotationPanel.test.tsx`: Highlight list, filtering by page
- `SearchTab.test.tsx`: Search input, results display

**Integration Tests (Vitest):**
- Mock API responses and test full user flows
- Import paper → see in sidebar → click → open tab
- Filter papers by text and tags
- Bulk tag selection and editing

**E2E Tests (Playwright - optional but recommended):**
Create `e2e/` directory with critical flows:
```typescript
test('import paper and create highlight', async ({ page }) => {
  // 1. Start app
  // 2. Paste DOI in import bar
  // 3. Wait for import completion
  // 4. Verify paper appears in sidebar
  // 5. Click paper to open
  // 6. Select text in PDF (may need custom PDF.js mock)
  // 7. Choose highlight color
  // 8. Verify highlight appears
  // 9. Check annotation panel shows highlight
})

test('search across papers', async ({ page }) => {
  // 1. Import 3 papers with known content
  // 2. Open search tab (Ctrl+F)
  // 3. Type search query
  // 4. Verify results show correct papers
  // 5. Click result → opens paper and scrolls to location
})

test('bulk tagging', async ({ page }) => {
  // 1. Import multiple papers
  // 2. Ctrl+click to select 3 papers
  // 3. Right-click → Edit tags
  // 4. Add tags
  // 5. Verify all papers have new tags
})
```

**Manual Testing Checklist:**
Due to PDF.js complexity, manually test:
- [ ] Highlight anchoring works on different PDF types (text PDFs, scanned)
- [ ] Highlights persist after closing and reopening paper
- [ ] Highlight fallback works if offsets break (test by manually editing JSON offsets)
- [ ] App remains responsive with 50+ papers loaded
- [ ] PDF rendering works in Firefox (primary browser)
- [ ] All keyboard shortcuts work
- [ ] Read status auto-updates when scrolling past page 2
- [ ] Tab switching reloads PDFs correctly

**Run frontend tests:**
```bash
cd frontend
npm run test          # Unit/component tests
npm run test:e2e      # Playwright E2E tests (if implemented)
```

### Test Data Setup

**Create test library:**
```bash
# Script to create a test library with 10 papers
python scripts/create_test_library.py
```

This script should:
1. Download 10 open-access papers from arXiv
2. Create JSON metadata for each
3. Add variety: different tags, read statuses, some with highlights
4. Use for manual testing and E2E tests

### CI/CD Considerations (Future)

```yaml
# .github/workflows/test.yml
- Run backend pytest
- Run frontend Vitest tests
- Run Playwright E2E tests with headed browser
- Check test coverage (aim for >70% backend, >60% frontend)
```

---

## Implementation Checklist

Use this checklist to ensure completeness:

### Backend
- [ ] Set up FastAPI project structure
- [ ] Implement storage layer (JSON read/write)
- [ ] Implement DOI parsing from URLs
- [ ] Implement metadata fetchers (Semantic Scholar, CrossRef)
- [ ] Implement PDF download waterfall
- [ ] Implement PDF upload and text extraction
- [ ] Implement duplicate detection
- [ ] Implement all API endpoints
- [ ] Implement in-memory search index
- [ ] Add error handling with meaningful messages
- [ ] Write unit tests for all modules
- [ ] Write integration tests for import flow

### Frontend
- [ ] Set up Vite + React project
- [ ] Implement Sidebar with paper list
- [ ] Implement paper filtering (text + tags + read status)
- [ ] Implement multi-select for bulk operations
- [ ] Implement tab management system
- [ ] Integrate PDF.js for PDF rendering
- [ ] Implement highlight creation (popover + color selection)
- [ ] Implement highlight rendering on PDF
- [ ] Implement highlight anchoring with offsets
- [ ] Implement annotation panel (bottom, resizable)
- [ ] Implement search tab
- [ ] Implement keyboard shortcuts
- [ ] Implement auto-save with visual feedback
- [ ] Implement manual save button
- [ ] Implement read status auto-update on scroll
- [ ] Implement bulk tagging UI
- [ ] Implement metadata editor dialog
- [ ] Write component tests
- [ ] Write E2E tests for critical flows

### Integration
- [ ] Test full import flow (URL → metadata → PDF → save)
- [ ] Test PDF upload flow
- [ ] Test highlight persistence
- [ ] Test search across papers
- [ ] Test bulk operations
- [ ] Manual testing with real PDFs

### Documentation
- [ ] README with setup instructions
- [ ] API documentation (auto-generated or manual)
- [ ] User guide for key features

---

## Running

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

**Access the app:** Open Firefox and navigate to `http://localhost:5173` (Vite default)

**Development workflow:**
1. Backend runs on `http://localhost:8000`
2. Frontend runs on `http://localhost:5173` with proxy to backend
3. Changes auto-reload in both

**Single command (future):**
```bash
./scholarita start  # runs both backend + frontend
```

**First-time setup:**
```bash
# Create library directory
mkdir -p library/papers

# Initialize config.json
cat > library/config.json << EOF
{
  "scihub_domain": "sci-hub.se",
  "library_path": "./papers",
  "highlight_colors": ["yellow", "green", "red", "blue"],
  "default_highlight_color": "yellow",
  "remember_last_color": true
}
EOF
```

---

## Troubleshooting Guide

### Common Issues

**"Cannot fetch metadata"**
- Check internet connection
- Semantic Scholar API may be down → try again later
- DOI might be invalid → try searching by title instead

**"PDF not found"**
- Try updating sci-hub domain in config.json (domains change frequently)
- Current working domains (as of 2025): sci-hub.se, sci-hub.st, sci-hub.ru
- Fallback: provide DOI or URL

**"Highlights not appearing"**
- Check if PDF has text layer (try selecting text manually)
- Scanned PDFs won't work → need OCR preprocessing
- Browser console may show offset errors → highlights will attempt re-anchoring

**"Library not loading"**
- Check that library/papers directory exists
- Check JSON files are valid (use `python -m json.tool library/papers/ID.json`)
- Check file permissions

**"Backend API errors"**
- Ensure backend is running on port 8000
- Check frontend proxy config in vite.config.ts points to `http://localhost:8000`
- CORS errors: FastAPI should include CORS middleware for `http://localhost:5173`

**"PDF rendering is slow"**
- Large PDFs (>50MB) take time to load
- Consider reducing PDF quality/size before importing
- Firefox performs better than Chrome for PDF.js

### Performance Tips

**For large libraries (500+ papers):**
- Startup may take 5-10 seconds to load all JSONs
- Search remains fast (in-memory index)
- Consider lazy-loading paper metadata (load on scroll)

**For papers with many highlights (100+):**
- Annotation panel auto-paginates at 50 highlights per page
- PDF rendering may slow down → limit visible highlights to current viewport

### Development Debugging

**Backend:**
```bash
# Enable debug logging
uvicorn main:app --reload --log-level debug
```

**Frontend:**
```bash
# Enable verbose logging
VITE_LOG_LEVEL=debug npm run dev
```

**Test API directly:**
```bash
# List papers
curl http://localhost:8000/api/papers

# Import by DOI
curl -X POST http://localhost:8000/api/papers/import \
  -H "Content-Type: application/json" \
  -d '{"input": "10.1038/nature12345"}'

# Search
curl "http://localhost:8000/api/search?q=neural+networks"
```

---

## Dependencies

### Backend (`requirements.txt`)
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pymupdf>=1.23.0
httpx>=0.25.0
pydantic>=2.0.0
python-multipart>=0.0.6
pytest>=7.4.0
pytest-cov>=4.1.0
pytest-asyncio>=0.21.0
```

### Frontend (`package.json` - key dependencies)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "pdfjs-dist": "^3.11.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@playwright/test": "^1.40.0",
    "typescript": "^5.3.0"
  }
}
```