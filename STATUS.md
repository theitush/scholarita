# Project Status

**Last Updated:** 2026-02-08

## Current State

Scholarita is a functional local-first research paper annotation tool with a working backend API and frontend UI. The core paper management and PDF viewing features are operational.

### What's Working

**Backend (FastAPI):**
- Complete REST API with all endpoints
- DOI/URL import with metadata fetching (Semantic Scholar, CrossRef)
- PDF download from multiple sources (Semantic Scholar, Unpaywall, arXiv, Sci-Hub)
- Organized library structure: `metadata/`, `pdfs/`, `text/` directories
- Full PDF text extraction and caching on import
- In-memory search index with weighted field ranking (title, tags, authors, pins, abstract, full text)
- Highlight/Pin CRUD operations
- Tag management and bulk operations
- Configuration management

**Frontend (React + TypeScript):**
- Paper list sidebar with search (filters title, authors, tags, abstracts)
- Full-text search UI with search button and Enter key support
- Search results tab with snippets and match highlighting
- Tag management UI (editor, bulk operations, filtering, color picker)
- Multi-tab interface for viewing papers and search results
- PDF.js integration for PDF rendering
- Pin-based annotation system (complete)
- Resizable annotation panel
- Context menu for adding pins

**Infrastructure:**
- CORS configured for local development
- Auto-save on all operations
- Error handling with user feedback
- E2E tests with Playwright
- Backend unit tests with pytest

### Pin Annotation System (Complete)

**Pin Annotation System:**
- Context menu on right-click in PDF
- Pin creation at clicked coordinates
- Pin display with icons (numbered circles)
- Pin loading after PDF render (~200ms)
- Pin persistence fully working
- Pin editing from annotation panel
- Pin editing from sticky note (click vs drag distinction working)
- Pin drag-and-drop movement with position persistence
- E2E tests with cleanup (tests now delete pins after creation)

### Tag Management (Complete)

**Tag System:**
- Tag editor dialog with autocomplete ([TagEditor.tsx](frontend/src/components/TagEditor.tsx))
- Bulk tag editor for multiple papers ([BulkTagEditor.tsx](frontend/src/components/BulkTagEditor.tsx))
- Tag color picker ([TagColorPicker.tsx](frontend/src/components/TagColorPicker.tsx))
- Tag filtering in sidebar (click tags to filter)
- Active filter display with clear buttons
- Backend tag API fully functional

### Full-Text Search (Complete)

**Backend:**
- Full PDF text extraction using PyMuPDF ([storage.py:209-272](backend/storage.py#L209-L272))
- Text caching in `library/papers/text/*.txt` files
- Weighted search index: title (10), tags (8), authors (7), pins (6), abstract (4), full text (2)
- Search API endpoint with snippets and match highlighting ([main.py:327](backend/main.py#L327))
- Migration script for existing papers ([migrate_library_structure.py](backend/migrate_library_structure.py))

**Frontend:**
- Sidebar search input filters papers by title, authors, tags, and abstracts
- Search button appears when typing, triggers full-text backend search
- Enter key in search input opens search results tab
- SearchTab component displays results with snippets and highlighting ([SearchTab.tsx](frontend/src/components/SearchTab.tsx))
- Click on search result opens paper in new tab

### Not Yet Implemented

**Polish Features:**
- Keyboard shortcuts (Ctrl+F for search, Ctrl+1-4 for highlight colors, etc.)
- Better error messages and loading states
- Empty states for sidebar/panels


## Known Issues

1. **E2E Test Failures:**
   - Highlight popover not appearing reliably (text layer timing)
   - Some pin tests flaky due to PDF rendering timing
   - Need to add better wait conditions

2. **Pin System:**
   - Missing backend Pin model (currently using Highlight model - works fine for now)

3. **Highlight System:**
   - Text selection to highlight flow incomplete
   - Highlight rendering overlay not visible
   - Missing highlight edit/delete in UI

5. **Missing Features:**
   - No search UI
   - No tag management UI
   - No keyboard shortcuts implemented

## Next Steps (Priority Order)

### Short Term (Complete Core Features)

1. **Search UI**
   - Create Search tab component
   - Display search results with snippets
   - Implement click-to-navigate to matching paper/highlight
   - Add E2E tests for search

2. **Tag Management UI**
   - Create tag editor dialog
   - Add tag autocomplete from existing tags
   - Implement bulk tagging UI
   - Add tag filter to sidebar
   - Add E2E tests for tagging

### Medium Term (Polish)

3. **Keyboard Shortcuts**
   - Ctrl+F for search
   - Ctrl+1-4 for highlight colors
   - Ctrl+W for close tab
   - Ctrl+Tab for tab navigation
   - Ctrl+B for annotation panel toggle

4. **UI Polish**
   - Better loading states
   - Empty states for new users
   - Error message improvements
   - Visual feedback for auto-save
   - Improved styling and responsiveness

## Test Status

**Backend Tests:**
```bash
cd backend && pytest -v
```
Status: All tests passing (9/9) - storage, importers, new directory structure verified

**E2E Tests:**
```bash
cd frontend && npm run test:e2e
```
Status: ⚠️ Pin tests: 10/14 passing (4 fail due to overlapping pin test data)


## How to Verify Current State

1. **Start the application:**
   ```bash
   # Terminal 1: Backend
   cd backend && source venv/bin/activate && python main.py

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

2. **Test basic functionality:**
   - Import a paper by DOI at http://localhost:5173
   - Click paper to view PDF
   - Right-click on PDF to test context menu
   - Try creating a pin
   - Check annotation panel

3. **Run tests:**
   ```bash
   # Backend tests
   cd backend && pytest -v

   # E2E tests
   cd frontend && npm run test:e2e
   ```

## Code Statistics

```
Backend:  6 Python modules (~1,500 LOC)
Frontend: 10 TypeScript/TSX files (~1,100 LOC)
Tests:    9 test files (backend + e2e)
Total:    ~2,600 lines of code
```

## Dependencies

**Backend:** FastAPI, uvicorn, pymupdf, httpx, pydantic, pytest
**Frontend:** React 18, TypeScript, Vite, PDF.js, Zustand, Playwright

All dependencies are locked in `requirements.txt` and `package.json`.

## Documentation

- [README.md](README.md) - User documentation
- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- [Spec.md](Spec.md) - Technical specification
- [CLAUDE.md](CLAUDE.md) - Development guide for AI assistants
- API Docs: http://localhost:8000/docs (when running)
