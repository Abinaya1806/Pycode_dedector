import ast
import os
import re
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

def basic_analysis(code):
    issues = []
    try:
        compile(code, "<submitted_code>", "exec")
        syntax_ok = True
    except SyntaxError as e:
        syntax_ok = False
        issues.append({
            "type": "Syntax error",
            "line": e.lineno or 0,
            "message": e.msg,
            "tip": "Check brackets, quotes, colons, indentation, and the highlighted line."
        })

    if syntax_ok:
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Name) and node.id == "==":
                    pass
                if isinstance(node, ast.FunctionDef):
                    if len(node.name) > 0 and not re.match(r"^[a-z_][a-z0-9_]*$", node.name):
                        issues.append({"type":"Naming convention","line":node.lineno,
                                       "message":f"Function '{node.name}' does not follow snake_case.",
                                       "tip":"Use lowercase words separated by underscores, e.g. calculate_total()."})
                    if ast.get_docstring(node) is None:
                        issues.append({"type":"Documentation","line":node.lineno,
                                       "message":f"Function '{node.name}' has no docstring.",
                                       "tip":"Add a short docstring describing what the function does."})
                if isinstance(node, ast.ExceptHandler) and node.type is None:
                    issues.append({"type":"Best practice","line":node.lineno,
                                   "message":"A bare 'except:' catches every exception.",
                                   "tip":"Catch a specific exception, such as ValueError or FileNotFoundError."})
                if isinstance(node, ast.Compare):
                    for op in node.ops:
                        if isinstance(op, (ast.Is, ast.IsNot)):
                            pass
                if isinstance(node, ast.Constant) and isinstance(node.value, str) and len(node.value) > 100:
                    issues.append({"type":"Readability","line":getattr(node, "lineno", 0),
                                   "message":"A long string literal may reduce readability.",
                                   "tip":"Consider splitting it across lines or storing it in a clearly named variable."})
        except Exception:
            pass

    for n, line in enumerate(code.splitlines(), start=1):
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            if len(line) > 88:
                issues.append({"type":"PEP 8 style","line":n,
                               "message":f"Line is {len(line)} characters long (over the 88-character guideline).",
                               "tip":"Break the statement into multiple readable lines."})
            if re.match(r"^(if|for|while|def|class|elif|else|try|except|finally|with)\\b", stripped) and stripped.endswith(":") is False and not stripped.startswith(("else", "finally")):
                pass
            if re.search(r"\\s+$", line):
                issues.append({"type":"Whitespace","line":n,
                               "message":"Trailing whitespace found.",
                               "tip":"Remove spaces or tabs at the end of this line."})

    # Remove duplicate issue records
    unique, seen = [], set()
    for item in issues:
        key = (item["type"], item["line"], item["message"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    score = max(0, 100 - min(70, len(unique) * 10) - (30 if not syntax_ok else 0))
    suggestions = [
        "Follow PEP 8 naming and formatting conventions.",
        "Use meaningful variable names instead of one-letter names (except conventional loop counters).",
        "Add docstrings to functions and comments where the logic is not obvious.",
        "Handle expected exceptions specifically rather than using a bare except.",
        "Split long functions into smaller, reusable functions."
    ]
    return {"syntax_ok": syntax_ok, "issues": unique, "score": score, "suggestions": suggestions}

def ai_review(code, analysis):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = f"""You are a careful senior Python code reviewer helping postgraduate students.
Review the submitted Python code. Explain bugs in simple English, suggest best practices,
and provide an improved version only when you can do so safely. Do not claim code was run.
Use PEP 8 and prioritize correctness, readability, maintainability and basic security.
Return concise Markdown with sections: Explanation, Recommended improvements, Improved code.
Static analysis findings: {analysis}
Python code:
```python
{code}
```"""
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text
    except Exception as exc:
        return "AI review is temporarily unavailable. The built-in analysis below is still available. Details: " + str(exc)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    if not code.strip():
        return jsonify({"error": "Please paste some Python code first."}), 400
    if len(code) > 30000:
        return jsonify({"error": "Please keep the code under 30,000 characters."}), 400
    result = basic_analysis(code)
    result["ai_review"] = ai_review(code, result)
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
