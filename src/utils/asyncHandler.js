const asynchandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    const statusCode =
      error.statusCode ||
      error.statuscode ||
      (typeof error.code === "number" && error.code >= 100 && error.code < 1000
        ? error.code
        : 500);

    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Internal server error",
      errors: error.errors || [],
    });
  }
};

export { asynchandler };