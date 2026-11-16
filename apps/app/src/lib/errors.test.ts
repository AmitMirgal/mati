import { describe, expect, it } from "vitest";
import { redactProviderError } from "./errors";

describe("redactProviderError", () => {
	it("strips secrets and long provider dumps", () => {
		expect(
			redactProviderError(new Error("Invalid API key sk-test-sentinel-aaaa"))
		).toBe("The language-model provider rejected the request.");
		expect(
			redactProviderError(
				new Error(`Bearer xai-abcdefghijklmnopqrstuvwxyz ${"x".repeat(300)}`)
			)
		).toBe("The language-model provider rejected the request.");
	});

	it("keeps short product errors", () => {
		expect(redactProviderError(new Error("Trainer hit the time budget."))).toBe(
			"Trainer hit the time budget."
		);
	});

	it("keeps CredentialDecryptError copy without leaking Node GCM text", () => {
		const error = Object.assign(
			new Error("Could not decrypt the stored API key."),
			{
				name: "CredentialDecryptError",
			}
		);
		expect(redactProviderError(error)).toBe(
			"Could not decrypt the stored API key."
		);
	});
});
