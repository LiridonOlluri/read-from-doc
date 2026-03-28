# Quick Start Guide

## 1. Install Dependencies

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## 2. Get Credentials

### Google Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Drive API**
4. Create a **Service Account**
5. Download the JSON key
6. Share your Drive files with the service account email (or add to Shared Drive)

### Cohere API Key
Get from [dashboard.cohere.com](https://dashboard.cohere.com)

## 3. Run the App

### Terminal 1 - Backend
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## 4. Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## 5. Using the App
1. Paste your Google Service Account JSON
2. Paste your Cohere API key
3. Click "Connect & Index Drive"
4. Wait for indexing to complete
5. Start asking questions!

## Troubleshooting

### "Permission denied" errors
- Make sure the service account email has access to your Drive files
- Check that you're using read-only scope (no write permissions needed)

### "No documents indexed"
- Verify files are shared with the service account
- Check file types are supported (Docs, Sheets, Slides, PDF, DOCX, TXT, etc.)

### API connection errors
- Check both services are running
- Verify `BACKEND_URL=http://localhost:8000` in frontend
- Check browser console for network errors
