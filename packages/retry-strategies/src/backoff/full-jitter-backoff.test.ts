import { describe, suite, type TestContext, test } from "node:test";

import { FullJitterBackoff, fullJitter } from "./full-jitter-backoff.ts";

/* node:coverage disable */
suite("Full jitter backoff strategy (Unit)", () => {
	describe("calculating backoff delays", () => {
		test("uses default cap when not provided", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.5, 0.5, 0.5];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new FullJitterBackoff(100);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				50,
				"should return 50ms on first call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return 100ms on second call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return 200ms on third call",
			);
			// Continue to verify it keeps growing (not capped at low value)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should continue growing without artificial cap",
			);
		});

		test("uses default base when not provided", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new FullJitterBackoff();

			// Act & Assert
			// With base = 0, max delay is 0, so random(0, 0) = 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms on first call with default base",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms on second call with default base",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms on third call with default base",
			);
		});

		test("returns random delays within exponential bounds", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.3, 0.8, 0.1, 0.9];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			// attempt 0: random(0, min(10000, 100 * 2^0)) = random(0, 100) = floor(0.5 * 100) = 50
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				50,
				"should return random delay with 50% jitter",
			);
			// attempt 1: random(0, min(10000, 100 * 2^1)) = random(0, 200) = floor(0.3 * 200) = 60
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				60,
				"should return random delay with 30% jitter",
			);
			// attempt 2: random(0, min(10000, 100 * 2^2)) = random(0, 400) = floor(0.8 * 400) = 320
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				320,
				"should return random delay with 80% jitter",
			);
			// attempt 3: random(0, min(10000, 100 * 2^3)) = random(0, 800) = floor(0.1 * 800) = 80
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				80,
				"should return random delay with 10% jitter",
			);
			// attempt 4: random(0, min(10000, 100 * 2^4)) = random(0, 1600) = floor(0.9 * 1600) = 1440
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1440,
				"should return random delay with 90% jitter",
			);
		});

		test("caps maximum delay range", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new FullJitterBackoff(100, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				50,
				"should return delay before cap",
			); // floor(0.5 * min(500, 100)) = 50
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return delay before cap",
			); // floor(0.5 * min(500, 200)) = 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return delay before cap",
			); // floor(0.5 * min(500, 400)) = 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				250,
				"should cap at maximum",
			); // floor(0.5 * min(500, 800)) = 250
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				250,
				"should remain at cap",
			); // floor(0.5 * min(500, 1600)) = 250
		});

		test("handles zero base delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new FullJitterBackoff(0, 1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms with zero base",
			); // random(0, 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain 0ms"); // random(0, 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain 0ms"); // random(0, 0) = 0
		});

		test("handles base equal to cap", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.8, 0.2];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new FullJitterBackoff(500, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				250,
				"should return jittered delay when base equals cap",
			); // floor(0.5 * 500)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should remain at cap with different jitter",
			); // floor(0.8 * min(500, 1000))
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should remain at cap with different jitter",
			); // floor(0.2 * min(500, 2000))
		});

		test("returns minimum delay when random returns 0", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms with zero random",
			);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain at 0ms");
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain at 0ms");
		});

		test("returns maximum delay when random returns close to 1", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.999999);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				99,
				"should return near-maximum delay",
			); // floor(0.999999 * 100)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				199,
				"should return near-maximum delay",
			); // floor(0.999999 * 200)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				399,
				"should return near-maximum delay",
			); // floor(0.999999 * 400)
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
			ctx.assert.ok(
				delays[0] >= 0 && delays[0] < 100,
				"should produce delay in expected range",
			);
		});
	});

	describe("resetting state", () => {
		test("restarts from initial attempt", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new FullJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				50,
				"should return first delay before reset",
			); // floor(0.5 * 100)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return second delay before reset",
			); // floor(0.5 * 200)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return third delay before reset",
			); // floor(0.5 * 400)

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				50,
				"should restart from first delay after reset",
			); // floor(0.5 * 100)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return second delay after reset",
			); // floor(0.5 * 200)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return third delay after reset",
			); // floor(0.5 * 400)
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
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				50,
				"should return first instance first delay",
			); // floor(0.5 * 100)
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				15,
				"should return second instance first delay",
			); // floor(0.3 * 50)
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				100,
				"should return first instance second delay",
			); // floor(0.5 * 200)
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				30,
				"should return second instance second delay",
			); // floor(0.3 * 100)
		});
	});

	describe("validating constructor parameters", () => {
		test("rejects NaN base values", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new FullJitterBackoff(Number.NaN, 1000),
				RangeError,
				"should reject NaN base",
			);
		});

		test("rejects negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new FullJitterBackoff(-100, 1000),
				RangeError,
				"should reject negative base",
			);
		});

		test("rejects NaN cap values", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new FullJitterBackoff(100, Number.NaN),
				RangeError,
				"should reject NaN cap",
			);
		});

		test("rejects cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new FullJitterBackoff(1000, 500),
				RangeError,
				"should reject cap less than base",
			);
		});

		test("accepts fractional and special numeric values", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(100.5, 1000),
				"should accept fractional base",
			);
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(100, 1000.5),
				"should accept fractional cap",
			);
			ctx.assert.doesNotThrow(
				() =>
					new FullJitterBackoff(
						Number.POSITIVE_INFINITY,
						Number.POSITIVE_INFINITY,
					),
				"should accept Infinity base",
			);
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(100, Number.POSITIVE_INFINITY),
				"should accept Infinity cap",
			);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(5);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(0, 0),
				"should accept zero base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(100, 100),
				"should accept equal base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(100, 1000),
				"should accept base less than cap",
			);
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(100, 10000),
				"should accept valid parameters",
			);
			ctx.assert.doesNotThrow(
				() => new FullJitterBackoff(100),
				"should accept base without cap",
			);
		});
	});

	describe("factory function", () => {
		test("creates FullJitterBackoff instance", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange & Act
			const strategy = fullJitter(100, 5000);

			// Assert
			ctx.assert.ok(
				strategy instanceof FullJitterBackoff,
				"should return FullJitterBackoff instance",
			);
			// Just verify it returns a number (jitter is random)
			const delay = strategy.nextBackoff();
			ctx.assert.ok(
				typeof delay === "number" && delay >= 0,
				"should work correctly",
			);
		});
	});
});
