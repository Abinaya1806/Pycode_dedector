
const codeInput = document.getElementById("code");
const analyzeBtn = document.getElementById("analyzeBtn");
const sampleBtn = document.getElementById("sampleBtn");
const charCount = document.getElementById("charCount");
const results = document.getElementById("results");
const errorBox = document.getElementById("errorBox");

let pyodideInstance = null;

const sampleCode = `def calculate_total(price, tax):
    try:
        total = price + tax
        return total
    except ValueError:
        print("Invalid value")

result = calculate_total(100, 10)
print(result)
`;

codeInput.addEventListener("input", () => {
    charCount.textContent =
        codeInput.value.length + " characters";
});

sampleBtn.addEventListener("click", () => {
    codeInput.value = sampleCode;
    codeInput.dispatchEvent(new Event("input"));
    results.classList.add("hidden");
    errorBox.classList.add("hidden");
});

function showMessage(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function addIssue(container, title, description, type) {
    const item = document.createElement("div");
    item.className = "issue";

    const heading = document.createElement("strong");
    heading.textContent = title;

    const detail = document.createElement("p");
    detail.textContent = description;

    const label = document.createElement("span");
    label.textContent = type;

    item.append(heading, detail, label);
    container.appendChild(item);
}

async function loadPython() {
    if (pyodideInstance) return pyodideInstance;

    if (typeof loadPyodide !== "function") {
        throw new Error("Python engine is not loaded. Refresh the page and try again.");
    }

    analyzeBtn.textContent = "Loading Python engine...";

    pyodideInstance = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/"
    });

    return pyodideInstance;
}

const pythonAnalyzer = `
import ast
import json

def analyze_python(source):
    issues = []
    suggestions = []

    try:
        tree = ast.parse(source)
        compile(source, "<submitted_code>", "exec")

    except SyntaxError as error:
        issues.append({
            "title": "Python Syntax Error",
            "description": str(error.msg) + " at line " + str(error.lineno),
            "type": "Error"
        })

        return json.dumps({
            "valid": False,
            "issues": issues,
            "suggestions": suggestions,
            "score": 0
        })

    lines = source.splitlines()

    for number, line in enumerate(lines, start=1):

        if len(line) > 79:
            issues.append({
                "title": "Long Line",
                "description": "Line " + str(number) + " is too long.",
                "type": "Warning"
            })

        if line.rstrip() != line:
            issues.append({
                "title": "Trailing Whitespace",
                "description": "Remove extra spaces at line " + str(number),
                "type": "Suggestion"
            })

    for node in ast.walk(tree):

        if isinstance(node, ast.FunctionDef):

            if not node.name.islower() or "__" in node.name:
                issues.append({
                    "title": "Naming Convention",
                    "description": "Use lowercase snake_case for function " + node.name,
                    "type": "Suggestion"
                })

            if not ast.get_docstring(node):
                issues.append({
                    "title": "Missing Docstring",
                    "description": "Add a docstring to function " + node.name,
                    "type": "Suggestion"
                })

        if isinstance(node, ast.ExceptHandler) and node.type is None:
            issues.append({
                "title": "Bare Except Statement",
                "description": "Use a specific exception instead of bare except.",
                "type": "Warning"
            })

        if isinstance(node, ast.ClassDef) and not ast.get_docstring(node):
            issues.append({
                "title": "Missing Class Docstring",
                "description": "Add a docstring to class " + node.name,
                "type": "Suggestion"
            })

    if not any(isinstance(n, ast.FunctionDef) for n in ast.walk(tree)):
        suggestions.append("Consider using functions to organize reusable code.")

    if not any(
        isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)
        for n in ast.walk(tree)
    ):
        suggestions.append("Use meaningful variables to improve readability.")

    if "if __name__ == '__main__':" not in source:
        suggestions.append("Consider using a main guard for standalone scripts.")

    score = max(0, 100 - len(issues) * 10)

    if not issues:
        suggestions.append("Excellent! No issues were detected by these basic checks.")

    return json.dumps({
        "valid": True,
        "issues": issues,
        "suggestions": suggestions,
        "score": score
    })

analyze_python(source)
`;

async function analyzeCode() {
    const code = codeInput.value;

    errorBox.classList.add("hidden");
    results.classList.add("hidden");

    if (!code.trim()) {
        showMessage("Please enter Python code before analyzing.");
        return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    try {
        const pyodide = await loadPython();

        pyodide.globals.set("source", code);

        const output = await pyodide.runPythonAsync(pythonAnalyzer);

        const report = JSON.parse(String(output));

        displayResults(report);

    } catch (error) {
        showMessage("Analysis failed: " + error.message);
        console.error(error);

    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "✦ Analyze my code";
    }
}

function displayResults(report) {
    const issuesContainer = document.getElementById("issues");
    const suggestionsContainer = document.getElementById("suggestions");

    issuesContainer.replaceChildren();
    suggestionsContainer.replaceChildren();

    document.getElementById("score").textContent =
        report.score ?? 0;

    const status = document.getElementById("syntaxStatus");

    status.textContent = report.valid
        ? "✓ Python syntax is valid"
        : "✕ Python syntax errors found";

    status.className = report.valid
        ? "status success"
        : "status danger";

    const issues = report.issues || [];
    const suggestions = report.suggestions || [];

    if (issues.length === 0) {
        addIssue(
            issuesContainer,
            "No issues detected",
            "Your code passed the available static checks.",
            "Success"
        );
    } else {
        issues.forEach(issue => {
            addIssue(
                issuesContainer,
                issue.title,
                issue.description,
                issue.type
            );
        });
    }

    suggestions.forEach(suggestion => {
        const li = document.createElement("li");
        li.textContent = suggestion;
        suggestionsContainer.appendChild(li);
    });

    results.classList.remove("hidden");

    results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

analyzeBtn.addEventListener("click", analyzeCode);
