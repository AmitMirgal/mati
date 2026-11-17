import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
	getLlmSecrets: vi.fn(),
	getMaskedLlmRow: vi.fn(),
	hasLlmSettings: vi.fn(),
	markLlmNeedsReentry: vi.fn(),
}));

vi.mock("../db/queries", () => ({
	getLlmSecrets: mocks.getLlmSecrets,
	getMaskedLlmRow: mocks.getMaskedLlmRow,
	hasLlmSettings: mocks.hasLlmSettings,
	markLlmNeedsReentry: mocks.markLlmNeedsReentry,
}));

vi.mock("../env", () => ({
	getOperatorDefault: () => null,
}));

import { encryptSecret, fingerprintKey } from "../crypto/credentials";
import {
	CREDENTIAL_REENTRY_MESSAGE,
	getMaskedSettings,
	LlmConfigError,
	resolveLlmForUser,
} from "./resolve-config";

const USER = "11111111-1111-4111-8111-111111111111";
const KEY = "0".repeat(64);

function storedRow(overrides: Record<string, unknown> = {}) {
	const secret = encryptSecret("sk-test-sentinel", USER, {
		provider: "openai",
		model: "gpt-4.1",
	});
	return {
		provider: "openai",
		model: "gpt-4.1",
		baseUrl: null,
		encryptedApiKey: secret.ciphertext,
		encryptionIv: secret.iv,
		encryptionTag: secret.tag,
		keyFingerprint: secret.fingerprint,
		needsReentry: false,
		capabilities: {
			tools: "supported",
			streaming: "supported",
			structuredOutput: "unknown",
			usageReporting: "supported",
		},
		...overrides,
	};
}

describe("resolveLlmForUser decrypt failures", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", KEY);
		mocks.getLlmSecrets.mockReset();
		mocks.getMaskedLlmRow.mockReset();
		mocks.hasLlmSettings.mockReset();
		mocks.markLlmNeedsReentry.mockReset();
	});

	it("maps a rotated encryption key to a re-entry LlmConfigError and marks the row", async () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", KEY);
		const row = storedRow();
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", "f".repeat(64));
		mocks.getLlmSecrets.mockResolvedValue(row);
		mocks.hasLlmSettings.mockResolvedValue(true);
		mocks.markLlmNeedsReentry.mockResolvedValue(undefined);
		const db = {} as never;
		await expect(resolveLlmForUser(db, USER)).rejects.toMatchObject({
			name: "LlmConfigError",
			code: "credential_reentry",
			message: CREDENTIAL_REENTRY_MESSAGE,
		});
		expect(mocks.markLlmNeedsReentry).toHaveBeenCalledWith(db, USER, true);
	});

	it("does not include key material in the re-entry error", async () => {
		const row = storedRow();
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", "e".repeat(64));
		mocks.getLlmSecrets.mockResolvedValue(row);
		mocks.hasLlmSettings.mockResolvedValue(true);
		mocks.markLlmNeedsReentry.mockResolvedValue(undefined);
		try {
			await resolveLlmForUser({} as never, USER);
			expect.fail("expected re-entry error");
		} catch (error) {
			expect(error).toBeInstanceOf(LlmConfigError);
			expect((error as Error).message).not.toMatch(/sk-test-sentinel/);
			expect((error as Error).message).not.toMatch(row.encryptedApiKey);
			expect((error as Error).message).not.toMatch(/authenticate data/i);
		}
	});

	it("exposes needsReentry from the stored flag without loading ciphertext on GET", async () => {
		mocks.getMaskedLlmRow.mockResolvedValue({
			provider: "openai",
			model: "gpt-4.1",
			keyFingerprint: fingerprintKey("sk-test-sentinel"),
			needsReentry: true,
			capabilities: {
				tools: "supported",
				streaming: "supported",
				structuredOutput: "unknown",
				usageReporting: "supported",
			},
		});
		const masked = await getMaskedSettings({} as never, USER);
		expect(masked.needsReentry).toBe(true);
		expect(mocks.getLlmSecrets).not.toHaveBeenCalled();
	});
});
