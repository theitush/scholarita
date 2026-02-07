# Spec Updates Summary

This document summarizes the additions made to `Spec.md` to make it implementation-ready for a single-session build.

## What Was Added

### 1. **Design Philosophy Section**
- Clarified core decisions: simple highlighting (single-page only), auto-save everywhere, single-session design
- Set expectations for error handling quality
- Confirmed config.json is sufficient (no .env needed)

### 2. **Read Status Specification**
- Defined states: `unread` (default) → `reading` (auto on page 2) → `read` (manual)
- UI indicators: Icons in sidebar (🔵🟡🟢)
- Right-click menu integration
- Filtering capabilities

### 3. **Comprehensive Error Handling**
- Import errors: duplicate detection, partial success, network failures
- PDF errors: corrupted files, scanned PDFs, missing text layer
- User-friendly error messages for every scenario
- Progress indicators during import

### 4. **Enhanced API Specification**
- Added bulk tagging endpoint: `POST /api/papers/bulk-tag`
- Separated metadata and tag updates into distinct endpoints
- Added read status endpoint: `PUT /api/papers/{id}/read-status`
- **Complete request/response formats** for all endpoints with examples

### 5. **UI Enhancements**
- Multi-select in sidebar (Ctrl+click, Shift+click)
- Bulk tagging workflow
- Metadata editing dialog
- Expanded right-click menu options
- Read status filter buttons
- Manual save button (alongside auto-save)
- Keyboard shortcut for annotation panel toggle (Ctrl+B)

### 6. **Highlight Implementation Details**
- Single-page constraint enforcement (frontend + backend)
- Complete code examples for PDF.js text anchoring
- Fallback strategy with fuzzy text matching
- Validation rules (same page, non-empty text)
- Edge case handling (scanned PDFs, overlapping highlights)

### 7. **Auto-save Specification**
- Immediate saves on all changes
- Visual feedback (green checkmark for 2 seconds)
- Manual save button for user confidence
- No file locking (single-session assumption)

### 8. **Search Implementation**
- Complete pseudo-code for in-memory search index
- Weighted scoring (title: 10, tags: 8, highlights: 6, abstract: 4)
- Tokenization and stopword removal
- Response format with highlighted snippets

### 9. **Complete Project Structure**
- Detailed directory tree for backend and frontend
- File naming conventions
- Test directory organization
- paper-id slugification rules

### 10. **Edge Cases & Error Scenarios**
- 20+ edge cases documented across import, highlighting, and UI
- Specific error messages for each scenario
- Graceful degradation strategies

### 11. **Implementation Priority (7-Phase Plan)**
- Phase 1: Core infrastructure
- Phase 2: Import flow
- Phase 3: PDF viewing
- Phase 4: Highlighting
- Phase 5: Search & tags
- Phase 6: Polish
- Phase 7: Testing
- **Estimated timeline: 7 days full-time**

### 12. **Comprehensive Testing Strategy**
- Backend unit tests (pytest) with mock external APIs
- Frontend component tests (Vitest + Testing Library)
- E2E tests (Playwright) for critical flows
- Test fixtures (4 sample PDFs)
- Manual testing checklist (PDF.js complexity)
- Test data setup script
- Coverage targets: >70% backend, >60% frontend

### 13. **Troubleshooting Guide**
- Common issues with solutions
- Performance tips for large libraries
- Development debugging commands
- API testing with curl examples

### 14. **Running Instructions**
- First-time setup script (create library, init config)
- Development workflow (backend + frontend)
- Dependency lists (requirements.txt + package.json)

### 15. **Quick Start for Implementers**
- Reading order for spec sections
- Success criteria checklist
- Key implementation notes with references
- Expected timeline

## Key Additions for One-Session Build

✅ **Complete API contract** - No guessing on request/response formats
✅ **Code examples** - Search indexing and highlight anchoring fully specified
✅ **Error handling** - Every error scenario has a defined message
✅ **Build order** - Clear 7-phase implementation plan
✅ **Testing plan** - What to test and how (unit, integration, E2E)
✅ **Edge cases** - 20+ scenarios handled upfront
✅ **Troubleshooting** - Common issues pre-documented

## What Makes This Spec Implementation-Ready

1. **No ambiguity**: All user-raised questions answered in spec
2. **No gaps**: Import, viewing, highlighting, search, tags all detailed
3. **No guessing**: API formats, error messages, UI behaviors all specified
4. **Testable**: Complete testing strategy with concrete examples
5. **Debuggable**: Troubleshooting guide and common issues documented
6. **Validated**: Read status behavior clarified, bulk operations defined

## Implementation Confidence

An experienced developer can now:
- Start coding immediately without re-reading requirements
- Know exactly what to build in what order (7 phases)
- Handle all edge cases without asking questions
- Write tests that match the spec
- Debug common issues using the guide

**Total spec length:** 1232 lines (from ~370 original)
**Estimated implementation time:** 7 days → deliverable in one focused session if time allows

---

## Next Steps

Hand this spec to a fresh Claude session with the prompt:

> "Implement the ScholarMark application according to Spec.md. Follow the 7-phase implementation priority. Write tests as you go. Don't ask questions - all decisions are in the spec."

The spec should be comprehensive enough to complete without user intervention.
