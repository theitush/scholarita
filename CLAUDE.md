# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scholarita is a local-first personal research annotation tool for managing scientific papers. It's a web application with a FastAPI backend and React frontend, designed for single-user use with no authentication.

**Stack:**
- Backend: FastAPI (Python) with file-based JSON storage
- Frontend: React + TypeScript + Vite
- PDF rendering: PDF.js (loaded from CDN)
- State management: Zustand
- Testing: pytest (backend), Playwright (frontend e2e)

## Development Workflow (CRITICAL)

**You are the solo developer.** Every feature and bug fix must be implemented and tested end-to-end before considering it complete.

**Before starting ANY work:**

1. **Read STATUS.md** to understand the current state of the project
2. **Check recent commits:** Run `git log -3` to see what was worked on last
3. **Understand context** before making changes

**Required workflow for ALL changes:**

1. **Implement** the feature or fix in both backend and frontend as needed
2. **Write or update tests:**
   - Backend: Unit tests in `backend/tests/`
   - Frontend: E2E tests in `frontend/tests/e2e/`
3. **Run tests** and verify they pass:
   ```bash
   # Backend tests
   cd backend && pytest -v

   # E2E tests (requires backend running)
   cd frontend && npm run test:e2e
   ```
4. **Manual verification:**
   - Start both backend and frontend
   - Test the feature in the browser
   - Verify edge cases and error handling
5. **Only then** can you consider the work complete

**Never say you're done with a feature or bug fix until:**
- ✅ All relevant tests pass
- ✅ E2E tests verify the complete user flow
- ✅ You've manually tested it in the running application
- ✅ Edge cases and error scenarios are handled

This is non-negotiable. Untested code is incomplete code.

**After completing work:**
- Ask the user if they'd like you to commit the changes
- Wait for user to review and QA
- Only commit after user confirms they're happy with the work

## Development Commands

### Backend Development

```bash
# From backend/ directory
cd backend

# Activate virtual environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend server (development mode with auto-reload)
uvicorn main:app --reload --log-level debug

# Run tests
pytest -v

# Run tests with coverage
pytest -v --cov=. --cov-report=html

# Run specific test file
pytest tests/test_storage.py -v
```

The backend runs on `http://localhost:8000`. API documentation is auto-generated at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Development

```bash
# From frontend/ directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run unit/component tests
npm run test

# Run e2e tests (requires backend running)
npm run test:e2e

# Run specific e2e test
npx playwright test tests/e2e/pins.spec.ts
```

The frontend runs on `http://localhost:5173` with hot module reload.

## Architecture & Code Organization

### Backend Structure (`backend/`)

**Core modules:**
- `main.py` - FastAPI app with all REST API endpoints, CORS middleware, and startup initialization
- `models.py` - Pydantic models for request/response validation (Paper, Highlight, Import, Search, etc.)
- `storage.py` - File I/O operations for JSON and PDF files, paper CRUD operations
- `importers.py` - DOI parsing, metadata fetching from Semantic Scholar/CrossRef, PDF downloading
- `search.py` - In-memory search index with weighted field ranking (title > tags > highlights > abstract)
- `config.py` - Configuration management for `library/config.json`

**Key patterns:**
- All paper data stored as JSON files in `library/papers/{paper-id}.json`
- PDFs stored alongside JSON: `library/papers/{paper-id}.pdf`
- Paper IDs are slugified DOIs (e.g., `10.1038/nature12345` → `10-1038-nature12345`) or UUIDs for papers without DOIs
- Highlights are stored inside paper JSON, not in separate files
- Search index is rebuilt on startup by loading all paper JSONs into memory

### Frontend Structure (`frontend/src/`)

**Component organization:**
- `App.tsx` - Main shell with sidebar and tab management
- `components/Sidebar.tsx` - Paper list with filtering and selection
- `components/TabBar.tsx` - Multi-tab interface for papers
- `components/PDFViewer.tsx` - PDF.js integration, text selection, highlight rendering
- `components/AnnotationPanel.tsx` - Resizable bottom panel showing highlights for current paper
- `stores/appStore.ts` - Zustand global state (papers, active tab, highlights, etc.)
- `services/api.ts` - API client functions for all backend endpoints
- `types/index.ts` - TypeScript type definitions matching backend models

**State management:**
- Zustand store manages: paper list, open tabs, active tab, current highlights, PDF state
- Components subscribe to specific slices of state to minimize re-renders
- API calls update store directly after successful operations (optimistic updates)

**PDF.js integration:**
- Loaded from CDN (version 3.11.174) in PDFViewer component
- Text layer enabled for selection and highlighting
- Highlights rendered as colored overlays using canvas/SVG

### Data Model

Paper JSON structure:
```json
{
  "id": "paper-id",
  "doi": "10.1038/...",
  "title": "Paper Title",
  "authors": [{"name": "...", "affiliation": "..."}],
  "abstract": "...",
  "journal": "...",
  "year": 2024,
  "tags": ["tag1", "tag2"],
  "highlights": [
    {
      "id": "h_uuid",
      "page": 3,
      "color": "yellow",
      "text": "selected text",
      "anchor": {
        "start": {"page": 3, "offset": 1247},
        "end": {"page": 3, "offset": 1312}
      },
      "comment": "Optional comment",
      "created_at": "2025-02-06T13:00:00Z"
    }
  ],
  "date_added": "...",
  "date_modified": "..."
}
```

