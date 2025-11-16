import type { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
	plop.setGenerator("Package", {
		description: "A package",
		prompts: [
			{
				type: "input",
				name: "packageName",
				message: "What is the package name?",
			},
		],
		actions: [
			{
				type: "addMany",
				destination: "packages/{{kebabCase packageName}}",
				base: "../templates/package",
				templateFiles: ["../templates/package/*", "../templates/package/**/*"],
			},
		],
	});
}
