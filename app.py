import os
import re
import io
import base64
import logging
import traceback

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ClientError

from PIL import Image
from PyPDF2 import PdfReader
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

logging.basicConfig(level=logging.INFO)

api_key = os.getenv("GENAI_API_KEY")
if not api_key:
    raise ValueError("GENAI_API_KEY not found")

client = genai.Client(api_key=api_key)

MODEL_NAME = "models/gemini-2.5-flash-lite"

MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_TEXT_LENGTH = 2500   

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\*\*", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def is_confused(text: str) -> bool:
    text = (text or "").lower()
    return any(k in text for k in ["huh", "what", "explain", "didn't get", "confused"])


def safe_base64_decode(data: str):
    try:
        _, encoded = data.split(",", 1)
        if len(encoded) > MAX_FILE_SIZE * 1.37:
            return None
        return base64.b64decode(encoded)
    except Exception:
        return None

def extract_files(files):
    text_parts = []
    image_parts = []

    for f in files:
        file_type = f.get("type", "")
        data = f.get("data", "")
        name = f.get("name", "file")

        if not data:
            continue

        decoded = safe_base64_decode(data)
        if not decoded:
            continue

        try:
            # IMAGE
            if "image" in file_type:
                image = Image.open(io.BytesIO(decoded)).convert("RGB")
                image.load()
                image.thumbnail((1024, 1024))
                image_parts.append(image)

            # PDF
            elif "pdf" in file_type:
                try:
                    reader = PdfReader(io.BytesIO(decoded))
                    text = ""

                    for page in reader.pages:
                        try:
                            raw = page.extract_text()
                            if raw:
                                text += re.sub(r"\s+", " ", raw) + "\n"
                        except Exception as e:
                            logging.warning(f"page read failed in {name}: {e}")

                    if not text.strip():
                        text = "No readable text found in PDF (possibly scanned document)."

                    text = text[:MAX_TEXT_LENGTH]

                    text_parts.append(f"""
[PDF: {name}]

{text}

task:
extract structured medical insights.
""")

                except Exception as e:
                    logging.error(f"PDF processing failed: {name} -> {e}")
                    text_parts.append(f"[PDF: {name}] could not be processed.")

        except Exception as e:
            logging.error(f"file error: {name} -> {e}")

    return "\n\n".join(text_parts), image_parts


@app.route("/")
def home():
    return "Mediora backend is running"


@app.route("/login")
def login():
    return "Login handled on frontend"


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(silent=True) or {}

        user_message = (data.get("message") or "").strip()
        files = data.get("files") or []
        history = data.get("history") or []

        if not user_message and not files:
            return jsonify({
                "status": "success",
                "reply": "send a message or upload a file."
            })

        file_text, images = extract_files(files)
        history = history[-3:]

        tone = """
you are mediora ai, a clinical assistant.

rules:
- be precise
- no repetition
- avoid long explanations
- extract useful medical info first
"""

        if is_confused(user_message):
            tone += "\nuser is confused: simplify heavily."

        history_text = ""
        for msg in history:
            history_text += f"{msg.get('role')}: {msg.get('text')}\n"

        prompt = f"""
{tone}

history:
{history_text}

user:
{user_message}

file:
{file_text if file_text else "none"}
"""
        images = images[:1]

        contents = [prompt] + images

        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config={"max_output_tokens": 600}  # reduced to save quota
            )

            reply = getattr(response, "text", None)

            if not reply:
                return jsonify({
                    "status": "error",
                    "reply": "empty model response"
                })

            return jsonify({
                "status": "success",
                "reply": clean_text(reply)
            })

        except ClientError as e:
            logging.error(f"quota/api error: {e}")

            return jsonify({
                "status": "error",
                "reply": "you hit the Gemini quota limit. wait or upgrade plan."
            })

    except Exception:
        logging.error(traceback.format_exc())

        return jsonify({
            "status": "error",
            "reply": "server crashed internally."
        })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5501))
    app.run(host="0.0.0.0", port=port)