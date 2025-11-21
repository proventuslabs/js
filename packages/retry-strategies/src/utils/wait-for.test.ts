import { describe, suite, type TestContext, test } from "node:test";

import { waitFor } from "./wait-for.ts";

/* node:coverage disable */

suite("Wait for delay (Unit)", () => {
	describe("delay elapses", () => {
		test("resolves after specified delay", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			ctx.mock.timers.enable({ apis: ["setTimeout"] });
			const delay = 1000;

			// Act
			const promise = waitFor(delay);
			ctx.mock.timers.tick(delay);
			await promise;

			// Assert
			ctx.assert.ok(true);
		});
	});

	describe("signal is aborted", () => {
		test("rejects with signal reason", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const controller = new AbortController();
			const reason = new Error("Aborted");

			// Act
			const promise = waitFor(5000, controller.signal);
			controller.abort(reason);

			// Assert
			await ctx.assert.rejects(
				promise,
				(error: Error) => error.message === "Aborted",
			);
		});
	});

	describe("delay is negative", () => {
		test("resolves immediately", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			ctx.mock.timers.enable({ apis: ["setTimeout"] });
			const delay = -100;

			// Act
			const promise = waitFor(delay);
			ctx.mock.timers.tick(0);
			await promise;

			// Assert
			ctx.assert.ok(true);
		});
	});

	describe("delay exceeds INT32_MAX", () => {
		test("fails immediately", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const INT32_MAX = 2 ** 31 - 1;
			const delay = INT32_MAX + 1;

			// Act & Assert
			ctx.assert.throws(
				() => waitFor(delay),
				(error: Error) => {
					return (
						error instanceof RangeError &&
						error.message.includes("Delay must not exceed")
					);
				},
			);
		});

		test("fails with exact value in message", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const INT32_MAX = 2 ** 31 - 1;
			const delay = 3000000000;

			// Act & Assert
			ctx.assert.throws(
				() => waitFor(delay),
				(error: Error) => {
					return (
						error instanceof RangeError &&
						error.message.includes(`${INT32_MAX}`) &&
						error.message.includes(`${delay}`)
					);
				},
			);
		});
	});

	describe("delay equals INT32_MAX", () => {
		test("succeeds", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			ctx.mock.timers.enable({ apis: ["setTimeout"] });
			const INT32_MAX = 2 ** 31 - 1;

			// Act
			const promise = waitFor(INT32_MAX);
			ctx.mock.timers.tick(INT32_MAX);
			await promise;

			// Assert
			ctx.assert.ok(true);
		});
	});
});
