# Support AI – AI-Powered Communication Assistant

An **AI-Powered Communication Assistant** that fetches support-related emails, classifies them by urgency/sentiment, generates draft responses, and provides a clean dashboard with analytics.

This project has **two parts**:

- `backend/` → Express.js + MongoDB APIs (email retrieval, processing, sending, stats)
- `frontend/` → React (Vite) dashboard for viewing & responding to emails

---

## 🚀 Features

- Fetch incoming emails (via Gmail/IMAP).
- Extract important details (phone, email, order IDs).
- Categorize emails by **priority** & **sentiment**.
- Generate **AI draft responses** using LLMs.
- Save / edit / send replies via SMTP.
- Dashboard with:
  - Total emails
  - By status / priority / sentiment
  - Last 24h email trends (chart)
- End-to-end workflow: Fetch → Process → Draft → Respond.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Atlas/local)
- **Email**: Nodemailer (SMTP)
- **AI**: OpenAI/HuggingFace (optional for draft generation)

---

## 📂 Project Structure

support-ai/
│── backend/ # Express + MongoDB API
│── frontend/ # React (Vite) UI
│── README.md # Root README (this file)

yaml

---

## ⚙️ Backend Setup (`backend/`)

### 1. Environment Variables

Create `backend/.env`:

```env
PORT=4000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/supportAI

# SMTP for sending emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# AI (optional)
OPENAI_API_KEY=sk-xxxxx
2. Install & Run
bash

cd backend
npm install
npm start
Backend runs at: http://localhost:4000/api

🖥️ Frontend Setup (frontend/)
1. Environment Variables
Create frontend/.env:

env

VITE_API_BASE=http://localhost:4000/api
2. Install & Run
bash

cd frontend
npm install
npm run dev
Frontend runs at: http://localhost:5173

📡 API Endpoints (Backend)
GET /api/emails → list all emails

GET /api/emails/:id → single email

POST /api/emails/:id/send → send reply

POST /api/emails/:id/process → process email

POST /api/emails/:id/status → update status

GET /api/fetch-and-process → fetch + process

GET /api/stats/summary → analytics summary

GET /api/stats/last24h → last 24h chart data

📊 Frontend Pages
Emails Page → list filtered emails, apply search/status/priority filters

Email View → open email, view AI draft, edit, save, or send

Dashboard → analytics & charts (total, status, priority, sentiment, last 24h)

▶️ Run Full Project
Start backend:

bash

cd backend
npm start
Start frontend:

bash

cd frontend
npm run dev
Open browser: http://localhost:5173



👨‍💻 Contributors
Shivam Shashank

Team / Individual Hackathon Submission
```
