# Scholarita — Personal Research Annotation Tool

A local-first web application for annotating, tagging, and searching scientific papers. Built for personal use with no authentication, no multi-user features, and optimized for a single researcher's workflow.

## Features

- **Import papers by DOI/URL** - Automatically fetch metadata and PDFs
- **Manual PDF upload** - Upload papers directly from your computer
- **PDF viewing** - View PDFs with PDF.js integration
- **Highlighting** - Create and manage highlights with comments
- **Search** - Full-text search across papers, tags, and annotations
- **Tagging** - Organize papers with custom tags
- **Read status tracking** - Track your reading progress
- **Local storage** - All data stored locally in JSON files

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository** (or you're already in it!)

2. **Set up the backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Set up the frontend:**

```bash
cd frontend
npm install
```

### Running the Application

1. **Start the backend** (from the `backend` directory):

```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

The backend will run on `http://localhost:8000`

2. **Start the frontend** (in a new terminal, from the `frontend` directory):

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

3. **Open your browser:**

Navigate to `http://localhost:5173`

## Project Structure

```
scholarita/
├── backend/              # FastAPI backend
│   ├── main.py          # API endpoints
│   ├── models.py        # Pydantic models
│   ├── storage.py       # File I/O operations
│   ├── importers.py     # DOI parsing, metadata fetch
│   ├── search.py        # Search indexing
│   ├── config.py        # Configuration management
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API client
│   │   ├── stores/      # Zustand state management
│   │   └── types/       # TypeScript types
│   └── package.json
└── library/             # Your paper library
    ├── config.json      # App configuration
    └── papers/          # PDFs and JSON metadata
```

## Usage

### Importing Papers

1. **By DOI/URL:**
   - Paste a DOI (e.g., `10.1038/nature12345`) or paper URL in the import bar
   - Click "Import" or press Enter
   - The app will fetch metadata and PDF automatically

2. **By PDF Upload:**
   - Click "Upload PDF" button
   - Select a PDF file from your computer
   - The app will try to extract the DOI and fetch metadata
   - If no DOI found, you can manually edit the metadata

### Viewing Papers

- Click on a paper in the sidebar to open it in a new tab
- Use Ctrl+Click to select multiple papers for bulk operations

### Creating Highlights

Currently the basic PDF viewer is implemented. Highlighting functionality will be added in the next phase.

### Searching

Search functionality is implemented in the backend. The search UI will be added in the next phase.

### Tagging

Tag management UI will be added in the next phase. Tags can be added via API.

## Configuration

Edit `library/config.json` to customize:

```json
{
  "scihub_domain": "sci-hub.se",
  "library_path": "./papers",
  "highlight_colors": ["yellow", "green", "red", "blue"],
  "default_highlight_color": "yellow",
  "remember_last_color": true
}
```

## API Documentation

The backend API is documented with FastAPI's automatic documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --log-level debug
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Running Tests

Backend tests (when implemented):
```bash
cd backend
pytest -v --cov=.
```

Frontend tests (when implemented):
```bash
cd frontend
npm run test
```

## Troubleshooting

### "Cannot fetch metadata"
- Check your internet connection
- The Semantic Scholar API might be temporarily down
- Try again later or upload the PDF manually

### "PDF not found"
- The sci-hub domain may have changed
- Update `scihub_domain` in `library/config.json`
- Try: `sci-hub.se`, `sci-hub.st`, or `sci-hub.ru`

### "Library not loading"
- Ensure `library/papers` directory exists
- Check that JSON files are valid
- Check file permissions

### Port already in use
- Backend (8000): Change port in `backend/main.py`
- Frontend (5173): Change port in `frontend/vite.config.ts`

## Data Backup

Your library is stored in the `library/` directory. To backup:

```bash
# Simple backup
tar -czf library-backup-$(date +%F).tar.gz library/

# Or use git
cd library
git init
git add .
git commit -m "Backup papers"
```

## Roadmap

- [x] Backend API infrastructure
- [x] Import by DOI/URL
- [x] PDF upload
- [x] PDF viewing
- [x] Basic UI (sidebar, tabs)
- [ ] Highlighting functionality
- [ ] Search UI
- [ ] Tag management UI
- [ ] Keyboard shortcuts
- [ ] Read status auto-tracking
- [ ] Bulk operations UI
- [ ] Tests
- [ ] Export highlights to Markdown

## License

This project is for personal use. See the specification for more details.

## Contributing

This is a personal research tool. Feel free to fork and customize for your own use!
