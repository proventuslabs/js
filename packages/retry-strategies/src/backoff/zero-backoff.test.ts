import { describe, it, type TestContext } from "node:test";

import { ZeroBackoff } from "./zero-backoff.ts";

/* node:coverage disable */
describe("ZeroBackoff", () => {
	describe("when calculating backoff delays", () => {
		it("should always return zero milliseconds", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"First call should return 0",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"Second call should return 0",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"Third call should return 0",
			);
		});

		it("should return zero for many consecutive calls", (ctx: TestContext) => {
			ctx.plan(100);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			for (let i = 0; i < 100; i++) {
				ctx.assert.strictEqual(
					backoff.nextBackoff(),
					0,
					`Call ${i + 1} should return 0`,
				);
			}
		});
	});

	describe("when resetting state", () => {
		it("should continue returning zero after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"Before reset should return 0",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"Second call before reset should return 0",
			);

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"After reset should return 0",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"Second call after reset should return 0",
			);
		});

		it("should handle multiple resets", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
		});
	});

	describe("when used for immediate retries", () => {
		it("should signal immediate retry without delay", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act
			const delay = backoff.nextBackoff();

			// Assert
			ctx.assert.strictEqual(
				delay,
				0,
				"Should indicate no delay for immediate retry",
			);
		});

		it("should never signal to stop retrying", (ctx: TestContext) => {
			ctx.plan(1000);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert - verify it never returns NaN (stop signal)
			for (let i = 0; i < 1000; i++) {
				const delay = backoff.nextBackoff();
				ctx.assert.ok(!Number.isNaN(delay), `Delay ${i + 1} should not be NaN`);
			}
		});
	});

	describe("when implementing BackoffStrategy interface", () => {
		it("should have nextBackoff method", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const backoff = new ZeroBackoff();

			// Assert
			ctx.assert.ok(
				typeof backoff.nextBackoff === "function",
				"Should have nextBackoff method",
			);
			ctx.assert.ok(
				typeof backoff.nextBackoff() === "number",
				"nextBackoff should return a number",
			);
		});

		it("should have resetBackoff method", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const backoff = new ZeroBackoff();

			// Assert
			ctx.assert.ok(
				typeof backoff.resetBackoff === "function",
				"Should have resetBackoff method",
			);
		});
	});

	describe("when creating multiple instances", () => {
		it("should maintain independent behavior", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ZeroBackoff();
			const backoff2 = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 0);

			backoff1.resetBackoff();

			ctx.assert.strictEqual(backoff1.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 0);
		});
	});
});
