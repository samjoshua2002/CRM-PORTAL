const errorHandler = (err, req, res, next) => {
  console.error('An error occurred:', err.stack);

  // Default error response
  const errorResponse = {
    success: false,
    error: 'An unexpected error occurred',
    message: err.message || 'Internal Server Error',
  };

  // Set status code
  let statusCode = err.statusCode || 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = 'Validation failed';
    errorResponse.details = err.details;
  } else if (err.name === 'DatabaseError') {
    statusCode = 503;
    errorResponse.error = 'Database operation failed';
  } else if (err.name === 'AuthorizationError') {
    statusCode = 403;
    errorResponse.error = 'Not authorized';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse.error = 'Resource not found';
  }

  // In development, send detailed error
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
