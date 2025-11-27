# @proventuslabs/retry-strategies

## Overview

A collection of delay strategies — including backoff and jitter algorithms — for retries, polling, and rate-limited operations. This package provides flexible, composable retry strategies based on industry-standard algorithms from AWS and other proven sources.

## Installation

```bash
npm install @proventuslabs/retry-strategies
```

## Usage

### Basic Usage

```typescript
import { retry, ExponentialBackoff } from "@proventuslabs/retry-strategies";

// Retry a failing operation with exponential backoff
const result = await retry(
  () => fetch("/api/data").then(res => res.json()),
  { strategy: new ExponentialBackoff(100, 5000) }
);
```

### Using Abort Signals

```typescript
import { retry, LinearBackoff } from "@proventuslabs/retry-strategies";

const controller = new AbortController();

// Abort after 10 seconds
setTimeout(() => controller.abort(), 10000);

try {
  const result = await retry(
    () => fetchData(),
    {
      strategy: new LinearBackoff(1000),
      signal: controller.signal
    }
  );
} catch (error) {
  // Handle abort or failure
}
```

### Custom Stop Condition

```typescript
import { retry, FibonacciBackoff } from "@proventuslabs/retry-strategies";

const result = await retry(
  () => fetch("/api/resource"),
  {
    strategy: new FibonacciBackoff(100, 10000),
    stop: (error, attempt) => {
      // Stop retrying on 404 or after 5 attempts
      return error.status === 404 || attempt >= 5;
    }
  }
);
```

## API

### `retry(fn, options)`

Attempts to execute a function repeatedly according to a backoff strategy until it succeeds, a provided stop condition is met, or an optional AbortSignal is triggered.

#### Parameters

- **`fn`** `() => T | Promise<T>` - The function to retry. Can be synchronous or return a promise.
- **`options`** `RetryOptions` - Configuration options:
  - **`strategy`** `BackoffStrategy` - Strategy for calculating delays between retries (required)
  - **`stop`** `(error: unknown, attempt: number) => boolean` - Optional function to determine whether to stop retrying. Return `true` to stop. (default: `() => false`)
  - **`signal`** `AbortSignal` - Optional AbortSignal to cancel the retry operation (default: `undefined`)

#### Returns

`Promise<T>` - A promise that resolves with the function's result if it eventually succeeds.

#### Throws

- **`unknown`** - The last encountered error if retries are exhausted or if the stop function returns `true`
- **`unknown`** - The reason of the AbortSignal if the operation is aborted (generally `DOMException` `AbortError`)
- **`RangeError`** - If the backoff strategy returns a delay exceeding INT32_MAX (2147483647ms, approximately 24.8 days)

### `waitFor(delay, signal?)`

Waits for the specified amount of time or until an optional AbortSignal is triggered.

#### Parameters

- **`delay`** `number` - Duration to wait in milliseconds. Negative values are treated as zero.
- **`signal`** `AbortSignal` - Optional AbortSignal to cancel the wait.

#### Returns

`Promise<void>` - A promise that resolves after the delay has elapsed or rejects if the signal is aborted.

#### Throws

- **`unknown`** - The reason of the AbortSignal if the operation is aborted (generally `DOMException` `AbortError`)
- **`RangeError`** - If the delay exceeds INT32_MAX (2147483647ms, approximately 24.8 days)

### `BackoffStrategy` Interface

All backoff strategies implement this interface:

```typescript
interface BackoffStrategy {
  /**
   * Calculate the next backoff delay in milliseconds.
   * Returns NaN to indicate that no further retries should be made.
   */
  nextBackoff(): number;

  /**
   * Reset to the initial state.
   */
  resetBackoff(): void;
}
```

## Backoff Strategies

### `ExponentialBackoff`

Increases the delay exponentially using the AWS algorithm.

**Formula:** `min(cap, base * 2^n)`

```typescript
const strategy = new ExponentialBackoff(
  100,   // base delay in ms
  5000   // cap (maximum delay) in ms
);
// Delays: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 5000ms, 5000ms...
```

### `LinearBackoff`

Increases the delay linearly by a fixed increment on each retry.

**Formula:** `initialDelay + (increment * n)`

