import { describe, suite, type TestContext, test } from "node:test";

import { EqualJitterBackoff } from "./equal-jitter-backoff.ts";

/* node:coverage disable */
suite("Equal jitter backoff strategy (Unit)", () => {
	describe("calculating backoff delays", () => {
		test("uses default cap when not provided", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.5, 0.5, 0.5];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new EqualJitterBackoff(100);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				75,
				"should return 75ms on first call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				150,
				"should return 150ms on second call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should return 300ms on third call",
			);
			// Continue to verify it keeps growing (not capped at low value)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				600,
				"should continue growing without artificial cap",
			);
		});

		test("returns delays that are half deterministic and half random", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.3, 0.8, 0.1, 0.9];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			// attempt 0: temp = min(10000, 100), delay = 50 + floor(0.5 * 50) = 50 + 25 = 75
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				75,
				"should return 75ms with 50% jitter",
			);
			// attempt 1: temp = min(10000, 200), delay = 100 + floor(0.3 * 100) = 100 + 30 = 130
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				130,
				"should return 130ms with 30% jitter",
			);
			// attempt 2: temp = min(10000, 400), delay = 200 + floor(0.8 * 200) = 200 + 160 = 360
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				360,
				"should return 360ms with 80% jitter",
			);
			// attempt 3: temp = min(10000, 800), delay = 400 + floor(0.1 * 400) = 400 + 40 = 440
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				440,
				"should return 440ms with 10% jitter",
			);
			// attempt 4: temp = min(10000, 1600), delay = 800 + floor(0.9 * 800) = 800 + 720 = 1520
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1520,
				"should return 1520ms with 90% jitter",
			);
		});

		test("caps maximum delay range", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new EqualJitterBackoff(100, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				75,
				"should return 75ms before cap",
			); // temp=100: 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				150,
				"should return 150ms before cap",
			); // temp=200: 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should return 300ms before cap",
			); // temp=400: 200 + floor(0.5 * 200) = 300
			ctx.assert.strictEqual(backoff.nextBackoff(), 375, "should cap at 375ms"); // temp=min(500,800)=500: 250 + floor(0.5 * 250) = 375
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				375,
				"should remain at cap",
			); // temp=min(500,1600)=500: 250 + floor(0.5 * 250) = 375
		});

		test("handles zero base delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new EqualJitterBackoff(0, 1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms with zero base",
			); // temp=0: 0 + floor(random * 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain 0ms"); // temp=0: 0 + floor(random * 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0, "should remain 0ms"); // temp=0: 0 + floor(random * 0) = 0
		});

		test("handles base equal to cap", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.8, 0.2];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new EqualJitterBackoff(500, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				375,
				"should return 375ms with base equal to cap",
			); // temp=500: 250 + floor(0.5 * 250) = 375
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				450,
				"should remain at cap with different jitter",
			); // temp=min(500,1000)=500: 250 + floor(0.8 * 250) = 450
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should remain at cap with different jitter",
			); // temp=min(500,2000)=500: 250 + floor(0.2 * 250) = 300
		});

		test("returns minimum delay when random returns 0", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				50,
				"should return minimum delay with zero random",
			); // temp=100: 50 + floor(0 * 50) = 50
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return minimum delay",
			); // temp=200: 100 + floor(0 * 100) = 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return minimum delay",
			); // temp=400: 200 + floor(0 * 200) = 200
		});

		test("returns maximum delay when random returns close to 1", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.999999);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				99,
				"should return near-maximum delay",
			); // temp=100: 50 + floor(0.999999 * 50) = 99
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				199,
				"should return near-maximum delay",
			); // temp=200: 100 + floor(0.999999 * 100) = 199
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				399,
				"should return near-maximum delay",
			); // temp=400: 200 + floor(0.999999 * 200) = 399
		});

		test("produces variable delays with default Math.random", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act
			const delays = [
				backoff.nextBackoff(),
				backoff.nextBackoff(),
				backoff.nextBackoff(),
			];

			// Assert
			// Check that first delay is within expected range [50, 100)
			ctx.assert.ok(
				delays[0] >= 50 && delays[0] < 100,
				"should produce delay in expected range",
			);
		});
	});

	describe("resetting state", () => {
		test("restarts from initial attempt", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				75,
				"should return first delay before reset",
			); // 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				150,
				"should return second delay before reset",
			); // 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should return third delay before reset",
			); // 200 + floor(0.5 * 200) = 300

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				75,
				"should restart from first delay after reset",
			); // 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				150,
				"should return second delay after reset",
			); // 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should return third delay after reset",
			); // 200 + floor(0.5 * 200) = 300
		});
	});

	describe("using with different instances", () => {
		test("maintains independent state across instances", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.3, 0.5, 0.3];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);

			const backoff1 = new EqualJitterBackoff(100, 10000);
			const backoff2 = new EqualJitterBackoff(50, 5000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				75,
				"should return first instance first delay",
			); // temp=100: 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				32,
				"should return second instance first delay",
			); // temp=50: 25 + floor(0.3 * 25) = 32
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				150,
				"should return first instance second delay",
			); // temp=200: 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				65,
				"should return second instance second delay",
			); // temp=100: 50 + floor(0.3 * 50) = 65
		});
	});

	describe("validating constructor parameters", () => {
		test("rejects non-integer base values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new EqualJitterBackoff(0.5, 1000),
				RangeError,
				"should reject fractional base",
			);
			ctx.assert.throws(
				() => new EqualJitterBackoff(Number.NaN, 1000),
				RangeError,
				"should reject NaN base",
			);
			ctx.assert.throws(
				() => new EqualJitterBackoff(Number.POSITIVE_INFINITY, 1000),
				RangeError,
				"should reject infinite base",
			);
		});

		test("rejects negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new EqualJitterBackoff(-100, 1000),
				RangeError,
				"should reject negative base",
			);
		});

		test("rejects non-integer cap values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new EqualJitterBackoff(100, 0.5),
				RangeError,
				"should reject fractional cap",
			);
			ctx.assert.throws(
				() => new EqualJitterBackoff(100, Number.NaN),
				RangeError,
				"should reject NaN cap",
			);
			ctx.assert.throws(
				() => new EqualJitterBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
				"should reject infinite cap",
			);
		});

		test("rejects cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new EqualJitterBackoff(1000, 500),
				RangeError,
				"should reject cap less than base",
			);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(5);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new EqualJitterBackoff(0, 0),
				"should accept zero base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new EqualJitterBackoff(100, 100),
				"should accept equal base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new EqualJitterBackoff(100, 1000),
				"should accept base less than cap",
			);
			ctx.assert.doesNotThrow(
				() => new EqualJitterBackoff(100, 10000),
				"should accept valid parameters",
			);
			ctx.assert.doesNotThrow(
				() => new EqualJitterBackoff(100),
				"should accept base without cap",
			);
		});
	});
});
