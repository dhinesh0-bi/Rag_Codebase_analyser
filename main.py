from ingest import clone_github_repo
from ast_parser import extract_code_chunks
from vector_store import store_in_chroma
from retrieval import search_and_rerank
from generation import ask_llm


def main():
    repo_url = "https://github.com/dhinesh0-bi/Ai-Fake-review-detection-system"
    user_question = "How does the system analyze and classify a review as fake or real?"

    print("=" * 50)
    print("   Codebase Companion RAG — Full Pipeline")
    print("=" * 50)

    # Phase 1: Ingest — clone repo and read all .py/.js/.ts files
    print("\n[Phase 1] Ingesting repository...")
    collected_files = clone_github_repo(repo_url)
    if not collected_files:
        print("No files collected. Exiting.")
        return

    # Phase 2: Parse — extract function/class chunks via Tree-sitter AST
    print("\n[Phase 2] Parsing code with Tree-sitter...")
    code_chunks = extract_code_chunks(collected_files)
    print(f"   -> Extracted {len(code_chunks)} chunks.")
    if not code_chunks:
        print("No chunks extracted. Exiting.")
        return

    # Phase 3: Embed & Store — generate embeddings and persist in ChromaDB
    print("\n[Phase 3] Generating embeddings and storing in ChromaDB...")
    store_in_chroma(code_chunks)

    # Phase 4: Retrieve — semantic search over the vector store
    print(f"\n[Phase 4] Searching for answer to: '{user_question}'")
    top_chunks = search_and_rerank(user_question)

    # Phase 5: Generate — build final answer with an LLM
    print("\n[Phase 5] Generating final answer...")
    final_answer = ask_llm(user_question, top_chunks)

    print("\n" + "=" * 50)
    print("   FINAL ANSWER")
    print("=" * 50)
    print(final_answer)


if __name__ == "__main__":
    main()
