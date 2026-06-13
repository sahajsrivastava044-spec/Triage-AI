const db = require("../db");

function getStats() {
    const totalTickets =
    db.prepare(`
        SELECT COUNT(*) as total
        FROM tickets
        `).get();
    const totalBatches =
        db.prepare(`
        SELECT COUNT(*) as total
        FROM batches
        `).get();
    const avgProcessingTime =
        db.prepare(`
        SELECT AVG(processing_time) as avg
        FROM batches
        `).get();
    const categoryDistribution =
        db.prepare(`
        SELECT
            category,
            COUNT(*) as count
        FROM tickets
        GROUP BY category
        `).all();
    const distribution = {};

        for(const item of categoryDistribution){

            distribution[item.category] = {

                count: item.count,

                percentage:
                Number(
                    (
                        item.count /
                        totalTickets.total
                    ) * 100
                ).toFixed(2)

            };

        }

        const tokenStats =
db.prepare(`
SELECT
SUM(input_tokens) as inputTokens,
SUM(output_tokens) as outputTokens
FROM batches
`).get();

const estimatedCost =

(
  (tokenStats.inputTokens || 0)
  * 3
  / 1000000
)

+

(
  (tokenStats.outputTokens || 0)
  * 15
  / 1000000
);
    return {
        totalTickets:
    totalTickets.total,

    totalBatches:
    totalBatches.total,

    averageProcessingTime:
    avgProcessingTime.avg,

    distribution,

    estimatedCost
    };
}

module.exports = {
    getStats
};