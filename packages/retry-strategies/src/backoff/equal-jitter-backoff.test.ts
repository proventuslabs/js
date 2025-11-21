import { describe, it, type TestContext } from "node:test";

import { EqualJitterBackoff } from "./equal-jitter-backoff.ts";

/* node:coverage disable */
describe("EqualJitterBackoff - Unit tests", () => {
	describe("when calculating backoff delays", () => {
		it("should return delays that are half deterministic and half random", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.3, 0.8, 0.1, 0.9];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			// attempt 0: temp = min(10000, 100), delay = 50 + floor(0.5 * 50) = 50 + 25 = 75
			ctx.assert.strictEqual(backoff.nextBackoff(), 75);
			// attempt 1: temp = min(10000, 200), delay = 100 + floor(0.3 * 100) = 100 + 30 = 130
			ctx.assert.strictEqual(backoff.nextBackoff(), 130);
			// attempt 2: temp = min(10000, 400), delay = 200 + floor(0.8 * 200) = 200 + 160 = 360
			ctx.assert.strictEqual(backoff.nextBackoff(), 360);
			// attempt 3: temp = min(10000, 800), delay = 400 + floor(0.1 * 400) = 400 + 40 = 440
			ctx.assert.strictEqual(backoff.nextBackoff(), 440);
			// attempt 4: temp = min(10000, 1600), delay = 800 + floor(0.9 * 800) = 800 + 720 = 1520
			ctx.assert.strictEqual(backoff.nextBackoff(), 1520);
		});

		it("should cap maximum delay range", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new EqualJitterBackoff(100, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 75); // temp=100: 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(backoff.nextBackoff(), 150); // temp=200: 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(backoff.nextBackoff(), 300); // temp=400: 200 + floor(0.5 * 200) = 300
			ctx.assert.strictEqual(backoff.nextBackoff(), 375); // temp=min(500,800)=500: 250 + floor(0.5 * 250) = 375
			ctx.assert.strictEqual(backoff.nextBackoff(), 375); // temp=min(500,1600)=500: 250 + floor(0.5 * 250) = 375
		});

		it("should handle zero base delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new EqualJitterBackoff(0, 1000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // temp=0: 0 + floor(random * 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // temp=0: 0 + floor(random * 0) = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // temp=0: 0 + floor(random * 0) = 0
		});

		it("should handle base equal to cap", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.8, 0.2];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);
			const backoff = new EqualJitterBackoff(500, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 375); // temp=500: 250 + floor(0.5 * 250) = 375
			ctx.assert.strictEqual(backoff.nextBackoff(), 450); // temp=min(500,1000)=500: 250 + floor(0.8 * 250) = 450
			ctx.assert.strictEqual(backoff.nextBackoff(), 300); // temp=min(500,2000)=500: 250 + floor(0.2 * 250) = 300
		});

		it("should return minimum delay when random returns 0", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 50); // temp=100: 50 + floor(0 * 50) = 50
			ctx.assert.strictEqual(backoff.nextBackoff(), 100); // temp=200: 100 + floor(0 * 100) = 100
			ctx.assert.strictEqual(backoff.nextBackoff(), 200); // temp=400: 200 + floor(0 * 200) = 200
		});

		it("should return maximum delay when random returns close to 1", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.999999);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 99); // temp=100: 50 + floor(0.999999 * 50) = 99
			ctx.assert.strictEqual(backoff.nextBackoff(), 199); // temp=200: 100 + floor(0.999999 * 100) = 199
			ctx.assert.strictEqual(backoff.nextBackoff(), 399); // temp=400: 200 + floor(0.999999 * 200) = 399
		});

		it("should produce variable delays with default Math.random", (ctx: TestContext) => {
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
			ctx.assert.ok(delays[0] >= 50 && delays[0] < 100);
		});
	});

	describe("when resetting state", () => {
		it("should restart from initial attempt", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			ctx.mock.method(Math, "random", () => 0.5);
			const backoff = new EqualJitterBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 75); // 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(backoff.nextBackoff(), 150); // 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(backoff.nextBackoff(), 300); // 200 + floor(0.5 * 200) = 300

			backoff.resetBackoff();

			ctx.assert.strictEqual(backoff.nextBackoff(), 75); // 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(backoff.nextBackoff(), 150); // 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(backoff.nextBackoff(), 300); // 200 + floor(0.5 * 200) = 300
		});
	});

	describe("when using with different instances", () => {
		it("should maintain independent state across instances", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			let callCount = 0;
			const randomValues = [0.5, 0.3, 0.5, 0.3];
			ctx.mock.method(Math, "random", () => randomValues[callCount++]);

			const backoff1 = new EqualJitterBackoff(100, 10000);
			const backoff2 = new EqualJitterBackoff(50, 5000);

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 75); // temp=100: 50 + floor(0.5 * 50) = 75
			ctx.assert.strictEqual(backoff2.nextBackoff(), 32); // temp=50: 25 + floor(0.3 * 25) = 32
			ctx.assert.strictEqual(backoff1.nextBackoff(), 150); // temp=200: 100 + floor(0.5 * 100) = 150
			ctx.assert.strictEqual(backoff2.nextBackoff(), 65); // temp=100: 50 + floor(0.3 * 50) = 65
		});
	});

	describe("when validating constructor parameters", () => {
		it("should reject non-integer base values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new EqualJitterBackoff(0.5, 1000), RangeError);
			ctx.assert.throws(
				() => new EqualJitterBackoff(Number.NaN, 1000),
				RangeError,
			);
			ctx.assert.throws(
				() => new EqualJitterBackoff(Number.POSITIVE_INFINITY, 1000),
				RangeError,
			);
		});

		it("should reject negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new EqualJitterBackoff(-100, 1000), RangeError);
		});

		it("should reject non-integer cap values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new EqualJitterBackoff(100, 0.5), RangeError);
			ctx.assert.throws(
				() => new EqualJitterBackoff(100, Number.NaN),
				RangeError,
			);
			ctx.assert.throws(
				() => new EqualJitterBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		it("should reject cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new EqualJitterBackoff(1000, 500), RangeError);
		});

		it("should accept valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(() => new EqualJitterBackoff(0, 0));
			ctx.assert.doesNotThrow(() => new EqualJitterBackoff(100, 100));
			ctx.assert.doesNotThrow(() => new EqualJitterBackoff(100, 1000));
			ctx.assert.doesNotThrow(() => new EqualJitterBackoff(100, 10000));
		});
	});
});
