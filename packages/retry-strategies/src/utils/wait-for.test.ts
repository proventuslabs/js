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
});
