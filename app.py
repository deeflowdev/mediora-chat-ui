import os
import re
import io
import base64

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

from PIL import Image
from PyPDF2 import PdfReader

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = os.getenv("GENAI_API_KEY")
if not api_key:
    raise ValueError("GENAI_API_KEY not found")

client = genai.Client(api_key=api_key)

MODEL_NAME = "models/gemini-2.5-flash"


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\*\*", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def is_confused(text: str) -> bool:
    text = (text or "").lower()
    return any(k in text for k in ["huh", "what", "explain", "didn't get", "confused"])


def is_medical_query(text: str) -> bool:
    text = (text or "").lower()
    return any(k in text for k in [
        "pain", "fever", "headache", "symptom", "disease",
        "infection", "medicine", "tablet", "doctor",
        "diagnosis", "treatment", "cough", "cold",
        "blood", "heart", "lung", "stomach", "injury", "health"
    ])


def extract_files(files):
    text_parts = []
    image_parts = []

    for f in files:
        file_type = f.get("type", "")
        data = f.get("data", "")
        name = f.get("name", "file")

        if not data:
            continue

        if "image" in file_type:
            try:
                image_bytes = base64.b64decode(data.split(",")[1])
                image = Image.open(io.BytesIO(image_bytes))
                image_parts.append(image)
            except:
                pass

        elif "pdf" in file_type:
            try:
                pdf_bytes = base64.b64decode(data.split(",")[1])
                reader = PdfReader(io.BytesIO(pdf_bytes))

                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""

                text_parts.append(f"[PDF: {name}]\n{text}")

            except:
                pass

        else:
            text_parts.append(f"[File: {name}]\n{data}")

    return "\n\n".join(text_parts), image_parts


@app.route("/")
def home():
    return render_template("mediora.html")


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(silent=True) or {}

        user_message = (data.get("message") or "").strip()
        files = data.get("files") or []

        if not user_message and not files:
            return jsonify({
                "status": "success",
                "reply": "Ask a medical question or upload a report."
            })

        if not is_medical_query(user_message):
            return jsonify({
                "status": "success",
                "reply": "🧠 I’m a medical assistant. Ask only health or medical-related questions."
            })

        file_text, images = extract_files(files)

        confused = is_confused(user_message)

        tone = """
You are Mediora AI, a medical assistant.
Only answer medical, health, anatomy, symptoms, and treatment-related queries.
Never go outside medical domain.
"""

        if confused:
            tone = """
User is confused.
Explain in very simple medical terms step-by-step.
Be like a tutor. No complex language.
"""

        prompt = f"""
{tone}

User message:
{user_message}

File content:
{file_text if file_text else "None"}

IMPORTANT:
- If medical report is present, interpret it simply
- Do not give prescriptions
- Suggest consulting a doctor for serious issues
"""

        contents = [prompt]
        contents.extend(images)

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config={"max_output_tokens": 800}
        )

        return jsonify({
            "status": "success",
            "reply": clean_text(getattr(response, "text", ""))
        })

    except Exception as e:
        print("ERROR:", str(e))

        return jsonify({
            "status": "error",
            "reply": "server error"
        }), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)