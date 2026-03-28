from pydantic import BaseModel
from typing import Optional, List, Literal


class SetupRequest(BaseModel):
    service_account_json: str  # raw JSON string of the service account key
    cohere_api_key: str


class SetupResponse(BaseModel):
    session_id: str
    status: str


class ProgressInfo(BaseModel):
    total: int
    indexed: int
    current_file: Optional[str] = None


class StatusResponse(BaseModel):
    status: Literal["indexing", "ready", "error", "fetching_files"]
    progress: ProgressInfo
    error: Optional[str] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: List[ChatMessage] = []


class SourceInfo(BaseModel):
    file_name: str
    file_id: str
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceInfo] = []
