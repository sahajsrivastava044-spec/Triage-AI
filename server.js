// server.js
// Entry point for the ticket triage API. This file sets up Express routes, connects service modules,
// and starts the HTTP server. It powers the main workflow: receive requests, delegate work to
// services, and return JSON responses.

require("dotenv").config();
const express = require("express");
const db = require("./db");
const app = express();
const {classifyTickets} = require("./services/triage.service");
const {getStats} = require("./services/stats.service");
const {submitFeedback} = require("./services/feedback.service");
const {generateAccuracyReport} = require("./services/accuracy.service");

app.use(express.json());

// Root health endpoint. Useful to verify the API is running.
app.get("/", (req, res) => {
  res.send("Ticket Triage API Running");
});
// Main triage endpoint: accepts a batch of tickets, classifies them, and returns results.
app.post("/triage", async (req,res)=>{

    try{

        const result =
        await classifyTickets(req.body);

        res.json(result);

    }
    catch(error){

        res.status(500).json({
            error:error.message
        });

    }

});
// Statistics endpoint: returns aggregated metrics for ticket processing and costs.
app.get("/triage/stats", (req,res)=>{

    const stats = getStats();

    res.json(stats);

});
// Feedback endpoint: records human corrections for a single ticket.
app.post(
"/triage/:id/feedback",

(req,res)=>{

    try{

        const result =
        submitFeedback(

            req.params.id,

            req.body.corrected_category,

            req.body.corrected_priority,

            req.body.reviewer_id

        );

        res.json(result);

    }
    catch(error){

        res.status(400).json({
            error:error.message
        });

    }

});
// Accuracy endpoint: generates a report from submitted feedback.
app.get(
    "/triage/accuracy",
    (req,res)=>{

        const report =
        generateAccuracyReport();

        res.json(report);

    }
);



const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});