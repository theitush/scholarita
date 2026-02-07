#!/bin/bash

echo "Setting up Scholarita..."

# Create library directory structure
echo "Creating library directories..."
mkdir -p library/papers

# Check if config.json exists
if [ ! -f library/config.json ]; then
    echo "Creating default config.json..."
    cat > library/config.json << 'EOF'
{
  "scihub_domain": "sci-hub.se",
  "library_path": "./papers",
  "highlight_colors": ["yellow", "green", "red", "blue"],
  "default_highlight_color": "yellow",
  "remember_last_color": true
}
EOF
fi

# Setup backend
echo "Setting up backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment and installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt

cd ..

# Setup frontend
echo "Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To run the application:"
echo ""
echo "1. Start the backend (in one terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python main.py"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:5173 in your browser"
