import asyncio
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import services.session_store as store
from models import (
    SetupRequest,
    SetupResponse,
    StatusResponse,
    ProgressInfo,
    ChatRequest,
    ChatResponse,
)
from services.drive_indexer import start_indexing
from services.rag_pipeline import query as rag_query


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Background cleanup task
    task = asyncio.create_task(store.periodic_cleanup())
    yield
    task.cancel()


app = FastAPI(title="Google Drive RAG Chat", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Session endpoints ──────────────────────────────────────────────────────────

@app.post("/api/session/init", response_model=SetupResponse)
async def init_session(request: SetupRequest):
    session_id = str(uuid.uuid4())
    store.create(
        session_id=session_id,
        cohere_api_key=request.cohere_api_key,
        service_account_json=request.service_account_json,
    )
    # Kick off indexing in background without blocking
    asyncio.create_task(start_indexing(session_id))
    return SetupResponse(session_id=session_id, status="indexing")


@app.get("/api/session/{session_id}/status", response_model=StatusResponse)
async def session_status(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return StatusResponse(
        status=session.status,
        progress=ProgressInfo(
            total=session.progress.total,
            indexed=session.progress.indexed,
            current_file=session.progress.current_file,
        ),
        error=session.error,
    )


@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    store.delete(session_id)
    return {"ok": True}


# ── Chat endpoint ──────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session = store.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "error":
        raise HTTPException(status_code=400, detail=f"Session error: {session.error}")
    if session.status != "ready":
        raise HTTPException(status_code=400, detail="Documents are still being indexed. Please wait.")

    try:
        result = await asyncio.to_thread(rag_query, request.session_id, request.message, request.history)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/")
async def root():
    return {"message": "Drive RAG Chat API. Frontend runs on port 3000."}
