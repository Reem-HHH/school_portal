function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function safeError(err, fallback = 'Something went wrong') {
  if (!isProduction() && err?.message) return err.message;
  return fallback;
}

module.exports = { isProduction, safeError };
