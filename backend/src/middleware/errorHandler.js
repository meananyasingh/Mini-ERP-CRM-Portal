const ApiError = require('../utils/ApiError');

// Catches unmatched routes and forwards a 404 ApiError to the central handler.
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler — the last middleware in the stack. Normalizes
// ApiError instances, Sequelize errors, and anything unexpected into the
// response envelope from CONTRACT.md section 2.
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'A record with this value already exists';
    errors = (err.errors || []).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = (err.errors || []).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  if (statusCode >= 500) {
    // Unexpected failures are logged server-side; the client only sees a generic message.
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
    }
  }

  const body = { success: false, message };
  if (errors && errors.length) {
    body.errors = errors;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
