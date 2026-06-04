


# Alpha Result

Alpha Result is a student-focused platform built for Bihar Engineering University (BEU) students to access Previous Year Questions (PYQs), Solutions, Results, Notices, SGPA Calculator, and other academic resources in one place.

---

## Features

### PYQ Library

* Branch & Semester wise PYQs
* Multiple exam types:

  * END-SEM
  * MID-SEM
  * NPTEL
  * QUIZ
  * PRACTICE
* Regular / Special / Complement papers
* PDF Downloads

### Solutions Platform

* Text-based solutions
* Image-based solutions
* Markdown support
* LaTeX support
* Objective & Subjective questions
* Single and Multi-question structures

### Missing Papers System

Allows students to contribute missing papers.

Workflow:

Missing → Under Review → Approved

Features:

* Student uploads
* Admin review
* PDF validation
* Community contribution model

### Notices

* Fetches notices from BEU
* Stores notices locally
* Future support:

  * Browser notifications
  * Telegram alerts
  * Email alerts

### User System

* Authentication
* Profile management
* Contribution tracking

### Admin Panel

* Manage semesters
* Manage branches
* Manage subjects
* Manage papers
* Review submissions
* Manage notices

---

# Tech Stack

## Frontend

* Next.js 14
* TypeScript
* Tailwind CSS
* React Query
* Sonner
* Lucide Icons

## Backend

* FastAPI
* Python
* MongoDB
* APScheduler (Local)
* GitHub Actions Scheduler (Production)

## Storage

* Cloudinary

  * Paper PDFs
  * Solution Images

## Deployment

Frontend:

* Vercel

Backend:

* Vercel

Database:

* MongoDB Atlas

---

# Project Structure

frontend/
├── app/
├── components/
├── lib/
├── public/

backend/
├── app/
├── admin/
├── public/
├── public2/
├── services/
├── database/
├── utils/

---

# Solution Architecture

Solutions support both text and image blocks.

Old format:

{
"solution_md": "text solution"
}

New format:

{
"solution_blocks": [
{
"type": "text",
"content": "Explanation"
},
{
"type": "image",
"image_url": "..."
}
]
}

Backward compatibility is maintained.

If solution_blocks exist:

* Render blocks

Else:

* Render solution_md

---

# Notice Automation

Current Flow:

BEU Notice API
↓
Scheduler
↓
Alpha Result Backend
↓
MongoDB
↓
Telegram Channel
↓
Browser Notifications

Production Scheduler:

* GitHub Actions

Schedule:

* Every 10 minutes

---

# Environment Variables

Frontend

NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_ONESIGNAL_APP_ID=

Backend

MONGO_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

CRON_SECRET=

---

# Local Development

Frontend

npm install
npm run dev

Backend

pip install -r requirements.txt
uvicorn app.main:app --reload

---

# Contribution Guidelines

Before pushing code:

1. Create a feature branch
2. Test locally
3. Create Pull Request
4. Review changes
5. Merge into main

Branch naming:

feature/xyz
fix/xyz
hotfix/xyz

Examples:

feature/missing-papers
feature/notice-alerts
fix/solution-rendering

---

# Future Roadmap

Interactive Quiz Mode

Convert objective questions into an interactive quiz experience.

Features:

Attempt MCQs directly on the platform
Instant answer checking
Explanations after submission
Topic-wise practice
Exam simulation mode
Accuracy tracking


*AI Solution Evaluator

Allow students to evaluate their own answers using AI.

Workflow:

Question
↓
Student writes answer OR uploads answer image
↓
AI compares with model solution
↓
Generates feedback

Features:

Accuracy percentage score
Missing points detection
Strengths and weaknesses analysis
Improvement suggestions
Marks estimation
Handwritten answer evaluation (image upload)

Example Output:

Accuracy Score: 82%

Covered:
✔ Definition
✔ Diagram
✔ Advantages

Missing:
✘ Limitations
✘ Real-world examples

Estimated Marks:
11 / 14

* Contributor Leaderboard
* Advanced Search

---

# Maintainers

Alpha Result Team

Built to help BEU students learn faster, prepare better, and help their juniors.






<!-- 
git config --global user.email
git config --global user.name

git config --global user.email "new-vercel-email@gmail.com"


npm install react-select

time = datetime.now(timezone.utc).replace(tzinfo=None) -->