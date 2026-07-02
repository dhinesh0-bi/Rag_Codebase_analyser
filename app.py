import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

# Import our RAG pipeline phases
from ingest import clone_github_repo
from ast_parser import extract_code_chunks
from store_embeddings import store_in_chroma
from retrieval import search_and_rerank
from generation import ask_llm

app = FastAPI(
    title="Codebase Companion RAG API",
    description="Backend API for querying GitHub codebases using Tree-sitter, ChromaDB, and Gemini",
    version="1.0.0"
)

# Enable CORS so your React frontend (typically running on http://localhost:5173 or 3000) can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Input/Output Pydantic Models ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    repo_url: str
    question: str

class SourceFile(BaseModel):
    file_path: str
    function_name: str
    start_line: int
    end_line: int
    code: str

class ChatResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceFile]

# ── POST Endpoint ─────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """
    POST endpoint that accepts a GitHub repository URL and a question.
    Runs the entire RAG pipeline and returns the streaming response generated 
    by Gemini along with the cited source code files.
    """
    repo_url_str = str(payload.repo_url)
    question = payload.question

    print(f"\n[API] Received request for repo: {repo_url_str}")
    print(f"[API] Question: {question}")

    # Phase 1: Ingest
    collected_files = clone_github_repo(repo_url_str)
    if not collected_files:
        raise HTTPException(
            status_code=400, 
            detail="Failed to clone repository or no target source files (.py, .js, .ts) were found."
        )

    # Phase 2: Parse
    code_chunks = extract_code_chunks(collected_files)
    if not code_chunks:
        raise HTTPException(
            status_code=400, 
            detail="No functions or classes could be parsed from the codebase."
        )

    # Phase 3: Embed & Store
    try:
        store_in_chroma(code_chunks)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate embeddings or write to vector database: {str(e)}"
        )

    # Phase 4: Retrieve & Rerank
    try:
        top_docs = search_and_rerank(question)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve and rerank code chunks: {str(e)}"
        )

    # Phase 5: Generate (via Gemini)
    # This will stream to the server terminal, and return the complete string here
    try:
        final_answer = ask_llm(question, top_docs)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer from Gemini: {str(e)}"
        )

    # Prepare cited source objects
    sources = []
    for doc in top_docs:
        meta = doc.metadata
        sources.append(
            SourceFile(
                file_path=meta.get("file_path", "unknown"),
                function_name=meta.get("name", "unknown"),
                start_line=meta.get("start_line", 0),
                end_line=meta.get("end_line", 0),
                code=doc.page_content
            )
        )

    return ChatResponse(
        question=question,
        answer=final_answer,
        sources=sources
    )

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    has_api_key = "GEMINI_API_KEY" in os.environ
    return {
        "status": "healthy",
        "gemini_api_key_configured": has_api_key
    }

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
