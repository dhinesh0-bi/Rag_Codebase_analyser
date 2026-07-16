# Testing Guide — Codebase Companion RAG

This guide explains how to manually test the full application stack (backend + frontend) and run the automated load test for 1,000 concurrent users.

---

## Prerequisites

Make sure you have completed setup:
```powershell
cd "d:\new rag pro"
.\venv\Scripts\activate
$env:GEMINI_API_KEY = "your-gemini-key"
```

---

## Part 1: Manual Backend API Testing

### Step 1 — Start the backend server
```powershell
python app.py
```
You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

---

### Step 2 — Verify health endpoint
Open your browser or PowerShell and run:
```powershell
Invoke-RestMethod http://localhost:8000/health
```
**Expected response:**
```json
{
  "status": "healthy",
  "firebase_configured": false,
  "gemini_configured": true,
  "rate_limit": "5 requests/user/day",
  "version": "2.0.0"
}
```
> Note: `firebase_configured: false` is expected in dev mode (no service account file).

---

### Step 3 — Test the /chat endpoint (no auth in dev mode)
```powershell
$body = @{
    repo_url = "https://github.com/dhinesh0-bi/Ai-Fake-review-detection-system"
    question = "How does the system classify a review as fake or real?"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/chat -Method POST -Body $body -ContentType "application/json"
```

**Expected response (after ~60s for first run):**
```json
{
  "question": "How does the system classify a review as fake or real?",
  "answer": "The system classifies reviews using the analyze_review function...",
  "sources": [
    {
      "file_path": "backend\\api\\views.py",
      "function_name": "analyze_review",
      "start_line": 33,
      "end_line": 93,
      "code": "def analyze_review(request):..."
    }
  ],
  "user_uid": "dev-user"
}
```

---

### Step 4 — Test rate limiting
Run the same request **6 times** in a row. On the **6th request** you should receive:
```json
{
  "error": "Rate limit exceeded",
  "detail": "You have reached your daily limit of 5 requests. Please try again tomorrow.",
  "retry_after": "24 hours"
}
```
HTTP status code: **429 Too Many Requests**

---

### Step 5 — Test authentication (when Firebase is configured)
```powershell
# This should return 401 when Firebase IS configured
Invoke-RestMethod -Uri http://localhost:8000/chat -Method POST -Body $body -ContentType "application/json"
# Error: "Missing or invalid Authorization header"

# With a valid token:
$headers = @{ Authorization = "Bearer <your-firebase-id-token>" }
Invoke-RestMethod -Uri http://localhost:8000/chat -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

---

### Step 6 — Test SSE streaming endpoint
Open a terminal and run:
```powershell
# Using curl (best for SSE)
curl -N -X POST http://localhost:8000/stream `
  -H "Content-Type: application/json" `
  -d '{"repo_url":"https://github.com/dhinesh0-bi/Ai-Fake-review-detection-system","question":"How does authentication work?"}'
```

**Expected output (streaming):**
```
data: {"type": "source", "data": {"index": 1, "file_path": "backend\\api\\views.py", ...}}

data: {"type": "token", "data": "The "}
data: {"type": "token", "data": "system "}
data: {"type": "token", "data": "classifies "}
...
data: {"type": "done"}
```

---

### Step 7 — Test with Swagger UI
Open: **http://localhost:8000/docs**

1. Click `POST /chat` → `Try it out`
2. Paste the request body
3. Click `Execute`
4. Observe the response in the UI

---

## Part 2: Manual Frontend Testing

### Step 1 — Install and start the frontend
```powershell
cd "d:\new rag pro\frontend"
npm install
npm run dev
```
Open **http://localhost:5173**

### Step 2 — Test the login flow
1. Click **"Sign in with Google"**
2. Complete Google OAuth
3. You should be redirected to the Dashboard

### Step 3 — Test a query
1. Enter repo URL: `https://github.com/dhinesh0-bi/Ai-Fake-review-detection-system`
2. Enter question: `How does the fake review detection work?`
3. Click **"Analyze Codebase"**
4. Observe:
   - Loading spinner appears
   - Source cards appear first
   - Answer streams in token by token

### Step 4 — Verify rate limit bar
- Submit 1 query → bar shows "1 of 5 used"
- Submit 5 queries → bar turns red, shows "5 of 5 used"
- Submit 6th query → error toast: "Daily limit reached"

### Step 5 — Test sign out
1. Click your avatar in the top right
2. Click **"Sign Out"**
3. You should be redirected back to the Login page

---

## Part 3: Automated Load Testing (1,000 Users)

### Step 1 — Install Locust
```powershell
pip install locust
```

### Step 2 — Run the load test with Web UI
```powershell
# Start the backend first (in a separate terminal)
python app.py

# Run load test
locust -f locustfile.py --host http://localhost:8000
```
Open **http://localhost:8089**:
1. Set **Number of users**: `1000`
2. Set **Spawn rate**: `50` (50 new users per second)
3. Click **"Start swarming"**
4. Watch the real-time charts

### Step 3 — Headless Load Test (no UI, CI/automated)
```powershell
locust -f locustfile.py --headless -u 1000 -r 50 --run-time 3m --host http://localhost:8000
```

**What to look for:**

| Metric | Target | Alert |
|--------|--------|-------|
| Error Rate | < 1% | > 5% |
| P95 Latency | < 90s | > 120s |
| RPS (health) | > 100 | < 50 |
| RPS (chat) | Depends on Gemini quota | 0 |

> **Note:** The `/chat` endpoint is CPU-heavy (ML models). Each request takes 30-90s. For 1,000 simultaneous users, the server queues requests using async workers. The rate limiter (5/day) means users will be served once and then rate-limited, which protects the server from overload in production.

### Step 4 — Generate HTML report
```powershell
locust -f locustfile.py --headless -u 100 -r 10 --run-time 2m --host http://localhost:8000 --html load_test_report.html
```
Open `load_test_report.html` in your browser for a full performance report.

---

## Part 4: Deployment Testing

### After deploying to Railway + Vercel:

1. **Test production backend health:**
   ```powershell
   Invoke-RestMethod https://your-app.railway.app/health
   ```

2. **Test CORS from production frontend:**
   Open browser DevTools (F12) → Network tab → Submit a query → Verify no CORS errors.

3. **Test Firebase auth in production:**
   Sign in on the Vercel URL. Verify that the Bearer token is sent and the API returns a real answer.

4. **Run a small production load test:**
   ```powershell
   locust -f locustfile.py --headless -u 50 -r 5 --run-time 1m --host https://your-app.railway.app
   ```
