"""
vector_store.py  — thin re-export shim.

main.py does `from vector_store import store_in_chroma`.
All real logic lives in store_embeddings.py; this file just re-exports it
so both import paths work without duplicating code.
"""
from store_embeddings import store_in_chroma, load_vector_store  # noqa: F401
