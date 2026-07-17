"""
app.py — Production FastAPI Backend
=====================================
Phase 6: Full production server with:
  - Firebase Authentication (ID token verification on every request)
  - Per-user rate limiting via slowapi (5 requests/day per user)
  - Server-Sent Events (SSE) for real-time token streaming
  - CORS configured for frontend
  - Async execution of CPU-bound pipeline phases
  - /health, /chat, /stream, /rate-limit endpoints
"""

import os
import asyncio
import json
import functools
from typing import AsyncGenerator

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth
    import base64, json as _json, tempfile

    _firebase_configured = False
    _service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
    _service_account_b64  = os.environ.get("FIREBASE_SERVICE_ACCOUNT_B64", "")

    # Prefer local file, fall back to base64 env variable (for Railway/Render)
    if os.path.exists(_service_account_path):
        cred = credentials.Certificate(_service_account_path)
    elif _service_account_b64:
        # Add padding if needed — Render/Railway can strip trailing '=' from env vars
        _padded = _service_account_b64.strip() + "==="
        _sa_json = _json.loads(base64.b64decode(_padded).decode("utf-8"))
        cred = credentials.Certificate(_sa_json)
    else:
        cred = None

    if cred:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        _firebase_configured = True
        print("[Auth] Firebase Admin SDK initialized successfully.")
    else:
        print("[Auth] WARNING: No Firebase credentials found. Auth is DISABLED (dev mode).")

except ImportError:
    _firebase_configured = False
    print("[Auth] firebase-admin not installed. Auth is DISABLED.")

# RAG pipeline modules
from ingest import clone_github_repo
from ast_parser import extract_code_chunks
from store_embeddings import store_in_chroma
from retrieval import search_and_rerank
from generation import ask_llm, build_user_prompt, SYSTEM_PROMPT

# ── Rate Limiter Setup ────────────────────────────────────────────────────────

# The key function uses Firebase UID if auth is enabled, else falls back to IP
def get_user_identifier(request: Request) -> str:
    """Extract Firebase UID from request state, fallback to IP."""
    uid = getattr(request.state, "uid", None)
    return uid if uid else get_remote_address(request)

limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=["500/day"],  # Increased from 5 to 500 for testing
    storage_uri=os.environ.get("REDIS_URL", "memory://"),  # Upstash Redis URL or in-memory
)

# ── FastAPI App Setup ─────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

app = FastAPI(
    title="Codebase Companion RAG API",
    description="Production RAG backend with Firebase auth, rate limiting, and SSE streaming",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda req, exc: JSONResponse(
    status_code=429,
    content={
        "error": "Rate limit exceeded",
        "detail": f"You have reached your daily limit of 5 requests. Please try again tomorrow.",
        "retry_after": "24 hours",
    }
))
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── Firebase Auth Middleware ──────────────────────────────────────────────────

@app.middleware("http")
async def firebase_auth_middleware(request: Request, call_next):
    """
    Validates the Firebase ID token on every protected request.
    Attaches the decoded uid to request.state.uid for downstream use.
    If Firebase is not configured, skips auth entirely (dev mode).
    """
    # Skip auth for public endpoints
    public_paths = {"/", "/health", "/docs", "/redoc", "/openapi.json"}
    if request.url.path in public_paths or request.method == "OPTIONS":
        return await call_next(request)

    if not _firebase_configured:
        # Dev mode: accept any request, set a dummy uid
        request.state.uid = "dev-user"
        request.state.email = "dev@localhost"
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"error": "Missing or invalid Authorization header. Expected: Bearer <firebase_id_token>"}
        )

    id_token = auth_header.split("Bearer ")[-1].strip()
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        request.state.uid = decoded["uid"]
        request.state.email = decoded.get("email", "unknown")
    except Exception as e:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid or expired Firebase ID token.", "detail": str(e)}
        )

    return await call_next(request)


# ── Pydantic Models ───────────────────────────────────────────────────────────

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
    user_uid: str


# ── Pipeline Execution (Thread Pool for CPU-bound ops) ────────────────────────

async def run_pipeline(repo_url: str, question: str) -> tuple[str, list]:
    """
    Runs Phases 1-4 of the RAG pipeline in a thread pool executor
    to avoid blocking the async event loop.
    Returns (full_answer, top_docs).
    """
    loop = asyncio.get_event_loop()
    
    # Phase 1: Ingest (I/O bound - git clone)
    collected_files = await loop.run_in_executor(
        None, functools.partial(clone_github_repo, repo_url)
    )
    if not collected_files:
        raise HTTPException(400, detail="Failed to clone repo or no .py/.js/.ts files found.")

    # Phase 2: AST Parse (CPU bound)
    code_chunks = await loop.run_in_executor(
        None, functools.partial(extract_code_chunks, collected_files)
    )
    if not code_chunks:
        raise HTTPException(400, detail="No parseable functions or classes found in the repository.")

    # Phase 3: Embed & Store (CPU bound - HuggingFace model)
    await loop.run_in_executor(None, functools.partial(store_in_chroma, code_chunks))

    # Phase 4: Retrieve & Rerank (CPU bound - CrossEncoder)
    top_docs = await loop.run_in_executor(
        None, functools.partial(search_and_rerank, question)
    )
    
    return top_docs


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "Codebase Companion RAG API v2.0", "docs": "/docs"}


