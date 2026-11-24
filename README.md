# PyCode Doctor

A beginner-friendly Flask website for Python static code checks and best-practice suggestions.

## Features
- Python syntax validation using Python's `compile()`
- Basic AST-based checks for function naming and missing docstrings
- Checks for bare `except`, long lines and trailing whitespace
- Simple code-quality score and best-practice checklist
- Optional Gemini-powered review using prompt engineering

## Run locally
1. Install Python 3.10 or newer.
2. Open a terminal in this project folder.
3. Install dependencies:
   `pip install -r requirements.txt`
4. Start the website:
   `python app.py`
5. Open `http://127.0.0.1:5000` in your browser.

## Enable optional AI review
The website works without an API key. To enable the Gemini reviewer:
1. Install the optional package: `pip install google-genai`
2. Set an environment variable named `GEMINI_API_KEY` with your own Google AI Studio API key.
3. Restart the Flask app.

Do not put API keys in frontend JavaScript or share them publicly.

## Project note
This is a learning prototype, not a security scanner or a replacement for running tests, Ruff, or a professional code review. Submitted code is analyzed but never executed.
