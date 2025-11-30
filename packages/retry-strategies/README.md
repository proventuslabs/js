# @proventuslabs/retry-strategies

## Overview

A collection of delay strategies — including backoff and jitter algorithms — for retries, polling, and rate-limited operations. This package provides flexible, composable retry strategies based on industry-standard algorithms from AWS and other proven sources.

## Installation

```bash
npm install @proventuslabs/retry-strategies
```

## Usage

### API Styles

This package supports both **class-based** and **functional** API styles. Factory functions (lowercase) are convenience wrappers that create identical instances:

```typescript
// Class-based style
import { ExponentialBackoff, UptoBackoff } from "@proventuslabs/retry-strategies";
const strategy = new ExponentialBackoff(100, 5000);
const limited = new UptoBackoff(3, strategy);

// Functional style (equivalent)
import { exponential, upto } from "@proventuslabs/retry-strategies";
const strategy = exponential(100, 5000);
const limited = upto(3, strategy);
```

### Basic Usage

```typescript
import { retry, exponential } from "@proventuslabs/retry-strategies";

// Retry a failing operation with exponential backoff
const result = await retry(
  () => fetch("/api/data").then(res => res.json()),
  { strategy: exponential(100, 5000) }
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

### `upto(retries, strategy)`

Limits a backoff strategy to a maximum number of retry attempts. Once the limit is reached, `nextBackoff()` returns `NaN` to stop retrying.

#### Parameters

- **`retries`** `number` - Maximum number of retry attempts allowed (must be >= 0 and an integer)
- **`strategy`** `BackoffStrategy` - The underlying backoff strategy to wrap

#### Returns

`UptoBackoff<T>` - A new UptoBackoff instance that stops after the specified number of retries

#### Throws

- **`RangeError`** - If retries is NaN, not an integer, or less than 0

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

All strategies are available in both class-based and functional styles. Examples below show the functional style for brevity.

### `ExponentialBackoff` / `exponential()`

Increases the delay exponentially using the AWS algorithm.

**Formula:** `min(cap, base * 2^n)`

```typescript
const strategy = exponential(100, 5000);
// Parameters:
//   base: 100       - base delay in ms
//   cap: 5000       - cap (maximum delay) in ms (optional, defaults to Infinity)
// Delays: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 5000ms, 5000ms...
```

### `LinearBackoff` / `linear()`

Increases the delay linearly by a fixed increment on each retry.

**Formula:** `min(cap, initialDelay + (increment * n))`

```typescript
const strategy = linear(1000, 500, 10000);
// Parameters:
//   increment: 1000       - increment in ms
//   initialDelay: 500     - initial delay in ms (optional, default: 0)
//   cap: 10000            - cap (maximum delay) in ms (optional, defaults to Infinity)
// Delays: 500ms, 1500ms, 2500ms, 3500ms, 4500ms...
```

### `FibonacciBackoff` / `fibonacci()`

Increases the delay following the Fibonacci sequence.

**Formula:** `min(cap, base * fib(n))`

```typescript
const strategy = fibonacci(100, 10000);
// Parameters:
//   base: 100       - base delay in ms
//   cap: 10000      - cap (maximum delay) in ms (optional, defaults to Infinity)
// Delays: 100ms, 100ms, 200ms, 300ms, 500ms, 800ms, 1300ms, 2100ms...
```

### `FullJitterBackoff` / `fullJitter()`

Uses the AWS FullJitter algorithm to add randomness to exponential backoff, preventing thundering herd problems.

**Formula:** `random(0, min(cap, base * 2^n))`

```typescript
const strategy = fullJitter(100, 5000);
// Parameters:
//   base: 100       - base delay in ms
//   cap: 5000       - cap (maximum delay) in ms (optional, defaults to Infinity)
// Delays: random values between 0 and the exponential cap
```

### `EqualJitterBackoff` / `equalJitter()`

Uses the AWS EqualJitter algorithm, providing a balanced approach between exponential backoff and full jitter.

**Formula:** `(min(cap, base * 2^n) / 2) + random(0, min(cap, base * 2^n) / 2)`

```typescript
const strategy = equalJitter(100, 5000);
// Parameters:
//   base: 100       - base delay in ms
//   cap: 5000       - cap (maximum delay) in ms (optional, defaults to Infinity)
```

### `DecorrelatedJitterBackoff` / `decorrelatedJitter()`

Uses the AWS Decorrelated Jitter algorithm, where each delay is based on the previous delay rather than attempt count.

**Formula:** `min(cap, random(base, previousDelay * 3))`

```typescript
const strategy = decorrelatedJitter(100, 10000);
// Parameters:
//   base: 100       - base delay in ms
//   cap: 10000      - cap (maximum delay) in ms (optional, defaults to Infinity)
```

### `ConstantBackoff` / `constant()`

Always returns the same backoff delay, useful for fixed-interval polling.

```typescript
const strategy = constant(1000); // Always 1000ms
```

### `ZeroBackoff` / `zero()`

Always returns zero delay, useful for immediate retries without waiting.

```typescript
const strategy = zero(); // Always 0ms
```

### `StopBackoff` / `stop()`

Always returns `NaN`, indicating that no retries should be made.

```typescript
const strategy = stop(); // Never retries
```

## Behavior

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

### Concurrency Safety

**Important:** The `retry` function is not concurrently safe when using stateful strategies. If you need to retry multiple operations in parallel, create separate strategy instances for each retry operation:

```typescript
// ❌ Not safe - shared strategy
const strategy = exponential(100, 5000);
await Promise.all([
  retry(operation1, { strategy }),
  retry(operation2, { strategy })
]);

// ✅ Safe - separate strategies
await Promise.all([
  retry(operation1, { strategy: exponential(100, 5000) }),
  retry(operation2, { strategy: exponential(100, 5000) })
]);
```

## Examples

### API Request with Exponential Backoff

```typescript
import { retry, exponential, upto } from "@proventuslabs/retry-strategies";

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
      strategy: upto(5, exponential(100, 5000)),
      stop: (error) => error.message.includes("HTTP 4") // Stop on client errors
    }
  );
}
```

### Rate-Limited API with Jitter

```typescript
import { retry, fullJitter } from "@proventuslabs/retry-strategies";

async function callRateLimitedAPI(endpoint: string) {
  return retry(
    async () => {
      const response = await fetch(endpoint);
      if (response.status === 429) throw new Error("Rate limited");
      return response.json();
    },
    {
      strategy: fullJitter(1000, 30000), // Jitter prevents thundering herd
      stop: (error) => !error.message.includes("Rate limited")
    }
  );
}
```

### Timeout with AbortSignal

```typescript
import { retry, fibonacci } from "@proventuslabs/retry-strategies";

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await retry(
      () => fetch(url, { signal: controller.signal }),
      { strategy: fibonacci(100, 5000), signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }
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
