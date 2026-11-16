import { afterEach, describe, expect, it, vi } from "vitest";
import {
	CredentialDecryptError,
	decryptSecret,
	EncryptionConfigError,
	encryptSecret,
	getEncryptionKey,
} from "./credentials";

const KEY = "0".repeat(64);
const OWNER = "11111111-1111-4111-8111-111111111111";
const BINDING = {
	provider: "openai",
	model: "gpt-4.1",
};

describe("credential encryption", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("fails closed without an encryption key", () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", "");
		expect(() => getEncryptionKey()).toThrow(EncryptionConfigError);
	});

	it("does not read BODHA_* encryption keys", () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", "");
		vi.stubEnv("BODHA_CREDENTIALS_ENCRYPTION_KEY", KEY);
		expect(() => getEncryptionKey()).toThrow(EncryptionConfigError);
	});

	it("round-trips a secret bound to owner, provider, and model", () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", KEY);
		const encrypted = encryptSecret("sk-test-sentinel", OWNER, BINDING);
		expect(encrypted.ciphertext).not.toContain("sk-test-sentinel");
		expect(decryptSecret(encrypted, OWNER, BINDING)).toBe("sk-test-sentinel");
	});

	it("rejects cross-user decryption", () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", KEY);
		const encrypted = encryptSecret("sk-test-sentinel", OWNER, BINDING);
		expect(() =>
			decryptSecret(encrypted, "22222222-2222-4222-8222-222222222222", BINDING)
		).toThrow();
	});

	it("rejects provider or model binding swaps", () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", KEY);
		const encrypted = encryptSecret("sk-test-sentinel", OWNER, BINDING);
		expect(() =>
			decryptSecret(encrypted, OWNER, { ...BINDING, provider: "anthropic" })
		).toThrow(CredentialDecryptError);
		expect(() =>
			decryptSecret(encrypted, OWNER, { ...BINDING, model: "other-model" })
		).toThrow(CredentialDecryptError);
	});

	it("throws CredentialDecryptError instead of a Node GCM error when the key rotated", () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", KEY);
		const encrypted = encryptSecret("sk-test-sentinel", OWNER, BINDING);
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", "1".repeat(64));
		expect(() => decryptSecret(encrypted, OWNER, BINDING)).toThrow(
			CredentialDecryptError
		);
		try {
			decryptSecret(encrypted, OWNER, BINDING);
			expect.fail("expected decrypt to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(CredentialDecryptError);
			expect((error as Error).message).toBe(
				"Could not decrypt the stored API key."
			);
			expect((error as Error).message).not.toMatch(/authenticate data/i);
			expect((error as Error).message).not.toMatch(/sk-test-sentinel/);
		}
	});

	it("does not leak Node GCM errors when legacy AAD is present and the key rotated", () => {
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", KEY);
		const encrypted = encryptSecret("sk-test-sentinel", OWNER, BINDING);
		vi.stubEnv("MATI_CREDENTIALS_ENCRYPTION_KEY", "a".repeat(64));
		expect(() =>
			decryptSecret(encrypted, OWNER, {
				...BINDING,
				legacyBaseUrl: "https://api.openai.com",
			})
		).toThrow(CredentialDecryptError);
		try {
			decryptSecret(encrypted, OWNER, {
				...BINDING,
				legacyBaseUrl: "https://api.openai.com",
			});
			expect.fail("expected decrypt to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(CredentialDecryptError);
			expect((error as Error).message).not.toMatch(/Unsupported state/i);
			expect((error as Error).message).not.toMatch(/sk-test-sentinel/);
		}
	});
});
