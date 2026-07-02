"""
retrieval.py — Phase 4: Two-Stage Retrieval + Cross-Encoder Reranking

Stage 1 — Bi-Encoder (ChromaDB):
    Converts the query into an embedding vector and does a fast Approximate
    Nearest Neighbour (ANN) search over all stored chunks.  Returns top-k
    candidates (default: 10).  Fast but imprecise — the bi-encoder was
    trained for broad semantic similarity, not fine-grained relevance ranking.

Stage 2 — Cross-Encoder (Reranker):
    Takes every (query, candidate) pair and scores them together in a single
    forward pass.  Because the model sees both texts simultaneously it can
    detect subtle relevance signals (e.g. a function whose *body* answers the
    query even though its *name* doesn't look related).  Returns only the
    top-n best chunks (default: 3).
"""

from sentence_transformers import CrossEncoder
from store_embeddings import load_vector_store

# ── Constants ────────────────────────────────────────────────────────────────

# How many candidates to pull from ChromaDB in Stage 1
CANDIDATE_K = 10

# How many final chunks to return after reranking in Stage 2
FINAL_TOP_N = 3

# Lightweight but strong cross-encoder trained on MS-MARCO passage ranking.
# ~66 MB download on first use, then cached locally.
CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


# ── Stage 1: Bi-Encoder Retrieval ────────────────────────────────────────────

def retrieve_candidates(query: str, top_k: int = CANDIDATE_K) -> list:
    """
    Embeds the query with the same HuggingFace bi-encoder used at ingestion
    time, then asks ChromaDB to return the 'top_k' most similar code chunks.

    Returns:
        list[langchain_core.documents.Document]
    """
    vector_store = load_vector_store()
    candidates = vector_store.similarity_search(query, k=top_k)

    print(f"\n[Phase 4 — Stage 1] Retrieved {len(candidates)} candidates from ChromaDB:")
    for i, doc in enumerate(candidates):
        meta = doc.metadata
        print(
            f"  [{i+1:2d}] {meta.get('name', 'unknown'):<30s} "
            f"({meta.get('file_path', '?')}, "
            f"lines {meta.get('start_line')}–{meta.get('end_line')})"
        )

    return candidates


# ── Stage 2: Cross-Encoder Reranking ─────────────────────────────────────────

def rerank(query: str, candidates: list, top_n: int = FINAL_TOP_N) -> list:
    """
    Scores every (query, candidate_code) pair with a Cross-Encoder and
    returns the top_n chunks sorted by descending relevance score.

    Args:
        query      : The original user question string.
        candidates : List of LangChain Document objects from Stage 1.
        top_n      : How many chunks to keep after reranking.

    Returns:
        list of dicts, each with:
            - 'document' : the LangChain Document
            - 'score'    : the cross-encoder relevance score (higher = better)
    """
    print(f"\n[Phase 4 — Stage 2] Reranking {len(candidates)} candidates with CrossEncoder...")
    model = CrossEncoder(CROSS_ENCODER_MODEL)

    # Build (query, passage) pairs — the cross-encoder scores each pair jointly
    pairs = [(query, doc.page_content) for doc in candidates]
    scores = model.predict(pairs)  # returns a numpy array of float scores

    # Zip scores with their documents and sort descending
    scored = sorted(
        zip(scores, candidates),
        key=lambda x: x[0],
        reverse=True
    )

    results = [{"document": doc, "score": float(score)} for score, doc in scored[:top_n]]

    print(f"[Phase 4 — Stage 2] Top {top_n} chunks after reranking:")
    for i, item in enumerate(results):
        meta = item["document"].metadata
        print(
            f"  [{i+1}] score={item['score']:+.4f}  "
            f"{meta.get('name', 'unknown'):<30s} "
            f"({meta.get('file_path', '?')}, "
            f"lines {meta.get('start_line')}–{meta.get('end_line')})"
        )

    return results


# ── Public API (called by main.py) ────────────────────────────────────────────

def search_and_rerank(query: str, top_k: int = CANDIDATE_K, top_n: int = FINAL_TOP_N) -> list:
    """
    Full two-stage pipeline:
        1. Bi-encoder retrieval  → top_k candidates
        2. Cross-encoder rerank  → top_n final results

    Args:
        query  : Natural language question from the user.
        top_k  : Candidates to retrieve from ChromaDB (Stage 1).
        top_n  : Final chunks to keep after reranking   (Stage 2).

    Returns:
        list of LangChain Document objects (top_n, best-first).
    """
    print(f"\n[Phase 4] Query: '{query}'")

    # Stage 1 — fast vector search
    candidates = retrieve_candidates(query, top_k=top_k)

    if not candidates:
        print("[Phase 4] No candidates found in ChromaDB. Run the ingestion pipeline first.")
        return []

    # Stage 2 — precise cross-encoder reranking
    reranked = rerank(query, candidates, top_n=top_n)

    # Return only the Document objects so main.py / generation.py stay simple
    return [item["document"] for item in reranked]


# ── Standalone test ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_query = "Where is database authentication handled?"
    results = search_and_rerank(test_query)

    print("\n" + "=" * 60)
    print("FINAL RERANKED CHUNKS")
    print("=" * 60)
    for i, doc in enumerate(results):
        meta = doc.metadata
        print(f"\n--- Result {i+1}: {meta.get('name')} ---")
        print(f"File : {meta.get('file_path')}")
        print(f"Lines: {meta.get('start_line')} → {meta.get('end_line')}")
        print(f"Code :\n{doc.page_content}")
