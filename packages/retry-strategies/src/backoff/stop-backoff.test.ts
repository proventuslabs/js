import { describe, it, type TestContext } from "node:test";

import { StopBackoff } from "./stop-backoff.ts";

/* node:coverage disable */
describe("StopBackoff", () => {
	describe("when calculating backoff delays", () => {
		it("should always return NaN", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"First call should return NaN",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"Second call should return NaN",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"Third call should return NaN",
			);
		});

		it("should return NaN for many consecutive calls", (ctx: TestContext) => {
			ctx.plan(100);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			for (let i = 0; i < 100; i++) {
				ctx.assert.ok(
					Number.isNaN(backoff.nextBackoff()),
					`Call ${i + 1} should return NaN`,
				);
			}
		});

		it("should return NaN", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const backoff = new StopBackoff();

			// Act
			const delay = backoff.nextBackoff();

			// Assert
			ctx.assert.ok(Number.isNaN(delay), "Should return NaN to signal stop");
		});
	});

	describe("when resetting state", () => {
		it("should continue returning NaN after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"Before reset should return NaN",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"Second call before reset should return NaN",
			);

			backoff.resetBackoff();

			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"After reset should return NaN",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"Second call after reset should return NaN",
			);
		});

		it("should handle multiple resets", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			backoff.resetBackoff();
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			backoff.resetBackoff();
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			backoff.resetBackoff();
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			backoff.resetBackoff();
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			backoff.resetBackoff();
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
		});
	});

	describe("when signaling to stop retries", () => {
		it("should signal that no retry should be attempted", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const backoff = new StopBackoff();

			// Act
			const delay = backoff.nextBackoff();

			// Assert
			ctx.assert.ok(
				Number.isNaN(delay),
				"Should return NaN to indicate no retry",
			);
		});

		it("should always signal to stop retrying", (ctx: TestContext) => {
			ctx.plan(1000);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert - verify it always returns NaN (stop signal)
			for (let i = 0; i < 1000; i++) {
				const delay = backoff.nextBackoff();
				ctx.assert.ok(Number.isNaN(delay), `Delay ${i + 1} should be NaN (stop)`);
			}
		});
	});

	describe("when implementing BackoffStrategy interface", () => {
		it("should have nextBackoff method", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const backoff = new StopBackoff();

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
			const backoff = new StopBackoff();

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
			const backoff1 = new StopBackoff();
			const backoff2 = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(Number.isNaN(backoff1.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff2.nextBackoff()));

			backoff1.resetBackoff();

			ctx.assert.ok(Number.isNaN(backoff1.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff2.nextBackoff()));
		});
	});
});
