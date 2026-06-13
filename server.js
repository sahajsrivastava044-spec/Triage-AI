require("dotenv").config();
const express = require("express");
const db = require("./db");
const app = express();
const {classifyTickets} = require("./services/triage.service");
const {getStats} = require("./services/stats.service");
const {submitFeedback} = require("./services/feedback.service");
const {generateAccuracyReport} = require("./services/accuracy.service");

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Ticket Triage API Running");
});
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
app.get("/triage/stats", (req,res)=>{

    const stats = getStats();

    res.json(stats);

});
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
app.get(
    "/triage/accuracy",
    (req,res)=>{

        const report =
        generateAccuracyReport();

        res.json(report);

    }
);

app.get("/test-claude", async (req,res)=>{

    try{

        const response = await axios.post(
            "https://api.anthropic.com/v1/messages",
            {
                model: "claude-sonnet-4-20250514",
                max_tokens: 100,
                messages:[
                    {
                        role:"user",
                        content:"Say hello"
                    }
                ]
            },
            {
                headers:{
                    "x-api-key": process.env.CLAUDE_API_KEY,
                    "anthropic-version":"2023-06-01",
                    "content-type":"application/json"
                }
            }
        );

        res.json(response.data);

    }
    catch(error){

        res.status(500).json({
            error:error.response?.data || error.message
        });

    }

});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});