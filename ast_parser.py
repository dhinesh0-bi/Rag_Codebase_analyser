import tree_sitter_python as tspython
from tree_sitter import Language, Parser

# Load the Python language grammar once at module level
PY_LANGUAGE = Language(tspython.language())


def extract_functions_and_classes(code_string):
    """
    Parses a single Python source string and returns a list of dicts,
    one per function or class definition found.

    Each dict has:
        - chunk_code  : the raw source of the function/class
        - metadata    : { type, name, start_line, end_line }
    """
    parser = Parser(PY_LANGUAGE)
    tree = parser.parse(bytes(code_string, "utf8"))
    extracted_chunks = []

    def walk_tree(node):
        if node.type in ("class_definition", "function_definition"):
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf8") if name_node else "unknown"

            extracted_chunks.append({
                "chunk_code": node.text.decode("utf8"),
                "metadata": {
                    "type": node.type,
                    "name": name,
                    "start_line": node.start_point[0] + 1,   # 0-indexed → 1-indexed
                    "end_line": node.end_point[0] + 1,
                }
            })
        for child in node.children:
            walk_tree(child)

    walk_tree(tree.root_node)
    return extracted_chunks


def extract_code_chunks(collected_files):
    """
    Wrapper expected by main.py.

    Args:
        collected_files: list of dicts produced by clone_github_repo(),
                         each with 'file_path' and 'source_code'.

    Returns:
        Flat list of chunk dicts (chunk_code + metadata) across all .py files.
    """
    all_chunks = []
    for file_info in collected_files:
        file_path = file_info["file_path"]

        # Only AST-parse Python files; skip JS/TS for now
        if not file_path.endswith(".py"):
            continue

        try:
            chunks = extract_functions_and_classes(file_info["source_code"])
            # Enrich metadata with the source file path
            for chunk in chunks:
                chunk["metadata"]["file_path"] = file_path
            all_chunks.extend(chunks)
        except Exception as e:
            print(f"  [AST] Skipping {file_path}: {e}")

    print(f"[Phase 2] Extracted {len(all_chunks)} chunks from {len(collected_files)} files.")
    return all_chunks


if __name__ == "__main__":
    sample_code = """
class MyClass:
    def __init__(self):
        self.value = 10

    def add(self, x):
        return self.value + x

def global_function():
    print("Hello, world!")
"""
    chunks = extract_functions_and_classes(sample_code)
    for i, chunk in enumerate(chunks):
        print(f"--- Chunk {i + 1} ---")
        print(f"Type : {chunk['metadata']['type']}")
        print(f"Name : {chunk['metadata']['name']}")
        print(f"Lines: {chunk['metadata']['start_line']} → {chunk['metadata']['end_line']}")
        print(f"Code :\n{chunk['chunk_code']}\n")
