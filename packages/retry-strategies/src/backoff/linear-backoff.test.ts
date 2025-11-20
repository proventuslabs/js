import { describe, it, type TestContext } from "node:test";

import { LinearBackoff } from "./linear-backoff.ts";

/* node:coverage disable */
describe("LinearBackoff - Unit tests", () => {
	describe("when calculating backoff delays", () => {
		it("should increase delay linearly with default initial delay", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new LinearBackoff(100);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff.nextBackoff(), 300);
			ctx.assert.strictEqual(backoff.nextBackoff(), 400);
		});

		it("should increase delay linearly with custom initial delay", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new LinearBackoff(50, 100);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff.nextBackoff(), 150);
			ctx.assert.strictEqual(backoff.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff.nextBackoff(), 250);
			ctx.assert.strictEqual(backoff.nextBackoff(), 300);
		});

		it("should behave like constant backoff when increment is zero", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new LinearBackoff(0, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 500);
			ctx.assert.strictEqual(backoff.nextBackoff(), 500);
			ctx.assert.strictEqual(backoff.nextBackoff(), 500);
		});
	});

	describe("when resetting state", () => {
		it("should restart linear progression from initial delay", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new LinearBackoff(100, 200);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff.nextBackoff(), 300);
			ctx.assert.strictEqual(backoff.nextBackoff(), 400);

			backoff.resetBackoff();

			ctx.assert.strictEqual(backoff.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff.nextBackoff(), 300);
			ctx.assert.strictEqual(backoff.nextBackoff(), 400);
		});
	});

	describe("when using with different instances", () => {
		it("should maintain independent state across instances", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new LinearBackoff(100);
			const backoff2 = new LinearBackoff(50, 200);

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff1.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 250);
		});
	});

	describe("when validating constructor parameters", () => {
		it("should reject non-integer increment values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(0.5), RangeError);
			ctx.assert.throws(() => new LinearBackoff(Number.NaN), RangeError);
			ctx.assert.throws(
				() => new LinearBackoff(Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		it("should reject negative increment", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(-100), RangeError);
		});

		it("should reject non-integer initial delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(100, 0.5), RangeError);
			ctx.assert.throws(() => new LinearBackoff(100, Number.NaN), RangeError);
			ctx.assert.throws(
				() => new LinearBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		it("should reject negative initial delay", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(100, -50), RangeError);
		});

		it("should accept valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(() => new LinearBackoff(0));
			ctx.assert.doesNotThrow(() => new LinearBackoff(100));
			ctx.assert.doesNotThrow(() => new LinearBackoff(100, 0));
			ctx.assert.doesNotThrow(() => new LinearBackoff(100, 200));
		});
	});
});
