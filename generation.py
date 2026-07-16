"""
generation.py — Phase 5: Prompt Augmentation & Streaming Gemini Generation

Takes the top-N reranked code chunks from Phase 4, builds a carefully
engineered prompt, and streams the Gemini response token-by-token to
the terminal so the user sees the answer in real time.

Model options (set via 'model' parameter in ask_llm):
  - gemini-2.0-flash          ← default: fast, cheap, great quality
  - gemini-2.0-flash-thinking ← shows reasoning steps
  - gemini-1.5-pro            ← highest quality, larger context window

Setup:
  1. Get a free API key at https://aistudio.google.com/app/apikey
  2. Set env variable:  $env:GEMINI_API_KEY='your-key-here'
"""

import os
from google import genai
from google.genai import types

# ── Prompt Engineering ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert software engineer and code reviewer.
Your job is to answer the developer's question using ONLY the code snippets provided below.

Rules you MUST follow:
1. Base your answer EXCLUSIVELY on the provided code snippets. Do not invent information.
2. Always cite which file and function your answer comes from, e.g. (source: views.py -> analyze_review).
3. If the provided snippets do not contain enough information to fully answer the question, say so clearly.
4. Format your answer with clear sections: a direct answer first, then a detailed explanation.
5. When quoting specific lines of code, use markdown code blocks."""


def build_user_prompt(question: str, retrieved_docs: list) -> str:
    """
    Public function - constructs the user-facing part of the prompt by injecting
    retrieved code chunks with their full metadata. Called by both generation.py
    (for CLI use) and app.py (for SSE streaming to the frontend).

    The exact prompt string looks like this:

    --- RETRIEVED CODE CONTEXT ---

    [Chunk 1 of 3]
    File     : backend/api/views.py
    Function : analyze_review
    Lines    : 33 - 93
    ---
    def analyze_review(request):
        ...full source code...

    [Chunk 2 of 3]
    ...

    --- END OF CONTEXT ---

    DEVELOPER QUESTION:
    How does the system analyze and classify a review as fake or real?
    """
    context_lines = ["--- RETRIEVED CODE CONTEXT ---\n"]

    for i, doc in enumerate(retrieved_docs, start=1):
        meta      = doc.metadata
        file_path = meta.get("file_path", "unknown")
        name      = meta.get("name", "unknown")
        start     = meta.get("start_line", "?")
        end       = meta.get("end_line", "?")

        context_lines.append(f"[Chunk {i} of {len(retrieved_docs)}]")
        context_lines.append(f"File     : {file_path}")
        context_lines.append(f"Function : {name}")
        context_lines.append(f"Lines    : {start} - {end}")
        context_lines.append("---")
        context_lines.append(doc.page_content)
        context_lines.append("")  # blank line between chunks

    context_lines.append("--- END OF CONTEXT ---\n")
    context_lines.append(f"DEVELOPER QUESTION:\n{question}")

    return "\n".join(context_lines)


# ── Streaming Gemini Call ─────────────────────────────────────────────────────

def _stream_gemini(question: str, retrieved_docs: list, model: str) -> str:
    """
    Calls the Gemini API with streaming enabled.
    Prints each token chunk to the terminal as it arrives.
    Returns the full assembled response string.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    client  = genai.Client(api_key=api_key)

    user_prompt = build_user_prompt(question, retrieved_docs)

    print(f"\n[Phase 5] Streaming answer from {model}...")
    print("-" * 60)

    full_response = ""

    # generate_content_stream sends tokens as they are generated
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.1,   # low temp = factual, grounded answers, no hallucination
            max_output_tokens=2048,
        ),
    ):
        if chunk.text:
            print(chunk.text, end="", flush=True)
            full_response += chunk.text

    print("\n" + "-" * 60)
    return full_response


def _fallback_no_key(question: str, retrieved_docs: list) -> str:
    """
    Graceful degradation when no Gemini key is available.
    Prints the exact formatted prompt that would have been sent (safely encoded),
    plus the raw retrieved chunks.
    """
    user_prompt = build_user_prompt(question, retrieved_docs)

    print("\n" + "-" * 60)
    print("WARNING: GEMINI_API_KEY not set - showing retrieved context only.")
    print("   Get a free key at: https://aistudio.google.com/app/apikey")
    print("   Then set it with:  $env:GEMINI_API_KEY='your-key-here'")
    print("-" * 60)
    
    # Safe printing using ASCII replacement to avoid Windows console charmap exceptions
    try:
        print("\n[SYSTEM PROMPT THAT WOULD BE SENT]\n")
        print(SYSTEM_PROMPT.encode('ascii', errors='replace').decode('ascii'))
        print("\n[USER PROMPT THAT WOULD BE SENT]\n")
        print(user_prompt.encode('ascii', errors='replace').decode('ascii'))
        print("-" * 60)
    except Exception:
        pass

    return user_prompt


# ── Public API (called by main.py) ────────────────────────────────────────────

def ask_llm(
    question: str,
    retrieved_docs: list,
    model: str = "gemini-2.5-flash",  # best free-tier quota; try "gemini-2.5-flash" with billing
) -> str:
    """
    Phase 5 entry point.

    Args:
        question       : The user's natural language question.
        retrieved_docs : Top-N LangChain Document objects from Phase 4.
        model          : Gemini model ID to use.

    Returns:
        str: The LLM's full streamed answer (or the formatted prompt if no key is set).
    """
    if not retrieved_docs:
        return "No relevant code chunks were retrieved. Try re-running the ingestion pipeline."

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return _fallback_no_key(question, retrieved_docs)

    print(f"\n[Phase 5] Calling {model} with {len(retrieved_docs)} code chunks as context...")
    return _stream_gemini(question, retrieved_docs, model)


# ── Standalone test ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    from langchain_core.documents import Document

    # Mock retrieved docs to test prompt formatting without running the full pipeline
    mock_docs = [
        Document(
            page_content=(
                "def analyze_review(request):\n"
                "    prob = model.predict_proba(vec_final)[0][1]\n"
                "    is_fake = bool(prob > 0.5)\n"
                "    return JsonResponse({'is_fake': is_fake, 'confidence': round(prob * 100, 2)})"
            ),
            metadata={
                "file_path": "backend/api/views.py",
                "name": "analyze_review",
                "start_line": 33,
                "end_line": 93,
            },
        ),
        Document(
            page_content=(
                "def clean_text(text):\n"
                "    text = re.sub(r'[^\\w\\s]', '', text.lower())\n"
                "    return text"
            ),
            metadata={
                "file_path": "backend/api/views.py",
                "name": "clean_text",
                "start_line": 28,
                "end_line": 30,
            },
        ),
    ]

    test_question = "How does the system classify a review as fake or real?"
    answer = ask_llm(test_question, mock_docs)
    print("\n\nFull answer:\n", answer)
