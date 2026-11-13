/**
 * Centralized error handling.
 *  - ApiError: operational errors with an intended HTTP status
 *  - notFound: 404 for unmatched routes
 *  - errorHandler: final middleware — one consistent JSON error shape
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/** 404 handler for unmatched API routes. */
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/** Final error middleware — must have 4 args for Express to detect it. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // MySQL duplicate key
  if (err && err.code === 'ER_DUP_ENTRY') {
    err = new ApiError(409, 'Duplicate entry — the record already exists.');
  }
  // MySQL invalid enum / bad value / FK failure
  if (err && ['ER_BAD_NULL_ERROR', 'ER_NO_REFERENCED_ROW_2', 'ER_TRUNCATED_WRONG_VALUE'].includes(err.code)) {
    err = new ApiError(400, 'Invalid value for one or more fields.', err.sqlMessage);
  }
  // Multer file size
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    err = new ApiError(413, 'File too large. Maximum size is 5 MB.');
  }

  const status = err.statusCode || (err.isDbError ? 500 : 400);
  const isServer = status >= 500;

  if (isServer) console.error('[ERROR]', err);

  res.status(status).json({
    error: {
      message: isServer ? 'Internal server error' : err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(isServer && process.env.NODE_ENV !== 'production' && err.sqlMessage
        ? { sqlMessage: err.sqlMessage }
        : {}),
    },
  });
}

/** Wraps async route handlers so rejected promises reach errorHandler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, notFound, errorHandler, asyncHandler };
