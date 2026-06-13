# AI Ticket Triage Service

## Overview

Support teams often spend hours manually reviewing support tickets, assigning them to the correct team, and determining priority levels. This project automates that process using a Large Language Model (Google Gemini).

The service classifies support tickets in batches, stores results in SQLite, allows human reviewers to submit corrections, and generates accuracy reports to identify areas where the model performs poorly.

---

## Features

* Batch ticket classification using a single LLM call per batch
* Automatic category prediction
* Automatic priority prediction
* Team assignment recommendations
* SQLite persistence layer
* Human feedback workflow
* Accuracy reporting and analytics
* Batch processing statistics
* JSON export of classification results
* JSON export of accuracy reports

---

## Tech Stack

### Backend

* Node.js
* Express.js

### Database

* SQLite
* better-sqlite3

### AI Model

* Google Gemini

### Other Libraries

* dotenv
* fs

---

## Project Structure

```text
project-root/
│
├── server.js
├── db.js
├── triage.db
├── README.md
├── .env
├── .gitignore
├── triage_results.json
├── accuracy_report.json
│
├── services/
│   ├── triage.service.js
│   ├── stats.service.js
│   ├── feedback.service.js
│   └── accuracy.service.js
│
├── package.json
└── package-lock.json
```

---

## Database Schema

### tickets

Stores all classified tickets.

| Column          | Type    |
| --------------- | ------- |
| id              | TEXT    |
| description     | TEXT    |
| category        | TEXT    |
| priority        | TEXT    |
| assigned_team   | TEXT    |
| summary         | TEXT    |
| confidence      | REAL    |
| input_tokens    | INTEGER |
| output_tokens   | INTEGER |
| processing_time | INTEGER |

---

### feedback

Stores human corrections.

| Column             | Type    |
| ------------------ | ------- |
| ticket_id          | TEXT    |
| original_category  | TEXT    |
| corrected_category | TEXT    |
| original_priority  | TEXT    |
| corrected_priority | TEXT    |
| reviewer_id        | TEXT    |
| category_wrong     | INTEGER |
| priority_wrong     | INTEGER |

---

### batches

Stores batch-level processing statistics.

| Column          | Type    |
| --------------- | ------- |
| ticket_count    | INTEGER |
| processing_time | INTEGER |
| input_tokens    | INTEGER |
| output_tokens   | INTEGER |

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
```

Move into the project:

```bash
cd project-name
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the project root with a valid Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

If you prefer, you can also use:

```env
GOOGLE_API_KEY=your_api_key_here
```

Keep `.env` private and do not commit it to Git.

---

## Required Files After Clone

After cloning the repo, make sure these files exist in the project root:

* `server.js` - starts the Express server
* `db.js` - initializes the SQLite database
* `README.md` - documentation and setup instructions
* `.env` - local environment variables (create this yourself)
* `package.json` and `package-lock.json` - dependency configuration
*
* `services/triage.service.js` - Gemini integration and fallback logic

If a file is missing, re-clone the repository or copy the file from the repo.

---

## Setup Steps

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Move into the project folder:

```bash
cd ai-ticket-triage
```

3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file in the project root if it does not already exist.

5. Add your Gemini API key to the `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
```

6. Start the server:

```bash
node server.js
```

7. Open the service at:

```text
http://localhost:3000
```

---

## Common Errors and How to Fix Them

### `API key not valid`

This means the Gemini key is missing, invalid, or not enabled for `generativelanguage.googleapis.com`.

Fix:

