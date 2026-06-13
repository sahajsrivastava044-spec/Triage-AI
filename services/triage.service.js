const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../db");
const fs = require("fs");

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

const genAI = new GoogleGenerativeAI(geminiApiKey);

async function classifyTickets(tickets) {

    const start = Date.now();

    let results = [];
    let inputTokens = 0;
    let outputTokens = 0;

    try {

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

        const response =
            await model.generateContent(prompt);

        const text =
            response.response.text();

        const cleaned = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        results = JSON.parse(cleaned);

        console.log(
            "Gemini classification successful"
        );

    } catch (error) {

        console.log("GEMINI ERROR:");

        console.log(error.message);

        console.log(
            "Gemini unavailable, using fallback classifier"
        );

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