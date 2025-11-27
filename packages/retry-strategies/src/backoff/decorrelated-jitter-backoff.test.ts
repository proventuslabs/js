import { describe, suite, type TestContext, test } from "node:test";

import { DecorrelatedJitterBackoff } from "./decorrelated-jitter-backoff.ts";

/* node:coverage disable */
suite("Decorrelated jitter backoff strategy (Unit)", () => {
	describe("calculating backoff delays", () => {
		test("uses default cap when not provided", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.5, 0.5, 0.5];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new DecorrelatedJitterBackoff(100);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return 200ms on first call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				350,
				"should return 350ms on second call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				575,
				"should return 575ms on third call",
			);
			// Continue to verify it keeps growing (not capped at low value)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				912,
				"should continue growing without artificial cap",
			);
		});

		test("returns delays based on previous delay", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.7, 0.3, 0.9, 0.1];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new DecorrelatedJitterBackoff(100, 10000);

			// Act & Assert
			// min(cap=10000, random(base=100, prev=100 * 3)) = 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return delay based on previous delay",
			);
			// min(cap=10000, random(base=100, prev=200 * 3)) = 450
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				450,
				"should decorrelate from previous delay",
			);
			// min(cap=10000, random(base=100, prev=450 * 3)) = 475
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				475,
				"should continue decorrelation",
			);
			// min(cap=10000, random(base=100, prev=475 * 3)) = 1292
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1292,
				"should increase with decorrelation",
			);
			// min(cap=10000, random(base=100, prev=1292 * 3)) = 477
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				477,
				"should vary unpredictably",
			);
		});

		test("caps maximum delay", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.9, 0.9, 0.9, 0.9];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new DecorrelatedJitterBackoff(100, 500);

			// Act & Assert
			// min(cap=500, random(base=100, prev=100 * 3)) = 280
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				280,
				"should return delay before cap",
			);
			// min(cap=500, random(base=100, prev=280 * 3)) = 500 (capped from 766)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should cap at maximum",
			);
			// min(cap=500, random(base=100, prev=500 * 3)) = 500 (capped from 1360)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			);
			// min(cap=500, random(base=100, prev=500 * 3)) = 500 (capped from 1360)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			);
		});

		test("handles zero base delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.5, 0.5];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new DecorrelatedJitterBackoff(0, 1000);

			// Act & Assert
			// min(cap=1000, random(base=0, prev=0 * 3)) = 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms with zero base",
			);
			// min(cap=1000, random(base=0, prev=0 * 3)) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain 0ms");
			// min(cap=1000, random(base=0, prev=0 * 3)) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain 0ms");
		});

		test("handles base equal to cap", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new DecorrelatedJitterBackoff(500, 500);

			// Act & Assert
			// min(cap=500, random(base=500, prev=500 * 3)) = 500 (capped)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should cap when base equals cap",
			);
			// min(cap=500, random(base=500, prev=500 * 3)) = 500 (capped)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			);
			// min(cap=500, random(base=500, prev=500 * 3)) = 500 (capped)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			);
		});

		test("returns minimum delay when random returns 0", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0);
			const backoff = new DecorrelatedJitterBackoff(100, 10000);

			// Act & Assert
			// min(cap=10000, random(base=100, prev=100 * 3)) = 100 (minimum)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return minimum delay",
			);
			// min(cap=10000, random(base=100, prev=100 * 3)) = 100 (minimum)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should remain at minimum",
			);
			// min(cap=10000, random(base=100, prev=100 * 3)) = 100 (minimum)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should remain at minimum",
			);
		});

		test("returns maximum in range when random returns close to 1", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.999999);
			const backoff = new DecorrelatedJitterBackoff(100, 10000);

			// Act & Assert
			// min(cap=10000, random(base=100, prev=100 * 3)) = 299
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				299,
				"should return near-maximum in range",
			);
			// min(cap=10000, random(base=100, prev=299 * 3)) = 896
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				896,
				"should increase towards maximum",
			);
			// min(cap=10000, random(base=100, prev=896 * 3)) = 2687
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				2687,
				"should continue increasing",
			);
		});

		test("produces variable delays with default Math.random", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const backoff = new DecorrelatedJitterBackoff(100, 10000);

			// Act
			const delays = [
				backoff.nextBackoff(),
				backoff.nextBackoff(),
				backoff.nextBackoff(),
			];

			// Assert
			// First delay should be in range [base, base*3) = [100, 300)
			ctx.assert.ok(
				delays[0] >= 100 && delays[0] < 300,
				"should produce delay in expected range",
			);
		});

		test("decorrelates delays making them unpredictable", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			// Mix of low and high random values to show decorrelation
			const randomValues = [0.1, 0.9, 0.2, 0.8];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new DecorrelatedJitterBackoff(100, 10000);

			// Act & Assert
			// Shows how low random value followed by high can keep delays varied
			// min(cap=10000, random(base=100, prev=100 * 3)) = 120
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				120,
				"should produce low delay with low random",
			);
			// min(cap=10000, random(base=100, prev=120 * 3)) = 334
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				334,
				"should jump higher with high random",
			);
			// min(cap=10000, random(base=100, prev=334 * 3)) = 280
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				280,
				"should drop with low random",
			);
			// min(cap=10000, random(base=100, prev=280 * 3)) = 692
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				692,
				"should jump again with high random",
			);
		});
	});

	describe("resetting state", () => {
		test("restarts from base delay", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new DecorrelatedJitterBackoff(100, 10000);

			// Act & Assert
			// min(cap=10000, random(base=100, prev=100 * 3)) = 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return first delay before reset",
			);
			// min(cap=10000, random(base=100, prev=200 * 3)) = 350
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				350,
				"should return second delay before reset",
			);
			// min(cap=10000, random(base=100, prev=350 * 3)) = 575
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				575,
				"should return third delay before reset",
			);

			backoff.resetBackoff();

			// min(cap=10000, random(base=100, prev=100 * 3)) = 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should restart from base delay after reset",
			);
			// min(cap=10000, random(base=100, prev=200 * 3)) = 350
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				350,
				"should return second delay after reset",
			);
			// min(cap=10000, random(base=100, prev=350 * 3)) = 575
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				575,
				"should return third delay after reset",
			);
		});
	});

	describe("using with different instances", () => {
		test("maintains independent state across instances", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.5, 0.5, 0.5];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);

			const backoff1 = new DecorrelatedJitterBackoff(100, 10000);
			const backoff2 = new DecorrelatedJitterBackoff(50, 5000);

			// Act & Assert
			// min(cap=10000, random(base=100, prev=100 * 3)) = 200
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				200,
				"should return first instance first delay",
			);
			// min(cap=5000, random(base=50, prev=50 * 3)) = 100
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				100,
				"should return second instance first delay",
			);
			// min(cap=10000, random(base=100, prev=200 * 3)) = 350
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				350,
				"should return first instance second delay",
			);
			// min(cap=5000, random(base=50, prev=125 * 3)) = 175
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				175,
				"should return second instance second delay",
			);
		});
	});

	describe("validating constructor parameters", () => {
		test("rejects NaN base values", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new DecorrelatedJitterBackoff(Number.NaN, 1000),
				RangeError,
				"should reject NaN base",
			);
		});

		test("rejects negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new DecorrelatedJitterBackoff(-100, 1000),
				RangeError,
				"should reject negative base",
			);
		});

		test("rejects NaN cap values", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new DecorrelatedJitterBackoff(100, Number.NaN),
				RangeError,
				"should reject NaN cap",
			);
		});

		test("rejects cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new DecorrelatedJitterBackoff(1000, 500),
				RangeError,
				"should reject cap less than base",
			);
		});

		test("accepts fractional and special numeric values", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(100.5, 1000),
				"should accept fractional base",
			);
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(100, 1000.5),
				"should accept fractional cap",
			);
			ctx.assert.doesNotThrow(
				() =>
					new DecorrelatedJitterBackoff(
						Number.POSITIVE_INFINITY,
						Number.POSITIVE_INFINITY,
					),
				"should accept Infinity base",
			);
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(100, Number.POSITIVE_INFINITY),
				"should accept Infinity cap",
			);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(5);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(0, 0),
				"should accept zero base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(100, 100),
				"should accept equal base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(100, 1000),
				"should accept base less than cap",
			);
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(100, 10000),
				"should accept valid parameters",
			);
			ctx.assert.doesNotThrow(
				() => new DecorrelatedJitterBackoff(100),
				"should accept base without cap",
			);
		});
	});
});
