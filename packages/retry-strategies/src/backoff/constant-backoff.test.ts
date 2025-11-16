import { describe, it, type TestContext } from "node:test";

import { ConstantBackoff } from "./constant-backoff.ts";

/* node:coverage disable */
describe("ConstantBackoff", () => {
	describe("when calculating backoff delays", () => {
		it("should always return the configured delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ConstantBackoff(1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"First call should return 1000",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"Second call should return 1000",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"Third call should return 1000",
			);
		});

		it("should return the same delay for many consecutive calls", (ctx: TestContext) => {
			ctx.plan(100);

			// Arrange
			const backoff = new ConstantBackoff(500);

			// Act & Assert
			for (let i = 0; i < 100; i++) {
				ctx.assert.strictEqual(
					backoff.nextBackoff(),
					500,
					`Call ${i + 1} should return 500`,
				);
			}
		});

		it("should support different delay values", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange & Act & Assert
			const backoff100 = new ConstantBackoff(100);
			ctx.assert.strictEqual(backoff100.nextBackoff(), 100);

			const backoff250 = new ConstantBackoff(250);
			ctx.assert.strictEqual(backoff250.nextBackoff(), 250);

			const backoff1000 = new ConstantBackoff(1000);
			ctx.assert.strictEqual(backoff1000.nextBackoff(), 1000);

			const backoff5000 = new ConstantBackoff(5000);
			ctx.assert.strictEqual(backoff5000.nextBackoff(), 5000);
		});

		it("should support zero delay", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const backoff = new ConstantBackoff(0);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
		});

		it("should support fractional delays", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const backoff = new ConstantBackoff(123.45);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 123.45);
			ctx.assert.strictEqual(backoff.nextBackoff(), 123.45);
		});
	});

	describe("when resetting state", () => {
		it("should continue returning the same delay after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new ConstantBackoff(1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"Before reset should return 1000",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"Second call before reset should return 1000",
			);

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"After reset should return 1000",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"Second call after reset should return 1000",
			);
		});

		it("should handle multiple resets", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new ConstantBackoff(2000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 2000);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 2000);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 2000);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 2000);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 2000);
			backoff.resetBackoff();
			ctx.assert.strictEqual(backoff.nextBackoff(), 2000);
		});
	});

	describe("when using for constant retry delays", () => {
		it("should provide predictable retry timing", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new ConstantBackoff(300);

			// Act & Assert - simulate retry attempts
			for (let attempt = 1; attempt <= 5; attempt++) {
				const delay = backoff.nextBackoff();
				ctx.assert.strictEqual(
					delay,
					300,
					`Retry attempt ${attempt} should have 300ms delay`,
				);
			}
		});

		it("should never signal to stop retrying when delay is valid", (ctx: TestContext) => {
			ctx.plan(1000);

			// Arrange
			const backoff = new ConstantBackoff(100);

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
			const backoff = new ConstantBackoff(1000);

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
			const backoff = new ConstantBackoff(1000);

			// Assert
			ctx.assert.ok(
				typeof backoff.resetBackoff === "function",
				"Should have resetBackoff method",
			);
		});
	});

	describe("when creating multiple instances", () => {
		it("should maintain independent configurations", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ConstantBackoff(100);
			const backoff2 = new ConstantBackoff(500);

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 500);

			backoff1.resetBackoff();

			ctx.assert.strictEqual(backoff1.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 500);
		});

		it("should not affect other instances when one is reset", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff1 = new ConstantBackoff(200);
			const backoff2 = new ConstantBackoff(200);

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 200);

			backoff1.resetBackoff();

			ctx.assert.strictEqual(backoff1.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 200);

			backoff2.resetBackoff();

			ctx.assert.strictEqual(backoff1.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 200);
		});
	});

	describe("when configuring with delay parameter", () => {
		it("should accept delay as constructor parameter", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange & Act
			const backoff = new ConstantBackoff(750);

			// Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 750);
		});

		it("should preserve the configured delay value", (ctx: TestContext) => {
			ctx.plan(10);

			// Arrange
			const configuredDelay = 1234;
			const backoff = new ConstantBackoff(configuredDelay);

			// Act & Assert
			for (let i = 0; i < 10; i++) {
				ctx.assert.strictEqual(
					backoff.nextBackoff(),
					configuredDelay,
					`Should return configured delay of ${configuredDelay}`,
				);
			}
		});
	});

	describe("when validating delay parameter", () => {
		it("should reject delay of NaN", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new ConstantBackoff(Number.NaN),
				RangeError,
				"Should throw RangeError for delay of NaN",
			);
		});

		it("should reject negative delays", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new ConstantBackoff(-5),
				RangeError,
				"Should throw RangeError for delay of -5",
			);
			ctx.assert.throws(
				() => new ConstantBackoff(-100),
				RangeError,
				"Should throw RangeError for delay of -100",
			);
			ctx.assert.throws(
				() => new ConstantBackoff(-1000),
				RangeError,
				"Should throw RangeError for delay of -1000",
			);
		});

		it("should reject fractional negative delays", (ctx: TestContext) => {
			ctx.plan(2);

			// Act & Assert
			ctx.assert.throws(
				() => new ConstantBackoff(-1.5),
				RangeError,
				"Should throw RangeError for delay of -1.5",
			);
			ctx.assert.throws(
				() => new ConstantBackoff(-0.5),
				RangeError,
				"Should throw RangeError for delay of -0.5",
			);
		});

		it("should accept zero and positive delays", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(0),
				"Should accept delay of 0",
			);
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(1),
				"Should accept delay of 1",
			);
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(100),
				"Should accept delay of 100",
			);
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(0.5),
				"Should accept fractional delay of 0.5",
			);
		});

		it("should include the invalid delay value in error message for NaN", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new ConstantBackoff(Number.NaN),
				(e) => e instanceof RangeError && e.message.includes("NaN"),
				"Should have thrown an error",
			);
		});

		it("should include the invalid delay value in error message for negative", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new ConstantBackoff(-5),
				(e) => e instanceof RangeError && e.message.includes("-5"),
				"Should have thrown an error",
			);
		});
	});
});
