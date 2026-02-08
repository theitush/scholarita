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

### Pin Annotation System 

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

### Tag Management 

**Tag System:**
- Tag editor dialog with autocomplete ([TagEditor.tsx](frontend/src/components/TagEditor.tsx))
- Bulk tag editor for multiple papers ([BulkTagEditor.tsx](frontend/src/components/BulkTagEditor.tsx))
- Tag color picker ([TagColorPicker.tsx](frontend/src/components/TagColorPicker.tsx))
- Tag filtering in sidebar (click tags to filter)
- Active filter display with clear buttons
- Backend tag API fully functional

### Full-Text Search 

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

## Next Steps (Priority Order)

- more informative error messages when pdf download fails
- upload pdf manually when missing (dont forget to index!)
- filtering multiple tags should be AND not OR!!!
- all tags clickable in a frame under the search bar
- add functionality to commit papers metadata to git, discuss details
- highlight currently viewed article in sidebar 
- mark number of highlights in paper
- sometimes articles dont load and need to be closed and reopend
- dark mode toggle button that also flips the pdf colors
- we scraped the highlights and changed them to pins so gotta remove all references to highlights in front and back! it might still be giving us shit... 
- pins are still giving issues.. new pin doesnt always appear and may require reopening the tab

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

## Dependencies

All dependencies are locked in `requirements.txt` and `package.json`.

