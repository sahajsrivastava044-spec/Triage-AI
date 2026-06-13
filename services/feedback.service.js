const db = require("../db");

function submitFeedback(
    ticketId,
    correctedCategory,
    correctedPriority,
    reviewerId
){
    const ticket = db.prepare(`
SELECT *
FROM tickets
WHERE id = ?
`).get(ticketId);

if(!ticket){

    throw new Error(
        "Ticket not found"
    );

}

const existingFeedback =
db.prepare(`
SELECT *
FROM feedback
WHERE ticket_id = ?
`).get(ticketId);

if(existingFeedback){

    throw new Error(
        "Feedback already exists"
    );

}

const categoryWrong =

ticket.category !==
correctedCategory

? 1 : 0;

const priorityWrong =

ticket.priority !==
correctedPriority

? 1 : 0;

const insertFeedback =
db.prepare(`
INSERT INTO feedback (

    ticket_id,

    original_category,
    corrected_category,

    original_priority,
    corrected_priority,

    reviewer_id,

    category_wrong,
    priority_wrong

)

VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

insertFeedback.run(

    ticketId,

    ticket.category,
    correctedCategory,

    ticket.priority,
    correctedPriority,

    reviewerId,

    categoryWrong,
    priorityWrong

);

return {

    success: true,

    categoryWrong,

    priorityWrong

};
}

module.exports = {
    submitFeedback
};