```typescript
const strategy = new LinearBackoff(
  1000,  // increment in ms
  500    // initial delay in ms (optional, default: 0)
);
// Delays: 500ms, 1500ms, 2500ms, 3500ms, 4500ms...
```

### `FibonacciBackoff`

Increases the delay following the Fibonacci sequence.

**Formula:** `min(cap, base * fib(n))`

```typescript
const strategy = new FibonacciBackoff(
  100,   // base delay in ms
  10000  // cap (maximum delay) in ms
);
// Delays: 100ms, 100ms, 200ms, 300ms, 500ms, 800ms, 1300ms, 2100ms...
```

### `FullJitterBackoff`

Uses the AWS FullJitter algorithm to add randomness to exponential backoff, preventing thundering herd problems.

**Formula:** `random(0, min(cap, base * 2^n))`

```typescript
const strategy = new FullJitterBackoff(
  100,   // base delay in ms
  5000   // cap (maximum delay) in ms
);
// Delays: random values between 0 and the exponential cap
```

### `EqualJitterBackoff`

Uses the AWS EqualJitter algorithm, providing a balanced approach between exponential backoff and full jitter.

**Formula:** `(min(cap, base * 2^n) / 2) + random(0, min(cap, base * 2^n) / 2)`

```typescript
const strategy = new EqualJitterBackoff(
  100,   // base delay in ms
  5000   // cap (maximum delay) in ms
);
```

### `DecorrelatedJitterBackoff`

Uses the AWS Decorrelated Jitter algorithm, where each delay is based on the previous delay rather than attempt count.

**Formula:** `random(base, previousDelay * 3)`

```typescript
const strategy = new DecorrelatedJitterBackoff(
  100,   // base delay in ms
  10000  // cap (maximum delay) in ms
);
```

### `ConstantBackoff`

Always returns the same backoff delay, useful for fixed-interval polling.

```typescript
const strategy = new ConstantBackoff(1000); // Always 1000ms
```

### `ZeroBackoff`

Always returns zero delay, useful for immediate retries without waiting.

```typescript
const strategy = new ZeroBackoff(); // Always 0ms
```

### `StopBackoff`

Always returns `NaN`, indicating that no retries should be made.

```typescript
const strategy = new StopBackoff(); // Never retries
```

## Utility Functions

### `upto(retries, strategy)`

Limits a backoff strategy to a maximum number of retry attempts. Once the limit is reached, `nextBackoff()` returns `NaN` to stop retrying.

#### Parameters

- **`retries`** `number` - Maximum number of retry attempts allowed (must be >= 0 and an integer)
- **`strategy`** `BackoffStrategy` - The underlying backoff strategy to wrap

#### Returns

`BackoffStrategy` - A new BackoffStrategy that stops after the specified number of retries

#### Throws

- **`RangeError`** - If retries is NaN, not an integer, or less than 0

#### Example

```typescript
import { retry, ExponentialBackoff, upto } from "@proventuslabs/retry-strategies";

// Limit exponential backoff to exactly 3 retry attempts
const strategy = upto(3, new ExponentialBackoff(100, 5000));

await retry(
  () => fetchData(),
  { strategy }
);
// Will attempt the operation at most 4 times (initial + 3 retries)
```

You can also combine `upto` with any other backoff strategy:

```typescript
import { upto, FullJitterBackoff } from "@proventuslabs/retry-strategies";

// Limit jitter backoff to 5 attempts
const limitedJitter = upto(5, new FullJitterBackoff(100, 5000));

// Limit constant backoff to 10 attempts
const limitedPolling = upto(10, new ConstantBackoff(1000));
```

## Behavior

### Key Features

- **Composable strategies**: All strategies implement the same `BackoffStrategy` interface
- **AbortSignal support**: Cancel retry operations at any time
- **Custom stop conditions**: Define custom logic for when to stop retrying
- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Zero dependencies**: Pure JavaScript implementation with no external dependencies
- **Standards-based**: Uses native JavaScript APIs (`setTimeout`, `AbortSignal`, `Promise`)

### Retry Loop Behavior

The retry loop continues indefinitely until one of these conditions is met:

1. **Success**: The function executes without throwing an error
2. **Strategy exhaustion**: The backoff strategy returns `NaN`
3. **Stop condition**: The `stop` function returns `true`
4. **Abort signal**: The abort signal is triggered

### Edge Cases

