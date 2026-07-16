"""
locustfile.py — Load Testing for Codebase Companion RAG API
============================================================
Simulates 1,000 concurrent users making queries to the /chat endpoint.

Usage:
  pip install locust
  locust -f locustfile.py --host http://localhost:8000

  # Headless mode (CI/automated):
  locust -f locustfile.py --headless -u 1000 -r 50 --run-time 3m --host http://localhost:8000

  # With Locust Web UI at http://localhost:8089:
  locust -f locustfile.py --host http://localhost:8000

Reports Generated:
  - Requests per second (RPS)
  - Response time: P50, P95, P99
  - Error rate
  - Active users over time
"""

from locust import HttpUser, task, between, events
import json
import random
import time


# Sample public repositories to query (small repos for fast testing)
TEST_REPOS = [
    "https://github.com/tiangolo/fastapi",
    "https://github.com/pallets/flask",
    "https://github.com/django/django",
]

# Sample developer questions
TEST_QUESTIONS = [
    "How does request routing work?",
    "Where is authentication handled?",
    "How are database models defined?",
    "What does the main entry point do?",
    "How is error handling implemented?",
    "Where are API endpoints registered?",
]

# A mock Firebase ID token — in real tests, replace with a valid token
# or disable auth in .env by not setting FIREBASE_SERVICE_ACCOUNT_PATH
MOCK_AUTH_TOKEN = "dev-test-token"


class CodebaseCompanionUser(HttpUser):
    """
    Simulates a real user session:
    1. Checks health endpoint
    2. Submits a RAG query
    3. Waits between 5-15 seconds (simulating reading)
    """
    wait_time = between(5, 15)

    def on_start(self):
        """Called when a virtual user starts. Check server health."""
        with self.client.get("/health", catch_response=True, name="[GET] /health") as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Health check failed: {resp.status_code}")

    @task(3)
    def query_repo(self):
        """
        Primary task (weight=3): Submit a RAG query.
        This is the most expensive operation — tests the full pipeline.
        """
        payload = {
            "repo_url": random.choice(TEST_REPOS),
            "question": random.choice(TEST_QUESTIONS),
        }
        headers = {
            "Authorization": f"Bearer {MOCK_AUTH_TOKEN}",
            "Content-Type": "application/json",
        }

        start = time.time()
        with self.client.post(
            "/chat",
            json=payload,
            headers=headers,
            catch_response=True,
            name="[POST] /chat",
            timeout=120,  # RAG pipeline can take 60-90s on first run
        ) as resp:
            elapsed = time.time() - start

            if resp.status_code == 200:
                data = resp.json()
                if "answer" in data and "sources" in data:
                    resp.success()
                else:
                    resp.failure("Response missing answer or sources fields")
            elif resp.status_code == 429:
                # Rate limit hit — this is expected behavior, not a failure
                resp.success()
                print(f"[Rate Limit] User hit quota after {elapsed:.1f}s")
            elif resp.status_code == 401:
                resp.failure("Authentication failed")
            else:
                resp.failure(f"Unexpected status {resp.status_code}: {resp.text[:200]}")

    @task(1)
    def check_rate_limit(self):
        """
        Secondary task (weight=1): Check rate limit status.
        Light endpoint, used to simulate users checking their quota.
        """
        headers = {"Authorization": f"Bearer {MOCK_AUTH_TOKEN}"}
        with self.client.get(
            "/rate-limit",
            headers=headers,
            catch_response=True,
            name="[GET] /rate-limit",
        ) as resp:
            if resp.status_code in (200, 401):
                resp.success()
            else:
                resp.failure(f"Rate limit check failed: {resp.status_code}")

    @task(1)
    def health_check(self):
        """
        Tertiary task (weight=1): Periodic health ping.
        Simulates monitoring and status checks.
        """
        with self.client.get(
            "/health",
            catch_response=True,
            name="[GET] /health (periodic)",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Health check returned {resp.status_code}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "=" * 60)
    print("  CODEBASE COMPANION RAG — LOAD TEST STARTING")
    print("=" * 60)
    print(f"  Target: {environment.host}")
    print(f"  Users: Will ramp up to {environment.parsed_options.num_users if hasattr(environment, 'parsed_options') else 'configured'}")
    print(f"  Note: RAG queries are CPU-heavy. Expect high latency.")
    print("=" * 60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.stats.total
    print("\n" + "=" * 60)
    print("  LOAD TEST COMPLETE — RESULTS SUMMARY")
    print("=" * 60)
    print(f"  Total Requests     : {stats.num_requests}")
    print(f"  Failed Requests    : {stats.num_failures}")
    print(f"  Success Rate       : {((stats.num_requests - stats.num_failures) / max(stats.num_requests, 1) * 100):.1f}%")
    print(f"  Avg Response Time  : {stats.avg_response_time:.0f}ms")
    print(f"  P95 Response Time  : {stats.get_response_time_percentile(0.95):.0f}ms")
    print(f"  Max Response Time  : {stats.max_response_time:.0f}ms")
    print(f"  Requests/sec       : {stats.total_rps:.1f}")
    print("=" * 60 + "\n")
