// Wraps an async Express handler so rejected promises are forwarded to next(),
// keeping controllers free of repetitive try/catch blocks.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
