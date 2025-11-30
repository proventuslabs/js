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

Executes a function repeatedly according to a backoff strategy until it succeeds, stops, or is aborted.

#### Parameters

- **`fn`** `() => T | Promise<T>` - The function to retry
- **`options`** `RetryOptions` - Configuration:
  - **`strategy`** `BackoffStrategy` - Delay calculation strategy (required)
  - **`stop`** `(error: unknown, attempt: number) => boolean` - Stop condition (default: `() => false`)
  - **`signal`** `AbortSignal` - Cancellation signal (optional)

#### Returns

`Promise<T>` - Resolves with the function's result on success

#### Throws

- **`unknown`** - Last error if retries exhausted, stop condition met, or aborted
- **`RangeError`** - If delay exceeds INT32_MAX (2147483647ms)

### `waitFor(delay, signal?)`

Waits for a specified duration or until aborted.

#### Parameters

- **`delay`** `number` - Wait duration in milliseconds (negative treated as zero)
- **`signal`** `AbortSignal` - Cancellation signal (optional)

#### Returns

`Promise<void>` - Resolves after delay or rejects if aborted

#### Throws

- **`unknown`** - Abort reason if cancelled
- **`RangeError`** - If delay exceeds INT32_MAX (2147483647ms)

### `upto(retries, strategy)`

Limits a strategy to a maximum number of retry attempts.

#### Parameters

- **`retries`** `number` - Maximum retry attempts (integer >= 0)
- **`strategy`** `BackoffStrategy` - Strategy to wrap

#### Returns

`UptoBackoff<T>` - Strategy that stops after specified retries

#### Throws

- **`RangeError`** - If retries is invalid (NaN, non-integer, or < 0)

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
// base: 100, cap: 5000 (optional, default: Infinity)
// Delays: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 5000ms...
```

### `LinearBackoff` / `linear()`

Increases the delay linearly by a fixed increment.
**Formula:** `min(cap, initialDelay + (increment * n))`

```typescript
const strategy = linear(1000, 500, 10000);
// increment: 1000, initialDelay: 500 (default: 0), cap: 10000 (default: Infinity)
// Delays: 500ms, 1500ms, 2500ms, 3500ms, 4500ms...
```

### `FibonacciBackoff` / `fibonacci()`

Increases the delay following the Fibonacci sequence.
**Formula:** `min(cap, base * fib(n))`

```typescript
const strategy = fibonacci(100, 10000);
// base: 100, cap: 10000 (default: Infinity)
// Delays: 100ms, 100ms, 200ms, 300ms, 500ms, 800ms, 1300ms, 2100ms...
```

### `FullJitterBackoff` / `fullJitter()`

AWS FullJitter algorithm - adds randomness to exponential backoff.
**Formula:** `random(0, min(cap, base * 2^n))`

```typescript
const strategy = fullJitter(100, 5000);
// base: 100, cap: 5000 (default: Infinity)
// Delays: random values between 0 and exponential cap
```

### `EqualJitterBackoff` / `equalJitter()`

AWS EqualJitter algorithm - balances consistency and randomness.
**Formula:** `(min(cap, base * 2^n) / 2) + random(0, min(cap, base * 2^n) / 2)`

```typescript
const strategy = equalJitter(100, 5000);
// base: 100, cap: 5000 (default: Infinity)
```

### `DecorrelatedJitterBackoff` / `decorrelatedJitter()`

AWS DecorrelatedJitter algorithm - each delay based on previous delay.
**Formula:** `min(cap, random(base, previousDelay * 3))`

```typescript
const strategy = decorrelatedJitter(100, 10000);
// base: 100, cap: 10000 (default: Infinity)
```

### `ConstantBackoff` / `constant()`

Always returns the same delay.

```typescript
const strategy = constant(1000);
```

### `ZeroBackoff` / `zero()`

Always returns zero delay for immediate retries.

```typescript
const strategy = zero();
```

### `StopBackoff` / `stop()`

Always returns `NaN` to prevent retries.

```typescript
const strategy = stop();
```

## Behavior

### Retry Loop Behavior

The retry loop continues indefinitely until one of these conditions is met:

1. **Success**: The function executes without throwing an error
2. **Strategy exhaustion**: The backoff strategy returns `NaN`
3. **Stop condition**: The `stop` function returns `true`
4. **Abort signal**: The abort signal is triggered

### Edge Cases

- **Negative delays**: Treated as zero
- **NaN from strategy**: Stops retrying and throws last error
- **Delays exceeding INT32_MAX**: Throws `RangeError`

### Concurrency Safety

**Important:** Not safe to share stateful strategies across concurrent `retry` operations. Create separate instances:

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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    {
      strategy: upto(5, exponential(100, 5000)),
      stop: (error) => error.message.includes("HTTP 4")
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
      strategy: fullJitter(1000, 30000),
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
- **Not concurrency-safe**: Don't share stateful strategies across concurrent operations
- **No built-in attempt limit**: Use the `upto()` utility to limit attempts, provide a `retry` stop condition, or use strategies that eventually return `NaN`
- **Randomness**: Jitter-based strategies use `Math.random()`

## Standards References

- [AWS Architecture Blog - Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [MDN - AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [MDN - setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
- [MDN - Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
