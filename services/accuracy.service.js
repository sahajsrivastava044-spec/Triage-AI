const db = require("../db");

function generateAccuracyReport(){
const overall = db.prepare(`
SELECT

COUNT(*) as reviewed,

SUM(category_wrong) as categoryMistakes,

SUM(priority_wrong) as priorityMistakes

FROM feedback
`).get();

const categoryAccuracy =

overall.reviewed === 0

? 100

: Number(
(
 (overall.reviewed - overall.categoryMistakes)
 /
 overall.reviewed
) * 100
).toFixed(2);

const priorityAccuracy =

overall.reviewed === 0

? 100

: Number(
(
 (overall.reviewed - overall.priorityMistakes)
 /
 overall.reviewed
) * 100
).toFixed(2);

const categoryPerformance =
db.prepare(`
SELECT

original_category,

COUNT(*) as reviewed,

SUM(category_wrong) as mistakes

FROM feedback

GROUP BY original_category
`).all();

const categories = {};

let worstCategory = null;
let lowestAccuracy = 101;

for(const item of categoryPerformance){

    const accuracy =

    (
        (item.reviewed - item.mistakes)
        /
        item.reviewed
    ) * 100;

    if(accuracy < lowestAccuracy){

        lowestAccuracy = accuracy;

        worstCategory =
        item.original_category;

    }

    categories[item.original_category] = {

        reviewed: item.reviewed,

        mistakes: item.mistakes,

        accuracy:
        Number(
            accuracy.toFixed(2)
        )

    };

}

const fs = require("fs");

const report = {

    reviewedTickets:
    overall.reviewed,

    categoryAccuracy,

    priorityAccuracy,

    worstCategory,

    categories

};

fs.writeFileSync(
    "accuracy_report.json",
    JSON.stringify(
        report,
        null,
        2
    )
);


return report;
}

module.exports = {
    generateAccuracyReport
};