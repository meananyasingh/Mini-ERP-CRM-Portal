/**
 * Application-level error carrying an HTTP status code and, optionally, a list
 * of field-level errors formatted per the CONTRACT.md error envelope.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

module.exports = ApiError;
