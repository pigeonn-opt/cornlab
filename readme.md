🌽 CornLab: The Hypothesis Trial

![Status](https://img.shields.io/badge/status-active-brightgreen) 
![Python](https://img.shields.io/badge/python-3.11-blue) 
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green)

📖 Overview
CornLab lets players act as an agricultural data scientist to determine whether corn yield has changed.
Through an interactive 12×12 field, users sample data, visualize distributions, run t-tests, and make decisions — no prior statistics required.

Supports experimental research:
Group A: interactive game
Group B: static lesson (control)

🎮 Key Features
🎯 Gameplay: 5 chapters, sampling system, heatmap, redo mechanics
📊 Statistics: built-in one-sample t-test, histogram + CI
🧠 Learning: H₀/H₁, p-value, CI, Type I/II errors
👥 NPC system: interactive dialogues + narrative
🧪 Research mode: A/B testing + behavioral data logging
🔊 Audio: fully synthesized BGM (no external assets)
🏗️ Architecture
frontend/   → Cloudflare Pages (HTML/CSS/JS)
backend/    → FastAPI (Python)
database    → SQLite / PostgreSQL

🚀 Quick Start
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

Open:
http://127.0.0.1:8000/app

Docs:
http://127.0.0.1:8000/docs
☁️ Deployment
Frontend: Cloudflare Pages
Backend: Railway (PostgreSQL)

Update API URL in:
frontend/js/config.js

🔌 Core API
/api/game/sample → sampling + t-test
/api/game/decide → hypothesis decision
/api/actions/log → behavior tracking
/api/analytics/export/csv → data export

📊 Research Metrics
Accuracy, Type I/II errors
Time spent, hints, retries
Journal length, test scores

🛠️ Tech Stack
Frontend: HTML, CSS, JS
Backend: FastAPI, SQLAlchemy
DB: SQLite / PostgreSQL
Charts: Chart.js

📄 License
CAU — free for research and education.

🙏 Citation
CornLab: The Hypothesis Trial (2026)
https://cornlab.pages.dev/
