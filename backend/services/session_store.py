"""
In-memory session store. All background tasks and routers share this module-level dict.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Literal
import chromadb


@dataclass
class ProgressInfo:
    total: int = 0
    indexed: int = 0
    current_file: Optional[str] = None


@dataclass
class Session:
    session_id: str
    cohere_api_key: str
    service_account_json: str
    status: Literal["indexing", "ready", "error", "fetching_files"] = "indexing"
    progress: ProgressInfo = field(default_factory=ProgressInfo)
    error: Optional[str] = None
    chroma_client: Optional[chromadb.EphemeralClient] = None
    collection_name: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)


_sessions: dict[str, Session] = {}


def create(session_id: str, cohere_api_key: str, service_account_json: str) -> Session:
    session = Session(
        session_id=session_id,
        cohere_api_key=cohere_api_key,
        service_account_json=service_account_json,
        collection_name=f"docs_{session_id[:12]}",
    )
    _sessions[session_id] = session
    return session


def get(session_id: str) -> Optional[Session]:
    return _sessions.get(session_id)


def delete(session_id: str) -> None:
    session = _sessions.pop(session_id, None)
    if session and session.chroma_client:
        try:
            session.chroma_client.delete_collection(session.collection_name)
        except Exception:
            pass


def cleanup_old_sessions(max_age_hours: int = 24) -> None:
    cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
    stale = [sid for sid, s in _sessions.items() if s.created_at < cutoff]
    for sid in stale:
        delete(sid)


async def periodic_cleanup() -> None:
    while True:
        await asyncio.sleep(3600)  # every hour
        cleanup_old_sessions()
