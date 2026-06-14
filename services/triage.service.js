// services/triage.service.js
// Responsible for classifying support tickets using Google Gemini.
// This file is part of the main workflow: it receives incoming tickets from the API,
// sends them to the model in a single prompt, parses the JSON response, stores results,
// and falls back to a simple rule-based classifier when Gemini is unavailable.

const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../db");
const fs = require("fs");

// Use either GEMINI_API_KEY or GOOGLE_API_KEY from .env. If neither exists, fail early.
const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

if (!geminiApiKey) {
    throw new Error(
        "Missing Gemini API key. " +
        "Set GEMINI_API_KEY or GOOGLE_API_KEY to a valid Google Cloud API key " +
        "and enable generativelanguage.googleapis.com."
    );
}

// Create a Google Gemini client once and reuse it for all classify requests.
const genAI = new GoogleGenerativeAI(geminiApiKey);

async function classifyTickets(tickets) {

    // Track how long the batch takes so we can store performance metrics.
    const start = Date.now();

    let results = [];
    let inputTokens = 0;
    let outputTokens = 0;

    try {

        // Create a generative model instance for Gemini.
        // `gemini-2.5-flash` is the chosen model for deterministic classification output.
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

        const prompt = `
You are a support ticket triage assistant.

Classify each ticket.

Allowed categories:
- Billing
- Technical
- Account
- Feature Request
- Other

Allowed priorities:
- Low
- Medium
- High
- Critical

Return ONLY a valid JSON array.

Example:

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

Tickets:

${JSON.stringify(tickets, null, 2)}
`;

        // Send the prompt to Gemini and parse the returned JSON string.
        const response =
            await model.generateContent(prompt);

        const text =
            response.response.text();

        const cleaned = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        // Parse the model output into a JS array of ticket classifications.
        results = JSON.parse(cleaned);

        console.log(
            "Gemini classification successful"
        );

    } catch (error) {

        // If Gemini fails, log the error and use the built-in fallback.
        console.log("GEMINI ERROR:");

        console.log(error.message);

        console.log(
            "Gemini unavailable, using fallback classifier"
        );

        // Fallback classifier: simple keyword rules to keep the service working even without Gemini.
        results = tickets.map(ticket => {

            const text =
                ticket.description.toLowerCase();

            let category = "Other";

            if (
                text.includes("charge") ||
                text.includes("refund") ||
                text.includes("invoice")
            ) {
                category = "Billing";
            }
            else if (
                text.includes("login") ||
                text.includes("password") ||
                text.includes("account")
            ) {
                category = "Account";
            }
            else if (
                text.includes("error") ||
                text.includes("crash") ||
                text.includes("api")
            ) {
                category = "Technical";
            }
            else if (
                text.includes("feature") ||
                text.includes("add") ||
                text.includes("would love")
            ) {
                category = "Feature Request";
            }

            let assignedTeam =
                "Customer Success";

            if (category === "Billing") {
                assignedTeam = "Billing Team";
            }
            else if (category === "Technical") {
                assignedTeam = "Engineering";
            }
            else if (
                category === "Feature Request"
            ) {
                assignedTeam = "Product";
            }

            let priority = "Medium";

            if (
                text.includes("urgent") ||
                text.includes("immediately") ||
                text.includes("charged twice")
            ) {
                priority = "High";
            }

            if (
                text.includes("500 error") ||
                text.includes("crash")
            ) {
                priority = "Critical";
            }

            return {
                id: ticket.id,
                category,
                priority,
                assigned_team: assignedTeam,
                summary: ticket.description.substring(0, 50),
                confidence: 0.80
            };
        });
    }

    // Calculate end-to-end processing time for the whole batch.
    const processingTime =
        Date.now() - start;

    const insertBatch = db.prepare(`
        INSERT INTO batches (
            ticket_count,
            processing_time,
            input_tokens,
            output_tokens
        )
        VALUES (?, ?, ?, ?)
    `);

    insertBatch.run(
        tickets.length,
        processingTime,
        inputTokens,
        outputTokens
    );

    // Save each ticket classification in the tickets table.
    // This ensures we can review results later and support feedback workflows.
    const insertTicket = db.prepare(`
        INSERT OR REPLACE INTO tickets (
            id,
            description,
            category,
            priority,
            assigned_team,
            summary,
            confidence,
            input_tokens,
            output_tokens,
            processing_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const result of results) {

        const originalTicket =
            tickets.find(
                ticket =>
                    ticket.id === result.id
            );

        insertTicket.run(
            result.id,
            originalTicket?.description || "",
            result.category,
            result.priority,
            result.assigned_team,
            result.summary,
            result.confidence,
            inputTokens,
            outputTokens,
            processingTime
        );
    }

    // Persist the latest batch results to JSON so they can be inspected outside the database.
    fs.writeFileSync(
        "triage_results.json",
        JSON.stringify(
            results,
            null,
            2
        )
    );

    return results;
}

module.exports = {
    classifyTickets
};