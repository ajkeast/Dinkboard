// Wraps an async route handler so rejections flow to the central error handler.
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
