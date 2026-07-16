import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Parser

PY_LANGUAGE  = Language(tspython.language())
JS_LANGUAGE  = Language(tsjavascript.language())
TS_LANGUAGE  = Language(tstypescript.language_typescript())
TSX_LANGUAGE = Language(tstypescript.language_tsx())


def get_language(file_path):
    if   file_path.endswith('.py'):  return PY_LANGUAGE
    elif file_path.endswith(('.js', '.jsx')): return JS_LANGUAGE
    elif file_path.endswith('.ts'):  return TS_LANGUAGE
    elif file_path.endswith('.tsx'): return TSX_LANGUAGE
    return None


def _get_text(node):
    return node.text.decode("utf8") if node else "unknown"


def extract_functions_and_classes(code_string, language):
    """
    Parses source and returns a list of chunk dicts.
    Handles: Python classes/functions, JS/TS functions, arrow functions,
    React component exports, class declarations, and methods.
    """
    parser = Parser(language)
    tree   = parser.parse(bytes(code_string, "utf8"))
    chunks = []
    seen   = set()  # avoid duplicates by (start_line, end_line)

    def add_chunk(node, name, node_type=None):
        key = (node.start_point[0], node.end_point[0])
        if key in seen:
            return
        seen.add(key)
        chunks.append({
            "chunk_code": node.text.decode("utf8"),
            "metadata": {
                "type":       node_type or node.type,
                "name":       name or "unknown",
                "start_line": node.start_point[0] + 1,
                "end_line":   node.end_point[0] + 1,
            }
        })

    def walk(node):
        t = node.type

        # ── Python ──────────────────────────────────────────────────
        if t in ("class_definition", "function_definition"):
            add_chunk(node, _get_text(node.child_by_field_name("name")))
            return   # don't descend into nested defs — they'll be caught above

        # ── JS/TS: regular function / class ─────────────────────────
        elif t in ("function_declaration", "class_declaration", "method_definition"):
            add_chunk(node, _get_text(node.child_by_field_name("name")))

        # ── JS/TS: const Foo = () => { ... }  or  const Foo = function() {}
        elif t == "lexical_declaration":
            for declarator in node.named_children:
                if declarator.type != "variable_declarator":
                    continue
                name_node  = declarator.child_by_field_name("name")
                value_node = declarator.child_by_field_name("value")
                if value_node and value_node.type in ("arrow_function", "function"):
                    add_chunk(declarator, _get_text(name_node), "function")
                    return  # handled — don't walk children again

        # ── JS/TS: export default function / export const Foo = ...
        elif t == "export_statement":
            decl = node.child_by_field_name("declaration")
            if decl:
                if decl.type in ("function_declaration", "class_declaration"):
                    add_chunk(decl, _get_text(decl.child_by_field_name("name")))
                    return
                elif decl.type == "lexical_declaration":
                    for declarator in decl.named_children:
                        if declarator.type != "variable_declarator":
                            continue
                        name_node  = declarator.child_by_field_name("name")
                        value_node = declarator.child_by_field_name("value")
                        if value_node and value_node.type in ("arrow_function", "function"):
                            add_chunk(declarator, _get_text(name_node), "function")
                    return
            # anonymous export default function () {}
            for child in node.named_children:
                if child.type in ("function", "arrow_function"):
                    add_chunk(child, "default_export", "function")
                    return

        for child in node.children:
            walk(child)

    walk(tree.root_node)

    # Fallback: whole-file chunk if nothing was extracted
    if not chunks and code_string.strip():
        lines = code_string.split('\n')
        chunks.append({
            "chunk_code": code_string,
            "metadata": {
                "type":       "file",
                "name":       "whole_file",
                "start_line": 1,
                "end_line":   len(lines),
            }
        })

    return chunks


def extract_code_chunks(collected_files):
    """
    Entry point called by the RAG pipeline.
    Accepts a list of {file_path, source_code} dicts and returns
    a flat list of chunk dicts with metadata.file_path populated.
    """
    all_chunks = []

    for file_info in collected_files:
        file_path   = file_info["file_path"]
        source_code = file_info["source_code"]
        lang        = get_language(file_path)

        if not lang:
            # Unsupported extension — store as one whole-file chunk
            lines = source_code.split("\n")
            all_chunks.append({
                "chunk_code": source_code,
                "metadata": {
                    "type":       "file",
                    "name":       "whole_file",
                    "start_line": 1,
                    "end_line":   len(lines),
                    "file_path":  file_path,
                }
            })
            continue

        try:
            file_chunks = extract_functions_and_classes(source_code, lang)
            for chunk in file_chunks:
                chunk["metadata"]["file_path"] = file_path
            all_chunks.extend(file_chunks)
        except Exception as e:
            print(f"  [AST] Skipping {file_path}: {e}")

    print(f"[Phase 2] Extracted {len(all_chunks)} chunks from {len(collected_files)} files.")
    return all_chunks
