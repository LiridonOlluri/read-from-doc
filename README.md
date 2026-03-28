# Drive RAG Chat

A web app that reads all your Google Drive files and lets you chat with them using Cohere's RAG pipeline.

## Stack

- **Backend**: FastAPI (Python) — Google Drive API, Cohere embeddings + reranking + chat, ChromaDB
- **Frontend**: Next.js 15 (TypeScript) with App Router
- **AI**: Cohere `embed-english-v3.0` → `rerank-english-v3.0` → `command-r-plus`
- **Vector DB**: ChromaDB (in-memory, per session)

## Supported File Types

| Format | How it's extracted |
|---|---|
| Google Docs | Drive export API → plain text |
| Google Sheets | Drive export API → CSV |
| Google Slides | Drive export API → plain text |
| PDF | `pypdf` |
| DOCX | `python-docx` |
| TXT / Markdown / CSV | Raw UTF-8 read |

## Setup

### 1. Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com) → Create project
2. Enable **Google Drive API**
3. Create a **Service Account** and download the JSON key
4. Share your Drive files/folders with the service account email
   (or use a Shared Drive and add the service account as a member)

### 2. Cohere API Key

Get your key from [dashboard.cohere.com](https://dashboard.cohere.com).

### 3. Run the Backend

```bash
cd /path/to/read-from-doc
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Run the Frontend

```bash
cd frontend
npm install
npm run dev      # → http://localhost:3000
```

### 5. Open the App

Visit **http://localhost:3000**, paste your service account JSON and Cohere key, then click **Connect & Index Drive**.

## How It Works

```
User query
    │
    ▼
Cohere embed (search_query)
    │
    ▼
ChromaDB vector search (top 20)
    │
    ▼
Cohere rerank (top 5)
    │
    ▼
Cohere Command R+ chat (grounded answer + citations)
    │
    ▼
Response shown with source file chips
```

## Environment Variables (optional)

```bash
# frontend/.env.local
BACKEND_URL=http://localhost:8000   # default
```

## Production Deployment

For production, build the Next.js app:

```bash
cd frontend && npm run build && npm start
```

And run FastAPI with multiple workers:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
