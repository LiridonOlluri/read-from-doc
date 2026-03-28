"""
Simple character-based text chunker with overlap.
Targets ~800 chars per chunk (≈200 tokens) well within Cohere's 512-token embed limit.
"""
from typing import List


CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def chunk_text(text: str, source_name: str, file_id: str) -> List[dict]:
    """
    Split text into overlapping chunks. Returns list of dicts with:
    - text: chunk content
    - metadata: {source, file_id, chunk_index}
    """
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0
    index = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append({
                "text": chunk,
                "metadata": {
                    "source": source_name,
                    "file_id": file_id,
                    "chunk_index": index,
                },
                "id": f"{file_id}_{index}",
            })
            index += 1
        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks
