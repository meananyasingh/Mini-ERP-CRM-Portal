const { validationResult } = require('express-validator');

// Runs after express-validator's check chains. Formats failures into the
// `errors: [{ field, message }]` shape from CONTRACT.md section 2 and
// responds 400; otherwise passes control to the controller.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array({ onlyFirstError: true }).map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
}

module.exports = validate;
