const AppError = require('../utils/AppError');

// Validates req[source] against a Zod schema and replaces it with the parsed value.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new AppError(400, 'Validation failed', details));
  }
  if (source === 'body') req.body = result.data;
  else req.validated = { ...req.validated, [source]: result.data };
  next();
};

module.exports = validate;