**Highlight anchoring:** Uses character offsets from PDF.js text content. Highlights cannot span multiple pages (enforced in backend and frontend). The exact text is stored for fallback re-anchoring if offsets break.

## Key Implementation Details

### Import Flow

1. User provides DOI or URL
2. Backend extracts DOI from input (supports DOI URLs, arXiv, bioRxiv)
3. Fetches metadata from Semantic Scholar (fallback to CrossRef)
4. Downloads PDF from waterfall: Semantic Scholar → Unpaywall → arXiv/bioRxiv direct → Sci-Hub
5. Generates paper ID from DOI, checks for duplicates
6. Saves PDF and JSON to `library/papers/`
7. Adds to search index

### Highlight Creation Flow

1. User selects text in PDF.js viewer
2. Selection converted to character offsets using PDF.js text content
3. Frontend validates same-page constraint
4. POST to `/api/papers/{id}/highlights` with anchor data
5. Backend saves to paper JSON, updates `date_modified`
6. Frontend re-fetches paper data and re-renders highlights

### Search Implementation

- In-memory inverted index built on startup
- Tokenization: lowercase, split on non-alphanumeric, remove stopwords
- Field weights: title=10, tags=8, highlights=6, abstract=4
- Returns ranked results with snippets

## Testing

### Backend Tests (`backend/tests/`)

Run with `pytest -v` from backend directory.

Test files:
- `test_storage.py` - JSON read/write, paper CRUD
- `test_importers.py` - DOI parsing, metadata fetching (uses mocked APIs)

Mock external APIs (Semantic Scholar, CrossRef, Sci-Hub) in tests to avoid network dependencies.

### Frontend E2E Tests (`frontend/tests/e2e/`)

Run with `npm run test:e2e` from frontend directory.

Test files:
- `highlighting.spec.ts` - Highlight creation and rendering
- `pins.spec.ts` - Pin annotation features (context menu, pin creation)
- `pdf-viewer.spec.ts` - PDF viewing basics

**Important:** E2E tests require backend running on port 8000.

## Common Development Tasks

### Adding a New API Endpoint

1. Define request/response models in `backend/models.py`
2. Implement endpoint in `backend/main.py`
3. Add storage operations in `backend/storage.py` if needed
4. Add corresponding API function in `frontend/src/services/api.ts`
5. Update types in `frontend/src/types/index.ts`
6. Write backend test in appropriate `backend/tests/test_*.py` file

### Adding a New Frontend Component

1. Create component in `frontend/src/components/`
2. Import types from `../types`
3. Use `useAppStore()` for global state
4. Call API via `import { api } from '../services/api'`
5. Add CSS in component file or `App.css`

### Modifying Paper Data Model

1. Update Pydantic model in `backend/models.py`
2. Update TypeScript type in `frontend/src/types/index.ts`
3. Update storage read/write in `backend/storage.py`
4. Add migration logic in `storage.py` if needed (for backward compatibility)
5. Update search indexing in `backend/search.py` if new field should be searchable

## Important Constraints

- **Single-page highlights only:** Highlights cannot span multiple pages. This is validated in both frontend and backend.
- **No multi-user support:** All operations assume single user, no file locking or conflict resolution.
- **File-based storage:** All data in JSON files, no database. Keep library size manageable (<1000 papers recommended).
- **Browser compatibility:** Primarily tested in Firefox. PDF.js works across browsers but may have subtle differences.
- **Auto-save:** All changes save immediately. No "unsaved changes" state.

## Configuration

Settings in `library/config.json`:
```json
{
  "scihub_domain": "sci-hub.se",
  "library_path": "./papers",
  "highlight_colors": ["yellow", "green", "red", "blue"],
  "default_highlight_color": "yellow",
  "remember_last_color": true
}
```

Update Sci-Hub domain if PDF downloads fail (domains change frequently).

## Troubleshooting

**Backend won't start:**
- Ensure Python 3.8+ and virtual environment activated
- Check `library/papers/` directory exists
- Verify no other process using port 8000

**Frontend won't start:**
- Ensure Node.js 16+ installed
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Verify no process using port 5173

**Import fails:**
- Check internet connection for metadata/PDF fetching
- Update `scihub_domain` in config if needed
- Check backend logs for specific error

**Highlights not rendering:**
- Verify PDF has text layer (not scanned image)
- Check browser console for PDF.js errors
- Ensure backend returned highlight data with valid anchors

**Tests fail:**
- Backend: Activate venv before running pytest
- E2E: Ensure backend is running before `npm run test:e2e`
- Check test output for specific assertion failures

## Additional Documentation

- [README.md](README.md) - Full user documentation and setup guide
- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup instructions
- [Spec.md](Spec.md) - Complete technical specification with implementation details
- [BUILD_SUMMARY.md](BUILD_SUMMARY.md) - Current implementation status and architecture decisions
