# Codebase Companion RAG 🛡️

An advanced, syntax-aware Retrieval-Augmented Generation (RAG) backend engine designed to ingest public GitHub repositories, perform structural code chunking using Tree-sitter AST parsing, index code snippets in a local vector database, and provide highly-cited code explanations using Gemini.

---

## 🏗️ Architecture Overview

The system processes source code repositories using a highly precise **5-Phase Pipeline**:

```
GitHub Repo
    │
    ▼ (Phase 1: Ingest via GitPython)
Temporary Directory (py, js, ts files extracted)
    │
    ▼ (Phase 2: Tree-sitter AST Parse)
Syntax-Aware Code Chunks (functions & classes isolated)
    │
    ▼ (Phase 3: Embed & Store)
Local ChromaDB Vector Store (via HuggingFace all-MiniLM-L6-v2)
    │
    ▼ (Phase 4: Two-Stage Search)
Stage 1: Bi-Encoder (ANN vector search -> Top 10 candidate chunks)
Stage 2: Cross-Encoder (SentenceTransformers Reranker -> Top 3 final chunks)
    │
    ▼ (Phase 5: Augment & Generate)
Gemini 1.5 Flash (Factual streaming answers with file and function citations)
```

---

## 🛠️ Project Structure

```text
d:\new rag pro\
├── app.py              # FastAPI Web API Server (Phase 6)
├── main.py             # CLI Entrypoint (Runs full pipeline locally)
├── ingest.py           # Phase 1: Git repository cloning & file reading
├── ast_parser.py       # Phase 2: Tree-sitter AST function/class extraction
├── store_embeddings.py  # Phase 3: HuggingFace Embedding generation & ChromaDB storage
├── retrieval.py        # Phase 4: Bi-encoder search + Cross-Encoder reranking
├── generation.py       # Phase 5: Prompt construction & Gemini streaming generation
├── vector_store.py     # Clean import/re-export shim
└── requirements.txt    # Project dependencies
```

---

## 🚦 Installation & Setup

### Prerequisites
* **Python 3.10+**
* **Git** installed on your system path.

### 1. Clone the Project & Setup Virtual Environment
```powershell
cd "d:\new rag pro"
python -m venv venv
.\venv\Scripts\activate
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Set Up API Keys
Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) and configure it in your terminal session:
```powershell
$env:GEMINI_API_KEY = "your-google-ai-studio-key-here"
```

---

## 🚀 Running the Project

### CLI Mode (Local Pipeline Run)
To run the full end-to-end RAG pipeline inside your terminal:
```powershell
python main.py
```
*Modify `main.py` to change the query or target repository URL.*

### Server Mode (FastAPI Web Server)
To run the FastAPI backend, which is ready to connect to a React, Vue, or Next.js frontend:
```powershell
python app.py
```
Once booted, access the interactive API docs at:
👉 **`http://127.0.0.1:8000/docs`**

---

## 🔌 API Endpoints

### `POST /chat`
Accepts a Git repository and a natural language query, runs the indexing pipeline, and returns the generated answer alongside cited code context.

**Request Payload:**
```json
{
  "repo_url": "https://github.com/dhinesh0-bi/Ai-Fake-review-detection-system",
  "question": "How does the system analyze and classify a review as fake or real?"
}
```

**Response Payload:**
```json
{
  "question": "How does the system analyze and classify a review as fake or real?",
  "answer": "The system classifies reviews using the `analyze_review` function (source: views.py -> analyze_review)...",
  "sources": [
    {
      "file_path": "backend\\api\\views.py",
      "function_name": "analyze_review",
      "start_line": 33,
      "end_line": 93,
      "code": "def analyze_review(request):..."
    }
  ]
}
```

### `GET /health`
Validates server health and confirms if your Gemini API key is correctly configured.

---

## 🧠 Why RAG for Code requires AST & Rerankers

1. **AST Chunking prevents broken logic:** Standard character-split chunking (e.g. splitting every 500 characters) cuts functions in half, destroying scope, variable declarations, and syntax logic. Tree-sitter parses the code's Abstract Syntax Tree (AST) to keep code chunks strictly contained within logical blocks (classes and functions).
2. **Two-Stage Retrieval mitigates semantic drift:** In codebases, different files share identical keywords (`self`, `import`, `return`). A Bi-Encoder (Stage 1 Vector Search) provides rapid search but retrieves false positives. The Cross-Encoder (Stage 2 Reranker) compares the query and function body jointly in a single forward pass, ensuring only the most relevant snippets make it to the LLM prompt.
