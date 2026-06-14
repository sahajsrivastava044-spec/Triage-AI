// db.js
// Initializes the SQLite database for the ticket triage service.
// This file creates the required tables when the app starts and exports
// a shared `db` instance for the service modules to use.

const Database = require("better-sqlite3");

const db = new Database("triage.db");

// Tickets store the latest classification and metadata for each support request.
db.exec(`
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,

    category TEXT,
    priority TEXT,
    assigned_team TEXT,
    summary TEXT,
    confidence REAL,

    input_tokens INTEGER,
    output_tokens INTEGER,

    processing_time INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);


db.exec(`
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    ticket_id TEXT UNIQUE,

    original_category TEXT,
    corrected_category TEXT,

    original_priority TEXT,
    corrected_priority TEXT,

    reviewer_id TEXT,

    category_wrong INTEGER,
    priority_wrong INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(ticket_id)
    REFERENCES tickets(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    ticket_count INTEGER,

    processing_time INTEGER,

    input_tokens INTEGER,

    output_tokens INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;