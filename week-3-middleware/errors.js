class NotFoundError extends Error {
  constructor(message = "Resource Not Found") {
    super(message);

    this.name = "NotFoundError";
    this.statusCode = 404;

    Error.captureStackTrace(this, this.constructor);
  }
}
class ValidationError extends Error {
  constructor(message = "Invalid Request Data") {
    super(message);

    this.name = "ValidationError";
    this.statusCode = 400;

    Error.captureStackTrace(this, this.constructor);
  }
}
class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);

    this.name = "UnauthorizedError";
    this.statusCode = 401;

    Error.captureStackTrace(this, this.constructor);
  }
}
class InternalServerError extends Error {
  constructor(message = "Unauthorized") {
    super(message);

    this.name = "UnauthorizedError";
    this.statusCode = 401;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  InternalServerError,
};