* Verify `.env` contains `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
* Confirm the API key is valid in Google Cloud.
* Enable the Generative Language API in your Google Cloud project.

### `Cannot find module 'dotenv'`

Fix:

* Run `npm install` again in the project root.
* Make sure `dotenv` is listed in `package.json`.

### `Port 3000 is already in use`

Fix:

* Stop the other process using port 3000.
* Or change the port in `server.js`.

### `SyntaxError` or invalid JSON when calling `/triage`

Fix:

* Ensure your POST body is a JSON array.
* Use `Content-Type: application/json`.
* Validate JSON before sending.

### `Fallback classifier` logs appear

This means Gemini failed and the app used the built-in rule-based fallback instead.

Fix:

* Check the server log for the original Gemini error.
* Make sure your API key and model usage are correct.

---

## What to Keep in Mind

* Always keep your `.env` file out of version control.
* Use a valid Google Cloud API key with access to the Generative Language API.
* The app supports a fallback classifier if Gemini is unavailable, but the best results come from a working Gemini key.
* The SQLite database file (`triage.db`) is created automatically when the app runs.
* Use `node server.js` from the project root, not from another folder.

---

## Running the Application

Start the server:

```bash
node server.js
```

Server will run on:

```text
http://localhost:3000
```

---

## API Endpoints

### 1. Classify Tickets

**POST /triage**

Classifies a batch of support tickets.

Example Request:

```bash
curl -X POST http://localhost:3000/triage \
-H "Content-Type: application/json" \
-d '[
{
"id":"T001",
"description":"I was charged twice and need a refund."
},
{
"id":"T002",
"description":"API returns a 500 error during upload."
}
]'
```

Example Response:

```json
[
  {
    "id": "T001",
    "category": "Billing",
    "priority": "High",
    "assigned_team": "Billing Team",
    "summary": "Customer was charged twice",
    "confidence": 0.95
  }
]
```

---

### 2. Get Statistics

**GET /triage/stats**

Returns operational statistics.

Example Request:

```bash
curl http://localhost:3000/triage/stats
```

Example Response:

```json
{
  "totalTickets": 10,
  "totalBatches": 1,
  "averageProcessingTime": 1200
}
```

---

### 3. Submit Human Feedback

**POST /triage/:id/feedback**

Allows human reviewers to correct model predictions.

Example Request:

```bash
curl -X POST http://localhost:3000/triage/T001/feedback \
-H "Content-Type: application/json" \
-d '{
"corrected_category":"Billing",
"corrected_priority":"High",
"reviewer_id":"agent_1"
}'
```

Example Response:

```json
{
  "success": true,
  "categoryWrong": 0,
  "priorityWrong": 1
}
```

---

### 4. Generate Accuracy Report

**GET /triage/accuracy**

Returns model performance metrics.

Example Request:

```bash
curl http://localhost:3000/triage/accuracy
```

Example Response:

```json
{
  "reviewedTickets": 5,
  "categoryAccuracy": 80,
  "priorityAccuracy": 90,
  "worstCategory": "Technical"
}
```

---

## Output Files

### triage_results.json

Stores the latest classification results generated by the system.

### accuracy_report.json

Stores the latest accuracy report generated from reviewer feedback.

---

## Prompt Design

The model receives all tickets in a single prompt and returns a JSON array containing:

* Category
* Priority
* Assigned Team
* Summary
* Confidence Score

Using a single prompt ensures compliance with the assignment requirement of a single LLM call per batch.

---

## Temperature Setting

The model uses:

```text
temperature = 0
```

Reason:

Support ticket classification requires deterministic and consistent results rather than creativity. A temperature of 0 minimizes randomness and improves repeatability.

---

## Human Feedback Workflow

1. Ticket is classified by Gemini.
2. Classification is stored in SQLite.
3. Human reviewer submits corrections.
4. Corrections are stored in the feedback table.
5. Accuracy reports are generated from reviewer feedback.
6. Categories with poor performance are identified for future model improvements.

---

## Known Limitations

* Accuracy depends on the quality of the LLM output.
* Token usage tracking may vary depending on Gemini SDK support.
* Feedback currently supports one review per ticket.

---

## Future Improvements

* Fine-tuned classification prompts
* Multi-reviewer feedback support
* Dashboard UI
* Authentication and role management
* Historical accuracy trends
* Automated retraining workflow

```
```
