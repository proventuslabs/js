import { describe, it, type TestContext } from "node:test";

import { waitFor } from "./wait-for.ts";

/* node:coverage disable */

describe("waitFor - Unit tests", () => {
	describe("when delay elapses", () => {
		it("should resolve after specified delay", async (ctx: TestContext) => {
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

	describe("when signal is aborted", () => {
		it("should reject with signal reason", async (ctx: TestContext) => {
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

	describe("when delay is negative", () => {
		it("should resolve immediately", async (ctx: TestContext) => {
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
