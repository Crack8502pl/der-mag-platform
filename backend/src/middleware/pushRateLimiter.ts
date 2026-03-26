// src/middleware/pushRateLimiter.ts
// Rate limiter for push subscription endpoints

import rateLimit from 'express-rate-limit';

export const pushRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 subscription requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Zbyt wiele prób subskrypcji. Spróbuj ponownie za 15 minut.'
  }
});
