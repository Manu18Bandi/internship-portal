/**
 * Request validation middleware.
 * Small schema-less validators: requireFields, requireId, requireEnum.
 * All failures produce 400 with a list of field errors.
 */
const { ApiError, asyncHandler } = require('./error');

const isNonEmptyString = (v) => v !== undefined && v !== null && String(v).trim().length > 0;
const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

/** Validates that every listed field is present and non-empty. */
function requireFields(...fields) {
  return (req, _res, next) => {
    const missing = fields.filter((f) => !isNonEmptyString(req.body?.[f]));
    if (missing.length) {
      return next(new ApiError(400, 'Validation failed', {
        fields: missing.reduce((acc, f) => ({ ...acc, [f]: `${f} is required` }), {}),
      }));
    }
    next();
  };
}

/** Validates :id (and any other id params) are positive integers. */
function requireIds(...params) {
  return (req, _res, next) => {
    const bad = params.filter((p) => !isPositiveInt(req.params[p]));
    if (bad.length) {
      return next(new ApiError(400, 'Validation failed', {
        params: bad.reduce((acc, p) => ({ ...acc, [p]: `${p} must be a positive integer` }), {}),
      }));
    }
    next();
  };
}

/** Validates body fields against allowed enum values. */
function requireEnum(field, allowed, { optional = false } = {}) {
  return (req, _res, next) => {
    const value = req.body?.[field];
    if (value === undefined || value === '') {
      return optional ? next() : next(new ApiError(400, 'Validation failed', {
        fields: { [field]: `${field} is required` },
      }));
    }
    if (!allowed.includes(value)) {
      return next(new ApiError(400, 'Validation failed', {
        fields: { [field]: `${field} must be one of: ${allowed.join(', ')}` },
      }));
    }
    next();
  };
}

/** Validates an optional numeric field (e.g. cgpa, stipend) within bounds. */
function optionalNumber(field, { min = -Infinity, max = Infinity } = {}) {
  return (req, _res, next) => {
    const value = req.body?.[field];
    if (value === undefined || value === null || value === '') return next();
    const n = Number(value);
    if (Number.isNaN(n) || n < min || n > max) {
      return next(new ApiError(400, 'Validation failed', {
        fields: { [field]: `${field} must be a number between ${min} and ${max}` },
      }));
    }
    req.body[field] = n;
    next();
  };
}

/** Verifies a referenced parent row exists (e.g. internship_id in internships). */
const assertExists = (table, param, field) =>
  asyncHandler(async (req, _res, next) => {
    const db = require('../config/db');
    const id = req.body?.[param] ?? req.params[param];
    if (id === undefined) return next();
    const rows = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (!rows.length) {
      return next(new ApiError(400, 'Validation failed', {
        fields: { [field]: `${field} ${id} does not exist` },
      }));
    }
    next();
  });

module.exports = { requireFields, requireIds, requireEnum, optionalNumber, assertExists };
