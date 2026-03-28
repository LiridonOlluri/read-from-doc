"""
Google Drive indexer: lists all files, extracts text, embeds with Cohere,
and stores vectors in ChromaDB.
"""
from __future__ import annotations

import asyncio
import io
import traceback
from typing import List

import chromadb
import cohere
from googleapiclient.http import MediaIoBaseDownload

from utils.chunker import chunk_text
from utils.gdrive_auth import build_drive_service
import services.session_store as store

# File types we can handle
GOOGLE_WORKSPACE_EXPORT = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation": "text/plain",
}

BINARY_SUPPORTED = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/x-markdown",
}

ALL_SUPPORTED_MIMES = set(GOOGLE_WORKSPACE_EXPORT.keys()) | BINARY_SUPPORTED

EMBED_BATCH_SIZE = 96
CHROMA_BATCH_SIZE = 500


def _list_all_files(drive_service) -> List[dict]:
    """Recursively list all supported files from Google Drive."""
    files = []
    page_token = None

    mime_clauses = " or ".join(f"mimeType='{m}'" for m in ALL_SUPPORTED_MIMES)
    query = f"({mime_clauses}) and trashed=false"

    while True:
        resp = drive_service.files().list(
            q=query,
            pageSize=100,
            fields="nextPageToken, files(id, name, mimeType, size)",
            pageToken=page_token,
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
        ).execute()

        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return files


def _download_bytes(drive_service, request) -> bytes:
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue()


def _extract_text(drive_service, file_info: dict) -> str:
    mime = file_info["mimeType"]
    fid = file_info["id"]

    try:
        if mime in GOOGLE_WORKSPACE_EXPORT:
            export_mime = GOOGLE_WORKSPACE_EXPORT[mime]
            req = drive_service.files().export_media(fileId=fid, mimeType=export_mime)
            data = _download_bytes(drive_service, req)
            return data.decode("utf-8", errors="ignore")

        elif mime == "application/pdf":
            req = drive_service.files().get_media(fileId=fid)
            data = _download_bytes(drive_service, req)
            return _pdf_to_text(data)

        elif mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            req = drive_service.files().get_media(fileId=fid)
            data = _download_bytes(drive_service, req)
            return _docx_to_text(data)

        elif mime in ("text/plain", "text/markdown", "text/csv", "text/x-markdown"):
            req = drive_service.files().get_media(fileId=fid)
            data = _download_bytes(drive_service, req)
            return data.decode("utf-8", errors="ignore")

    except Exception:
        traceback.print_exc()

    return ""


def _pdf_to_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""


def _docx_to_text(data: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception:
        return ""


def _embed_batch(co: cohere.ClientV2, texts: List[str]) -> List[List[float]]:
    resp = co.embed(
        texts=texts,
        model="embed-english-v3.0",
        input_type="search_document",
        embedding_types=["float"],
    )
    return resp.embeddings.float_


def run_indexing(session_id: str) -> None:
    """
    Blocking function that runs the full indexing pipeline.
    Called via asyncio.to_thread so it doesn't block the event loop.
    """
    session = store.get(session_id)
    if not session:
        return

    try:
        # Build clients
        drive_service = build_drive_service(session.service_account_json)
        co = cohere.ClientV2(api_key=session.cohere_api_key)

        # ChromaDB – one ephemeral client per session
        chroma_client = chromadb.EphemeralClient()
        collection = chroma_client.get_or_create_collection(
            name=session.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        session.chroma_client = chroma_client

        # Step 1: list files
        session.status = "fetching_files"
        files = _list_all_files(drive_service)
        session.progress.total = len(files)
        session.status = "indexing"

        if not files:
            session.status = "ready"
            return

        # Step 2: process files
        pending_chunks: list[dict] = []  # buffer before chroma batch write

        def flush_chunks():
            if not pending_chunks:
                return
            texts = [c["text"] for c in pending_chunks]
            ids = [c["id"] for c in pending_chunks]
            metas = [c["metadata"] for c in pending_chunks]

            # Embed in sub-batches of 96
            all_embeddings = []
            for i in range(0, len(texts), EMBED_BATCH_SIZE):
                batch = texts[i: i + EMBED_BATCH_SIZE]
                all_embeddings.extend(_embed_batch(co, batch))

            # Write to chroma in sub-batches of 500
            for i in range(0, len(pending_chunks), CHROMA_BATCH_SIZE):
                collection.upsert(
                    documents=texts[i: i + CHROMA_BATCH_SIZE],
                    embeddings=all_embeddings[i: i + CHROMA_BATCH_SIZE],
                    metadatas=metas[i: i + CHROMA_BATCH_SIZE],
                    ids=ids[i: i + CHROMA_BATCH_SIZE],
                )
            pending_chunks.clear()

        for file_info in files:
            session.progress.current_file = file_info["name"]
            text = _extract_text(drive_service, file_info)
            if text.strip():
                chunks = chunk_text(text, file_info["name"], file_info["id"])
                pending_chunks.extend(chunks)

            session.progress.indexed += 1

            # Flush every ~500 chunks to keep memory bounded
            if len(pending_chunks) >= CHROMA_BATCH_SIZE:
                flush_chunks()

        flush_chunks()  # final flush

        session.progress.current_file = None
        session.status = "ready"

    except Exception as exc:
        traceback.print_exc()
        session.status = "error"
        session.error = str(exc)


async def start_indexing(session_id: str) -> None:
    await asyncio.to_thread(run_indexing, session_id)