- **Negative delays**: Treated as zero (no wait)
- **NaN from strategy**: Immediately stops retrying and throws the last error
- **Delays exceeding INT32_MAX**: Throws `RangeError` before attempting the wait
- **Synchronous functions**: Work seamlessly alongside asynchronous functions
- **Multiple retry instances**: Each `retry` call resets the strategy at the start

### Concurrency Safety

**Important:** The `retry` function is not concurrently safe when using stateful strategies. If you need to retry multiple operations in parallel, create separate strategy instances for each retry operation:

```typescript
// ❌ Not safe - shared strategy
const strategy = new ExponentialBackoff(100, 5000);
await Promise.all([
  retry(operation1, { strategy }),
  retry(operation2, { strategy })
]);

// ✅ Safe - separate strategies
await Promise.all([
  retry(operation1, { strategy: new ExponentialBackoff(100, 5000) }),
  retry(operation2, { strategy: new ExponentialBackoff(100, 5000) })
]);
```

## Examples

### Example 1: API Request with Exponential Backoff

```typescript
import { retry, ExponentialBackoff, upto } from "@proventuslabs/retry-strategies";

async function fetchUserData(userId: string) {
  return retry(
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    {
      // Limit to 5 retry attempts with exponential backoff
      strategy: upto(5, new ExponentialBackoff(100, 5000)),
      stop: (error) => {
        // Stop on client errors (4xx)
        return error.message.includes("HTTP 4");
      }
    }
  );
}
```

### Example 2: Polling with Linear Backoff

```typescript
import { retry, LinearBackoff, upto } from "@proventuslabs/retry-strategies";

async function pollForJobCompletion(jobId: string) {
  return retry(
    async () => {
      const job = await fetchJob(jobId);
      if (job.status === "pending") {
        throw new Error("Job not ready");
      }
      return job;
    },
    {
      // Limit to 20 attempts: 500ms, 1500ms, 2500ms...
      strategy: upto(20, new LinearBackoff(1000, 500))
    }
  );
}
```

### Example 3: Rate-Limited API with Jitter

```typescript
import { retry, FullJitterBackoff } from "@proventuslabs/retry-strategies";

async function callRateLimitedAPI(endpoint: string) {
  return retry(
    async () => {
      const response = await fetch(endpoint);
      if (response.status === 429) {
        // Too Many Requests
        throw new Error("Rate limited");
      }
      return response.json();
    },
    {
      // Jitter helps prevent thundering herd when multiple clients retry
      strategy: new FullJitterBackoff(1000, 30000),
      stop: (error, attempt) => !error.message.includes("Rate limited")
    }
  );
}
```

### Example 4: Fibonacci Backoff with Timeout

```typescript
import { retry, FibonacciBackoff } from "@proventuslabs/retry-strategies";

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await retry(
      () => fetch(url, { signal: controller.signal }),
      {
        strategy: new FibonacciBackoff(100, 5000),
        signal: controller.signal
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}
```

### Example 5: Immediate Retries with Custom Logic

```typescript
import { retry, ZeroBackoff } from "@proventuslabs/retry-strategies";

async function fetchWithTransientErrorRetry() {
  return retry(
    () => performOperation(),
    {
      strategy: new ZeroBackoff(), // No delay between retries
      stop: (error, attempt) => {
        // Only retry transient network errors, max 3 times
        const isTransient = error.code === "ECONNRESET" ||
                           error.code === "ETIMEDOUT";
        return !isTransient || attempt >= 3;
      }
    }
  );
}
```

## Limitations

- **Maximum delay**: Delays cannot exceed INT32_MAX (2147483647ms, approximately 24.8 days) due to `setTimeout` limitations
- **Not concurrency-safe**: Stateful strategies should not be shared across concurrent `retry` operations
- **No built-in attempt limit**: The `retry` function will continue indefinitely unless the strategy exhausts, the stop function returns `true`, or an abort signal is triggered. Use the `upto()` utility to limit attempts, provide a stop condition, or use strategies that eventually return `NaN`.
- **Randomness**: Jitter-based strategies use `Math.random()`, which is not cryptographically secure
- **Timing precision**: Actual delays may vary slightly due to JavaScript event loop timing

## Standards References

- [AWS Architecture Blog - Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [MDN - AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [MDN - setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
- [MDN - Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
