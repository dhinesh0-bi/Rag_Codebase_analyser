import os
import tempfile
from git import Repo

# Directories to ignore during traversal
IGNORE_DIRS = {'.git', 'node_modules', 'venv', '.venv', '__pycache__', 'dist', 'build'}
# File extensions to include
TARGET_EXTENSIONS = {'.py', '.js', '.ts'}


def clone_github_repo(repo_url):
    """
    Clones a GitHub repository into a temporary directory (that persists until 
    the program exits) and returns a list of dicts with file paths and their contents.

    Returns:
        list[dict]: Each dict has 'file_path' (relative) and 'source_code' (raw string).
    """
    # We use a regular temp dir here via tempfile.mkdtemp() instead of
    # TemporaryDirectory() context manager, so that the files survive long
    # enough for later phases to read them. Python will clean them up on exit.
    temp_dir = tempfile.mkdtemp(prefix="codebase_rag_")

    print(f"[Phase 1] Cloning '{repo_url}' into {temp_dir}...")
    try:
        Repo.clone_from(repo_url, temp_dir)
        print("[Phase 1] Cloning successful.\n")
    except Exception as e:
        print(f"[Phase 1] Error cloning repository: {e}")
        return []

    print(f"[Phase 1] Searching for {', '.join(TARGET_EXTENSIONS)} files...")
    collected = []

    for root, dirs, files in os.walk(temp_dir):
        # Prune ignored directories in-place so os.walk doesn't recurse into them
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            _, ext = os.path.splitext(file)
            if ext in TARGET_EXTENSIONS:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, temp_dir)

                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        source_code = f.read()
                    collected.append({
                        "file_path": relative_path,
                        "source_code": source_code
                    })
                    print(f"  Found: {relative_path}")
                except Exception as e:
                    print(f"  Skipping {relative_path}: {e}")

    print(f"\n[Phase 1] Total target files collected: {len(collected)}")
    return collected


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Phase 1: Ingest a GitHub repository for RAG.")
    parser.add_argument("repo_url", help="URL of the public GitHub repository to clone.")
    args = parser.parse_args()

    files = clone_github_repo(args.repo_url)
    print(f"\nSample file: {files[0]['file_path']}" if files else "No files found.")
