"""
RAG query pipeline: embed query → vector search → rerank → Cohere chat.
"""
from __future__ import annotations

from typing import List

import cohere

from . import session_store as store
from ..models import ChatMessage, ChatResponse, SourceInfo

TOP_K_RETRIEVE = 20
TOP_N_RERANK = 10


def query(session_id: str, message: str, history: List[ChatMessage]) -> ChatResponse:
    session = store.get(session_id)
    if not session:
        raise ValueError("Session not found")
    if session.status != "ready":
        raise ValueError(f"Session not ready (status={session.status})")

    co = cohere.ClientV2(api_key=session.cohere_api_key)
    collection = session.chroma_client.get_collection(session.collection_name)

    doc_count = collection.count()
    if doc_count == 0:
        return ChatResponse(
            answer="No documents were indexed from your Google Drive. Make sure the service account has access to files.",
            sources=[],
        )

    # 1. Embed the query
    embed_resp = co.embed(
        texts=[message],
        model="embed-english-v3.0",
        input_type="search_query",
        embedding_types=["float"],
    )
    query_vector = embed_resp.embeddings.float_[0]

    # 2. Vector search
    n_results = min(TOP_K_RETRIEVE, doc_count)
    search_results = collection.query(
        query_embeddings=[query_vector],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    raw_docs = search_results["documents"][0]
    raw_metas = search_results["metadatas"][0]

    if not raw_docs:
        return ChatResponse(
            answer="I couldn't find any relevant content in your documents for that question.",
            sources=[],
        )

    # 3. Rerank
    rerank_resp = co.rerank(
        query=message,
        documents=raw_docs,
        model="rerank-english-v3.0",
        top_n=min(TOP_N_RERANK, len(raw_docs)),
    )

    top_docs: List[str] = []
    top_metas: List[dict] = []
    for r in rerank_resp.results:
        top_docs.append(raw_docs[r.index])
        top_metas.append(raw_metas[r.index])

    # 4. Build Cohere documents list for grounded chat
    cohere_docs = [
        {"id": f"doc_{i}", "data": {"title": m["source"], "text": d}}
        for i, (d, m) in enumerate(zip(top_docs, top_metas))
    ]

    # 5. Build message list
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that answers questions based on the user's "
                "Google Drive documents provided below. "
                "ALWAYS use the content from the documents to answer — even if they contain "
                "code snippets, links, or partial information, extract and explain what is there. "
                "Summarize, list, explain or describe what you find in the documents. "
                "Never say you cannot find information if documents are provided — instead, "
                "work with whatever content is available and give the most useful answer possible. "
                "Cite the document file name when referencing specific content."
            ),
        }
    ]
    for h in history[-10:]:  # keep last 10 turns
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    # 6. Chat
    chat_resp = co.chat(
        model="command-r-plus-08-2024",
        messages=messages,
        documents=cohere_docs,
    )

    answer = chat_resp.message.content[0].text

    # 7. Build source citations (deduplicated by file)
    seen_files: set[str] = set()
    sources: List[SourceInfo] = []
    for doc, meta in zip(top_docs, top_metas):
        fname = meta["source"]
        fid = meta["file_id"]
        if fname not in seen_files:
            seen_files.add(fname)
            snippet = doc[:200].replace("\n", " ") + ("…" if len(doc) > 200 else "")
            sources.append(SourceInfo(file_name=fname, file_id=fid, snippet=snippet))

    return ChatResponse(answer=answer, sources=sources)