@app.get("/health")
async def health_check(request: Request):
    """Public health check. Reports auth and env status."""
    return {
        "status": "healthy",
        "firebase_configured": _firebase_configured,
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY")),
        "rate_limit": "5 requests/user/day",
        "version": "2.0.0",
    }


@app.get("/rate-limit")
async def get_rate_limit_status(request: Request):
    """Returns the current user's rate limit usage."""
    uid = getattr(request.state, "uid", "unknown")
    return {
        "uid": uid,
        "limit": 5,
        "period": "day",
        "note": "Use the X-RateLimit-* headers on POST /chat responses for real-time tracking."
    }


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("500/day")
async def chat(payload: ChatRequest, request: Request):
    """
    Protected, rate-limited endpoint.
    Runs the full RAG pipeline and returns the complete answer + source citations.
    Requires: Authorization: Bearer <firebase_id_token>
    """
    uid = getattr(request.state, "uid", "anonymous")
    print(f"\n[API] User: {uid} | Repo: {payload.repo_url} | Q: {payload.question}")

    top_docs = await run_pipeline(payload.repo_url, payload.question)

    # Phase 5: Generate (calls Gemini, CPU/network bound)
    loop = asyncio.get_event_loop()
    answer = await loop.run_in_executor(
        None, functools.partial(ask_llm, payload.question, top_docs)
    )

    sources = [
        SourceFile(
            file_path=doc.metadata.get("file_path", "unknown"),
            function_name=doc.metadata.get("name", "unknown"),
            start_line=doc.metadata.get("start_line", 0),
            end_line=doc.metadata.get("end_line", 0),
            code=doc.page_content,
        )
        for doc in top_docs
    ]

    return ChatResponse(question=payload.question, answer=answer, sources=sources, user_uid=uid)


@app.post("/stream")
@limiter.limit("500/day")
async def stream_chat(payload: ChatRequest, request: Request):
    """
    Protected, rate-limited SSE streaming endpoint.
    Streams Gemini tokens to the frontend in real time.
    Frontend connects via EventSource and receives:
      - data: {"type": "source", "data": {...}}   (sent first, for each source)
      - data: {"type": "token", "data": "word "}  (streamed per Gemini token)
      - data: {"type": "done"}                     (signals stream completion)
      - data: {"type": "error", "data": "msg"}     (on failure)
    """
    uid = getattr(request.state, "uid", "anonymous")
    print(f"\n[STREAM] User: {uid} | Repo: {payload.repo_url}")

    async def event_generator() -> AsyncGenerator[dict, None]:
        try:
            # Run Phases 1-4
            top_docs = await run_pipeline(payload.repo_url, payload.question)

            # Emit source citations first
            for i, doc in enumerate(top_docs):
                meta = doc.metadata
                source_data = {
                    "type": "source",
                    "data": {
                        "index": i + 1,
                        "file_path": meta.get("file_path", "unknown"),
                        "function_name": meta.get("name", "unknown"),
                        "start_line": meta.get("start_line", 0),
                        "end_line": meta.get("end_line", 0),
                        "code": doc.page_content,
                    }
                }
                yield {"data": json.dumps(source_data)}
                await asyncio.sleep(0)  # yield control to event loop

            # Stream Gemini tokens
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                # Fallback: emit the context prompt as plain text
                fallback = build_user_prompt(payload.question, top_docs)
                for word in fallback.split(" "):
                    yield {"data": json.dumps({"type": "token", "data": word + " "})}
                    await asyncio.sleep(0.02)
            else:
                from google import genai
                from google.genai import types as genai_types
                import queue
                import threading

                client = genai.Client(api_key=api_key)
                user_prompt = build_user_prompt(payload.question, top_docs)

                q = queue.Queue()

                def _stream_worker():
                    try:
                        stream = client.models.generate_content_stream(
                            model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
                            contents=user_prompt,
                            config=genai_types.GenerateContentConfig(
                                system_instruction=SYSTEM_PROMPT,
                                temperature=0.1,
                                max_output_tokens=2048,
                            ),
                        )
                        for chunk in stream:
                            if chunk.text:
                                q.put(chunk.text)
                    except Exception as e:
                        q.put(e)
                    finally:
                        q.put(None)

                # Start streaming in a daemon thread
                threading.Thread(target=_stream_worker, daemon=True).start()

                # Read from the queue asynchronously
                while True:
                    try:
                        val = q.get_nowait()
                    except queue.Empty:
                        await asyncio.sleep(0.05)
                        continue

                    if val is None:
                        break
                    if isinstance(val, Exception):
                        raise val

                    yield {"data": json.dumps({"type": "token", "data": val})}
                    await asyncio.sleep(0)

            yield {"data": json.dumps({"type": "done"})}

        except HTTPException as e:
            import traceback
            traceback.print_exc()
            yield {"data": json.dumps({"type": "error", "data": e.detail})}
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield {"data": json.dumps({"type": "error", "data": str(e)})}

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        workers=1,   # Changed to 1 for Windows stability in dev mode
        reload=os.environ.get("ENV", "production") == "development",
        log_level="info",
    )
