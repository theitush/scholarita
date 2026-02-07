# Quick Start Guide

Get Scholarita running in 5 minutes!

## Automated Setup (Recommended)

Run the setup script:

```bash
./scripts/setup.sh
```

This will:
- Create the library directory structure
- Set up Python virtual environment
- Install Python dependencies
- Install Node.js dependencies

## Manual Setup

If the script doesn't work, follow these steps:

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Two Terminals

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Background Process

**Linux/Mac:**
```bash
# Start backend in background
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev

# When done, kill backend:
# kill $BACKEND_PID
```

## Access the App

Open your browser to: `http://localhost:5173`

## First Steps

1. **Import your first paper:**
   - Find a paper on Google Scholar or arXiv
   - Copy the DOI (e.g., `10.1038/nature12345`) or URL
   - Paste it in the import bar
   - Click "Import"

2. **Or upload a PDF:**
   - Click "Upload PDF"
   - Select a PDF from your computer
   - The app will try to extract metadata automatically

3. **View the paper:**
   - Click on the paper in the sidebar
   - It will open in a new tab

## Troubleshooting

### Backend won't start

Check Python version:
```bash
python3 --version  # Should be 3.8+
```

### Frontend won't start

Check Node.js version:
```bash
node --version  # Should be 16+
npm --version
```

Clear node_modules and reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Port already in use

**Backend (port 8000):**
Edit `backend/main.py` and change the port number in the last line.

**Frontend (port 5173):**
Edit `frontend/vite.config.ts` and add:
```typescript
server: {
  port: 3000,  // or any other port
  // ... rest of config
}
```

### Import fails

- Check your internet connection
- Some DOIs may not be available in free databases
- Try uploading the PDF manually instead

## What's Included

✅ Backend API (FastAPI)
✅ Frontend UI (React + Vite)
✅ PDF viewing (PDF.js)
✅ Import by DOI/URL
✅ PDF upload
✅ Paper organization
✅ Search functionality (backend ready)

## What's Not Included (Yet)

⏳ Highlighting (code ready, needs UI integration)
⏳ Search UI
⏳ Tag management UI
⏳ Keyboard shortcuts
⏳ Read status auto-tracking

These features are specified in Spec.md and can be implemented following the detailed instructions there.

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [Spec.md](Spec.md) for complete feature specifications
- Start importing your research papers!

## Getting Help

- Check the [Troubleshooting Guide](README.md#troubleshooting) in README
- Review the API docs at `http://localhost:8000/docs`
- Check browser console for frontend errors (F12)
