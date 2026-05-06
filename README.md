# 🩺 Mediora AI – Medical Chat Interface

A GenAI-powered medical report assistant with a chat-based interface designed for interactive patient-report analysis.

## 🌐 Live Demo
Frontend (Vercel): https://mediora-chat-ui.vercel.app/  
Backend API (Render): https://mediora-api-jas7.onrender.com/

---

## Features
- Interactive chat UI for medical queries
- File upload support (images, PDFs)
- AI-generated responses using Gemini API
- Chat history stored with localStorage
- Basic authentication flow
- Responsive modern interface

---

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Python
- Flask
- Flask-CORS

### AI Integration
- Google Gemini API

### Deployment
- Vercel (Frontend)
- Render (Backend)

---

## How It Works
1. User logs in through the frontend interface  
2. Sends text queries or uploads files  
3. Frontend sends requests to Flask API  
4. Backend processes uploaded reports/images  
5. Gemini generates structured responses  
6. Responses appear in the chat UI

---

## Local Setup

### Frontend
Open `login.html` in a browser or run with Live Server.  
After login, users are redirected to `mediora.html`.

### Backend
```bash
pip install -r requirements.txt
python app.py
```

### Environment Variables

Create a `.env` file:

```env
GENAI_API_KEY=your_api_key_here