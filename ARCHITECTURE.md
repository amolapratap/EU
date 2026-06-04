# ARCHITECTURE.md

# Alpha Result Architecture

Version: 2026

Purpose:
This document explains the complete architecture of Alpha Result, including frontend, backend, database structure, storage, deployment, automation workflows, and future scalability plans.

---

# 1. System Overview

Alpha Result is an academic platform built primarily for Bihar Engineering University (BEU) students.

The platform provides:

* Previous Year Questions (PYQs)
* Solutions
* Results
* Notices
* Missing Paper Contributions
* SGPA/CGPA Calculator
* Admin Management System

Future:

* Interactive Quiz System
* AI Solution Evaluation
* Browser Push Notifications
* Telegram Alerts
* Mobile Applications

---

# 2. High Level Architecture

Student Browser
↓
Next.js Frontend (Vercel)
↓
FastAPI Backend (Vercel)
↓
MongoDB Atlas
↓
Cloudinary Storage

External Integrations:

BEU APIs
↓
Notice Sync Service

GitHub Actions
↓
Notice Scheduler

Telegram Bot
↓
Alert Distribution

OneSignal
↓
Browser Notifications

---

# 3. Frontend Architecture

Framework:

* Next.js 14
* TypeScript
* Tailwind CSS

Location:

frontend/

Main Directories:

frontend/
├── app/
├── components/
├── lib/
├── public/

---

# 4. Route Groups

Public Routes

app/(user)/

Examples:

/results
/pyq
/sgpa-calculator
/notices
/contact-us

Admin Routes

app/admin/

Examples:

/admin
/admin/papers
/admin/subjects
/admin/missing-papers

---

# 5. Authentication Flow

User Login
↓
Backend Verification
↓
JWT Generation
↓
Token Stored
↓
Protected Requests

Roles:

student
admin
superalpha

Authorization handled in:

lib/auth

Backend:

Depends(get_current_admin)

---

# 6. Database Architecture

Database:

MongoDB Atlas

Collections:

users
semesters
branches
subjects
papers
missing_papers
notices
newsletter_subscribers
contact_messages

---

# 7. Paper Architecture

Collection:

papers

Document:

{
"_id": "...",

"subject_code": "105305",

"name": "Operating System",

"type": "END-SEM",

"year": 2024,

"description": "",

"paper_pdf": "",

"questions": []
}

---

# 8. Question Structure

Question Types:

Objective
Subjective

Question Structures:

single
multi

Examples:

Single:

Q7
↓
Question
↓
Solution

Multi:

Q2
↓
(a)
(b)

Each sub-question has its own solution.

---

# 9. Solution Architecture

Legacy Structure

{
"solution_md": "Text Solution"
}

Still supported.

---

New Rich Solution Structure

{
"solution_blocks": [

```
{
  "id": "...",
  "type": "text",
  "content": "Explanation"
},

{
  "id": "...",
  "type": "image",
  "image_url": "...",
  "caption": "Diagram"
}
```

]
}

Rendering Logic:

If solution_blocks exists:
→ Render blocks

Else:
→ Render solution_md

Backward compatibility maintained.

---

# 10. Objective Question Structure

{
"question_md": "...",

"options": [
"...",
"...",
"...",
"..."
],

"correct_index": 2,

"solution_md": "..."
}

Future:

Quiz Mode uses same schema.

---

# 11. Missing Papers Architecture

Collection:

missing_papers

Workflow:

missing
↓
under_review
↓
approved

Rejected papers can be re-uploaded.

Students can contribute directly.

Admins review manually.

---

# 12. Missing Paper Upload Flow

Student Upload
↓
Temporary Cloudinary Upload
↓
Status = under_review
↓
Admin Review

Approve:
↓
Branding Pipeline
↓
Move to Papers Collection

Reject:
↓
Status = rejected

Delete:
↓
Cloudinary Delete
↓
Database Cleanup

---

# 13. Cloudinary Architecture

Storage Types

PDFs

BEU/pyq/

Solutions

alpha_result/solutions/

Examples:

alpha_result/solutions/105502/q_3/img_1

alpha_result/solutions/105502/q_3/sub_a/img_1

Overwrite strategy used.

Re-uploading same image updates existing resource.

No orphan image growth.

---

# 14. Notice Architecture

Source:

BEU Notice API

https://beu-bih.ac.in/backend/v1/notice/get-notice-board

Flow:

BEU
↓
Scheduler
↓
MongoDB
↓
Telegram
↓
OneSignal

Only new notices inserted.

Duplicate prevention enabled.

---

# 15. Scheduler Architecture

Local:

APScheduler

Production:

GitHub Actions

Workflow:

.github/workflows/check_notices.yml

Runs every 10 minutes.

Calls:

/cron/check-notices

---

# 16. Telegram Alert System

Flow:

New Notice
↓
Generate Message
↓
Telegram Bot
↓
Telegram Channel

Purpose:

Fastest notice delivery.

---

# 17. Browser Notification System

Provider:

OneSignal

Flow:

New Notice
↓
Backend Trigger
↓
OneSignal API
↓
Browser Notification

Status:

Integration in progress.

---

# 18. Newsletter System

Collection:

newsletter_subscribers

Stores:

{
email,
created_at
}

Purpose:

Future email campaigns.

---

# 19. Contact Us System

Collection:

contact_messages

Stores:

name
email
subject
message

Used for support and feedback.

---

# 20. Deployment Architecture

Frontend

Vercel

Backend

Vercel

Database

MongoDB Atlas

Storage

Cloudinary

Scheduler

GitHub Actions

---

# 21. Environment Variables

Frontend

NEXT_PUBLIC_API_URL

NEXT_PUBLIC_ONESIGNAL_APP_ID

---

Backend

MONGO_URI

JWT_SECRET

CLOUDINARY_CLOUD_NAME

CLOUDINARY_API_KEY

CLOUDINARY_API_SECRET

TELEGRAM_BOT_TOKEN

TELEGRAM_CHAT_ID

CRON_SECRET

---

# 22. Development Workflow

Create Branch

feature/xyz

Examples:

feature/solution-images

feature/notice-alerts

feature/quiz-mode

fix/solution-rendering

hotfix/auth-bug

---

Pull Request

Feature Branch
↓
PR
↓
Review
↓
Merge

---

# 23. Future Roadmap

Interactive Quiz System

* Objective questions as quizzes
* Instant scoring
* Exam simulation

---

AI Solution Evaluator

Student Answer
↓
AI Evaluation
↓
Accuracy %

Example:

Accuracy: 82%

Estimated Marks: 11/14

Missing Points:

* Deadlock Recovery
* Resource Allocation Graph

Supports:

* Text answers
* Handwritten answer images

---

AI Study Assistant

* PYQ doubt solving
* Notes generation
* Revision assistance

---

Contributor System

* Badges
* Rankings
* Recognition

---

Mobile App

Android
iOS

---

# 24. Long-Term Vision

Alpha Result is evolving from a PYQ repository into a complete AI-powered academic ecosystem where students can:

Learn
Practice
Evaluate
Improve
Contribute

all from a single platform.

End of Document.
