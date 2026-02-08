# Project Status

**Last Updated:** 2026-02-08

## Current State

Scholarita is a functional local-first research paper annotation tool with a working backend API and frontend UI. The core paper management and PDF viewing features are operational.

### ✅ What's Working

**Backend (FastAPI):**
- Complete REST API with all endpoints
- DOI/URL import with metadata fetching (Semantic Scholar, CrossRef)
- PDF download from multiple sources (Semantic Scholar, Unpaywall, arXiv, Sci-Hub)
- File-based JSON storage in `library/papers/`
- In-memory search index with weighted field ranking
- Highlight CRUD operations
- Tag management and bulk operations
- Configuration management

**Frontend (React + TypeScript):**
- Paper list sidebar with filtering
- Multi-tab interface for viewing papers
- PDF.js integration for PDF rendering
- Pin-based annotation system (work in progress)
- Resizable annotation panel
- Context menu for adding pins
- Basic highlight functionality

**Infrastructure:**
- CORS configured for local development
- Auto-save on all operations
- Error handling with user feedback
- E2E tests with Playwright
- Backend unit tests with pytest

### 🚧 In Progress

**Pin Annotation System:**
- ✅ Context menu on right-click in PDF
- ✅ Pin creation at clicked coordinates
- ✅ Pin display with icons (numbered circles)
- ✅ Pin loading after PDF render (now ~200ms)
- ✅ Pin persistence (backend anchor updates fixed)
- ✅ Pin editing from annotation panel
- ✅ Pin editing from sticky note (click vs drag distinction working)
- ✅ Pin drag-and-drop movement (drag offset fixed)
- ✅ E2E tests with cleanup (tests now delete pins after creation)

**Known Issues:**
- ⚠️ Pins jump back to original position after drag when reopened (position not being saved properly) - **STILL INVESTIGATING**

### ❌ Not Yet Implemented

**Search UI:**
- Backend search API is ready and functional
- Search tab component not yet created
- No search results display UI
- Missing click-to-navigate from results

**Tag Management UI:**
- Backend tag API is ready
- No tag editor dialog
- No tag autocomplete
- No bulk tagging UI
- No tag filter in sidebar

**Polish Features:**
- Resize functionality of bottom panel
- Keyboard shortcuts (Ctrl+F, Ctrl+1-4, etc.)
- Manual save button visual feedback
- Better error messages and loading states
- Empty states for sidebar/panels


## Known Issues

1. **E2E Test Failures:**
   - Highlight popover not appearing reliably (text layer timing)
   - Some pin tests flaky due to PDF rendering timing
   - Need to add better wait conditions

2. **Pin System:**
   - ✅ Pin persistence works for initial creation
   - ✅ Pin loading timing fixed (renders immediately)
   - ✅ Pin editing from sticky note UI works (click vs drag distinction)
   - ✅ Pin drag offset fixed (no more jumping on click)
   - ✅ **FIXED:** Pin edits from sticky note now save correctly (moved API call to button handler to avoid state race condition)
   - ✅ **FIXED:** Text selection during drag prevented (added preventDefault on mousedown)
   - ⚠️ **Pin positions reset after drag** - pins jump back to original position when reopened (drag position not being saved to backend) - **STILL INVESTIGATING**
   - Missing backend Pin model (currently using Highlight model - works fine)

3. **Highlight System:**
   - Text selection to highlight flow incomplete
   - Highlight rendering overlay not visible
   - Missing highlight edit/delete in UI

4. **Missing Features:**
   - No search UI
   - No tag management UI
   - No keyboard shortcuts implemented

## Next Steps (Priority Order)

### Immediate (Fix Current Work)

1. **Fix Remaining Pin System Issues**
   - ✅ **FIXED:** Pin edit from sticky note now saves correctly
   - ✅ **FIXED:** Text selection during pin drag prevented
   - ⚠️ **CRITICAL:** Fix pin drag positions not persisting (handlePinDrop may have wrong coordinates or not updating backend) - **STILL NEEDS INVESTIGATION**
   - Consider renaming "highlight" terminology to "pin" throughout codebase

2. **Fix Highlighting System**
   - Fix highlight popover timing/visibility
   - Complete highlight rendering on PDF
   - Wire up highlight edit/delete functionality
   - Fix E2E tests for highlighting

### Short Term (Complete Core Features)

3. **Search UI**
   - Create Search tab component
   - Display search results with snippets
   - Implement click-to-navigate to matching paper/highlight
   - Add E2E tests for search

4. **Tag Management UI**
   - Create tag editor dialog
   - Add tag autocomplete from existing tags
   - Implement bulk tagging UI
   - Add tag filter to sidebar
   - Add E2E tests for tagging

### Medium Term (Polish)

5. **Keyboard Shortcuts**
   - Ctrl+F for search
   - Ctrl+1-4 for highlight colors
   - Ctrl+W for close tab
   - Ctrl+Tab for tab navigation
   - Ctrl+B for annotation panel toggle

6. **UI Polish**
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
Status: ✅ Basic tests passing (storage, importers)

**E2E Tests:**
```bash
cd frontend && npm run test:e2e
```
Status: ⚠️ Pin tests: 10/14 passing (4 fail due to overlapping pin test data)

**Manual Testing:**
- ✅ Backend API endpoints via Swagger UI
- ✅ Paper import flow
- ✅ PDF viewing
- ⚠️ Pin creation (needs verification)
- ⚠️ Highlighting (incomplete)

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
