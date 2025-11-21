import { describe, suite, type TestContext, test } from "node:test";

import { LinearBackoff } from "./linear-backoff.ts";

/* node:coverage disable */
suite("Linear backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("increases delay linearly with default initial delay", (ctx: TestContext) => {
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

		test("increases delay linearly with custom initial delay", (ctx: TestContext) => {
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

		test("behaves like constant backoff with zero increment", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new LinearBackoff(0, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 500);
			ctx.assert.strictEqual(backoff.nextBackoff(), 500);
			ctx.assert.strictEqual(backoff.nextBackoff(), 500);
		});
	});

	describe("strategy reset", () => {
		test("restarts progression from initial delay", (ctx: TestContext) => {
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

	describe("multiple instances", () => {
		test("maintains independent state", (ctx: TestContext) => {
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

	describe("parameter validation", () => {
		test("rejects non-integer increment values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(0.5), RangeError);
			ctx.assert.throws(() => new LinearBackoff(Number.NaN), RangeError);
			ctx.assert.throws(
				() => new LinearBackoff(Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		test("rejects negative increment", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(-100), RangeError);
		});

		test("rejects non-integer initial delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(100, 0.5), RangeError);
			ctx.assert.throws(() => new LinearBackoff(100, Number.NaN), RangeError);
			ctx.assert.throws(
				() => new LinearBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		test("rejects negative initial delay", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new LinearBackoff(100, -50), RangeError);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(() => new LinearBackoff(0));
			ctx.assert.doesNotThrow(() => new LinearBackoff(100));
			ctx.assert.doesNotThrow(() => new LinearBackoff(100, 0));
			ctx.assert.doesNotThrow(() => new LinearBackoff(100, 200));
		});
	});
});
