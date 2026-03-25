# ─── SmartChat X — Development Commands ─────────────

.PHONY: install dev build start-backend start-frontend start-all test clean

# Install all dependencies
install:
	cd frontend && npm install
	cd backend && pip install -r requirements.txt

# Start frontend dev server
start-frontend:
	cd frontend && npm run dev

# Start backend server
start-backend:
	cd backend && python main.py

# Start all servers (TCP + UDP + WS Bridge + Backend)
start-all:
	python run_all.py

# Run tests
test:
	cd backend && pytest tests/ -v
	cd frontend && npm test

# Build frontend for production
build:
	cd frontend && npm run build

# Clean generated files
clean:
	rm -rf frontend/dist frontend/node_modules
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
