/**
 * Token bucket rate limiter
 * Ensures we don't exceed API rate limits
 */
export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.windowMs) {
      this.tokens = this.maxRequests;
      this.lastRefill = now;
    } else {
      const tokensToAdd = (elapsed / this.windowMs) * this.maxRequests;
      this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async wait() {
    this._refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    const timeToWait = this.windowMs - (Date.now() - this.lastRefill);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this._refill();
        this.tokens -= 1;
        resolve();
      }, timeToWait);
    });
  }
}
