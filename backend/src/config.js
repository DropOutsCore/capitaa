// Central configuration. Everything tunable lives here so the demo is
// deterministic and easy to reason about.
export const config = {
  port: Number(process.env.PORT) || 4000,
  // Autonomous execution ceiling. Payments at or above this require human
  // escalation regardless of how confident the model is.
  autonomousLimitInr: Number(process.env.AUTONOMOUS_LIMIT_INR) || 100000,
  // Rate limiting window / ceiling for the public API surface.
  rateLimit: {
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 60,
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
};
