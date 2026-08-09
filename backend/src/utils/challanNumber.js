// Generates a human-readable challan number from the auto-increment id
// assigned by Postgres on insert, e.g. id 1 -> "CH-000001".
function generateChallanNumber(id) {
  return `CH-${String(id).padStart(6, '0')}`;
}

module.exports = generateChallanNumber;
