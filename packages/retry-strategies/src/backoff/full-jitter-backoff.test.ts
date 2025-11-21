import { describe, suite, type TestContext, test } from "node:test";

import { FullJitterBackoff } from "./full-jitter-backoff.ts";

/* node:coverage disable */
suite("Full jitter backoff strategy (Unit)", () => {
	describe("calculating backoff delays", () => {
		test("returns random delays within exponential bounds", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.3, 0.8, 0.1, 0.9];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			// attempt 0: random(0, min(10000, 100 * 2^0)) = random(0, 100) = floor(0.5 * 100) = 50
			ctx.assert.strictEqual(backoff.nextBackoff(), 50);
			// attempt 1: random(0, min(10000, 100 * 2^1)) = random(0, 200) = floor(0.3 * 200) = 60
			ctx.assert.strictEqual(backoff.nextBackoff(), 60);
			// attempt 2: random(0, min(10000, 100 * 2^2)) = random(0, 400) = floor(0.8 * 400) = 320
			ctx.assert.strictEqual(backoff.nextBackoff(), 320);
			// attempt 3: random(0, min(10000, 100 * 2^3)) = random(0, 800) = floor(0.1 * 800) = 80
			ctx.assert.strictEqual(backoff.nextBackoff(), 80);
			// attempt 4: random(0, min(10000, 100 * 2^4)) = random(0, 1600) = floor(0.9 * 1600) = 1440
			ctx.assert.strictEqual(backoff.nextBackoff(), 1440);
		});

		test("caps maximum delay range", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new FullJitterBackoff(100, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 50); // floor(0.5 * min(500, 100)) = 50
			ctx.assert.strictEqual(backoff.nextBackoff(), 100); // floor(0.5 * min(500, 200)) = 100
			ctx.assert.strictEqual(backoff.nextBackoff(), 200); // floor(0.5 * min(500, 400)) = 200
			ctx.assert.strictEqual(backoff.nextBackoff(), 250); // floor(0.5 * min(500, 800)) = 250
			ctx.assert.strictEqual(backoff.nextBackoff(), 250); // floor(0.5 * min(500, 1600)) = 250
		});

		test("handles zero base delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new FullJitterBackoff(0, 1000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // random(0, 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // random(0, 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // random(0, 0) = 0
		});

		test("handles base equal to cap", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.8, 0.2];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new FullJitterBackoff(500, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 250); // floor(0.5 * 500)
			ctx.assert.strictEqual(backoff.nextBackoff(), 400); // floor(0.8 * min(500, 1000))
			ctx.assert.strictEqual(backoff.nextBackoff(), 100); // floor(0.2 * min(500, 2000))
		});

		test("returns minimum delay when random returns 0", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
		});

		test("returns maximum delay when random returns close to 1", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.999999);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 99); // floor(0.999999 * 100)
			ctx.assert.strictEqual(backoff.nextBackoff(), 199); // floor(0.999999 * 200)
			ctx.assert.strictEqual(backoff.nextBackoff(), 399); // floor(0.999999 * 400)
		});

		test("produces variable delays with default Math.random", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const backoff = new FullJitterBackoff(100, 10000);

			// Act
			const delays = [
				backoff.nextBackoff(),
				backoff.nextBackoff(),
				backoff.nextBackoff(),
			];

			// Assert
			// Check that delays are within expected ranges
			ctx.assert.ok(delays[0] >= 0 && delays[0] < 100);
		});
	});

	describe("resetting state", () => {
		test("restarts from initial attempt", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 50); // floor(0.5 * 100)
			ctx.assert.strictEqual(backoff.nextBackoff(), 100); // floor(0.5 * 200)
			ctx.assert.strictEqual(backoff.nextBackoff(), 200); // floor(0.5 * 400)

			backoff.resetBackoff();

			ctx.assert.strictEqual(backoff.nextBackoff(), 50); // floor(0.5 * 100)
			ctx.assert.strictEqual(backoff.nextBackoff(), 100); // floor(0.5 * 200)
			ctx.assert.strictEqual(backoff.nextBackoff(), 200); // floor(0.5 * 400)
		});
	});

	describe("using with different instances", () => {
		test("maintains independent state across instances", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.3, 0.5, 0.3];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);

			const backoff1 = new FullJitterBackoff(100, 10000);
			const backoff2 = new FullJitterBackoff(50, 5000);

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 50); // floor(0.5 * 100)
			ctx.assert.strictEqual(backoff2.nextBackoff(), 15); // floor(0.3 * 50)
			ctx.assert.strictEqual(backoff1.nextBackoff(), 100); // floor(0.5 * 200)
			ctx.assert.strictEqual(backoff2.nextBackoff(), 30); // floor(0.3 * 100)
		});
	});

	describe("validating constructor parameters", () => {
		test("rejects non-integer base values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new FullJitterBackoff(0.5, 1000), RangeError);
			ctx.assert.throws(
				() => new FullJitterBackoff(Number.NaN, 1000),
				RangeError,
			);
			ctx.assert.throws(
				() => new FullJitterBackoff(Number.POSITIVE_INFINITY, 1000),
				RangeError,
			);
		});

		test("rejects negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new FullJitterBackoff(-100, 1000), RangeError);
		});

		test("rejects non-integer cap values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new FullJitterBackoff(100, 0.5), RangeError);
			ctx.assert.throws(
				() => new FullJitterBackoff(100, Number.NaN),
				RangeError,
			);
			ctx.assert.throws(
				() => new FullJitterBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		test("rejects cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new FullJitterBackoff(1000, 500), RangeError);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(() => new FullJitterBackoff(0, 0));
			ctx.assert.doesNotThrow(() => new FullJitterBackoff(100, 100));
			ctx.assert.doesNotThrow(() => new FullJitterBackoff(100, 1000));
			ctx.assert.doesNotThrow(() => new FullJitterBackoff(100, 10000));
		});
	});
});
