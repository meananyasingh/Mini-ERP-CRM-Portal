// Builds the success response envelope from CONTRACT.md section 2.
// `meta` is only attached when supplied (paginated list endpoints).
function success(res, data, statusCode = 200, meta) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

// Standard pagination meta block for list endpoints.
function paginationMeta(page, limit, total) {
  return { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}

module.exports = { success, paginationMeta };
