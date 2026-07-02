import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

# Shared constants so other modules can connect to the same collection
PERSIST_DIRECTORY = "./chroma_db"
COLLECTION_NAME = "codebase_rag"


def _get_embeddings():
    """Return the embedding model. Using a free local HuggingFace model."""
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


def store_in_chroma(chunks, persist_directory=PERSIST_DIRECTORY, collection_name=COLLECTION_NAME):
    """
    Alias expected by main.py.
    Takes a list of chunk dicts, embeds them, and stores in ChromaDB.

    Args:
        chunks: list of dicts with 'chunk_code' and 'metadata' keys.

    Returns:
        langchain_chroma.Chroma vector store instance.
    """
    if not chunks:
        print("[Phase 3] No chunks to store.")
        return None

    embeddings = _get_embeddings()

    # Convert chunk dicts → LangChain Document objects
    documents = [
        Document(page_content=chunk["chunk_code"], metadata=chunk["metadata"])
        for chunk in chunks
    ]

    import shutil
    if os.path.exists(persist_directory):
        print(f"[Phase 3] Wiping existing vector store at '{persist_directory}' to prevent duplicate chunks...")
        try:
            shutil.rmtree(persist_directory)
        except Exception as e:
            print(f"[Phase 3] Warning: Could not wipe persist_directory: {e}")

    print(f"[Phase 3] Embedding {len(documents)} chunks and storing at '{persist_directory}'...")

    vector_store = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        collection_name=collection_name,
        persist_directory=persist_directory,
    )

    print(f"[Phase 3] Done — {len(documents)} chunks stored in '{collection_name}' collection.")
    return vector_store


def load_vector_store(persist_directory=PERSIST_DIRECTORY, collection_name=COLLECTION_NAME):
    """
    Loads an already-persisted ChromaDB collection from disk.
    Used by Phase 4 (retrieval) without having to re-embed everything.
    """
    embeddings = _get_embeddings()
    return Chroma(
        collection_name=collection_name,
        persist_directory=persist_directory,
        embedding_function=embeddings,
    )


# Keep the original function name for backwards-compatibility with standalone use
store_chunks_in_chroma = store_in_chroma


if __name__ == "__main__":
    mock_chunks = [
        {
            "chunk_code": "def hello_world():\n    print('Hello')\n",
            "metadata": {"type": "function_definition", "name": "hello_world",
                         "start_line": 1, "end_line": 2, "file_path": "example.py"}
        },
        {
            "chunk_code": "class MyClass:\n    pass\n",
            "metadata": {"type": "class_definition", "name": "MyClass",
                         "start_line": 4, "end_line": 5, "file_path": "example.py"}
        }
    ]
    store_in_chroma(mock_chunks)
