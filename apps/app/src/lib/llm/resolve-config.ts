import "server-only";

import {
	documentedCapabilitiesFor,
	type MaskedLlmSettings,
	parseProviderCapabilities,
	type ResolvedLlmConfig,
	requireMatiProvider,
} from "@repo/ai/provider";
import {
	CredentialDecryptError,
	decryptSecret,
	encryptionAvailable,
} from "../crypto/credentials";
import {
	getLlmSecrets,
	getMaskedLlmRow,
	hasLlmSettings,
	markLlmNeedsReentry,
} from "../db/queries";
import type { MatiDb } from "../db/rls";
import { getOperatorDefault } from "../env";

export type LlmConfigErrorCode = "generic" | "credential_reentry";

export class LlmConfigError extends Error {
	readonly code: LlmConfigErrorCode;

	constructor(message: string, code: LlmConfigErrorCode = "generic") {
		super(message);
		this.name = "LlmConfigError";
		this.code = code;
	}
}

export const CREDENTIAL_REENTRY_MESSAGE =
	"The saved API key could not be decrypted. Re-enter your API key in Settings. This usually means the server encryption key changed or this environment cannot read a key saved elsewhere.";

export function llmConfigErrorPayload(error: LlmConfigError) {
	return {
		error: error.message,
		needsReentry: error.code === "credential_reentry",
	};
}

function requireSupportedTools(
	value: unknown,
	label: string
): NonNullable<ReturnType<typeof parseProviderCapabilities>> {
	const capabilities = parseProviderCapabilities(value);
	if (!capabilities || capabilities.tools !== "supported") {
		throw new LlmConfigError(
			`${label} has not proven tool calling. Save settings after a successful connection check. Mati will not fall back to a one-shot completion.`
		);
	}
	return capabilities;
}

function decryptStoredKey(
	data: NonNullable<Awaited<ReturnType<typeof getLlmSecrets>>>,
	userId: string
): string {
	try {
		return decryptSecret(
			{
				ciphertext: data.encryptedApiKey,
				iv: data.encryptionIv,
				tag: data.encryptionTag,
				fingerprint: data.keyFingerprint,
			},
			userId,
			{
				provider: data.provider,
				model: data.model,
				legacyBaseUrl: data.baseUrl,
			}
		);
	} catch (error) {
		if (error instanceof CredentialDecryptError) {
			throw error;
		}
		throw new CredentialDecryptError();
	}
}

export async function getMaskedSettings(
	db: MatiDb,
	userId: string
): Promise<MaskedLlmSettings> {
	const data = await getMaskedLlmRow(db, userId);

	if (data) {
		return {
			configured: true,
			source: "user",
			provider: data.provider,
			model: data.model,
			keyFingerprint: data.keyFingerprint,
			needsReentry: data.needsReentry,
			capabilities: parseProviderCapabilities(data.capabilities),
		};
	}

	const operator = getOperatorDefault();
	if (operator) {
		return {
			configured: true,
			source: "operator_default",
			provider: operator.provider,
			model: operator.model,
			keyFingerprint: "operator-env",
			needsReentry: false,
			capabilities: documentedCapabilitiesFor(operator.provider),
		};
	}

	return {
		configured: false,
		source: "none",
		provider: null,
		model: null,
		keyFingerprint: null,
		needsReentry: false,
		capabilities: null,
	};
}

export async function resolveLlmForUser(
	db: MatiDb,
	userId: string
): Promise<{ config: ResolvedLlmConfig; apiKey: string }> {
	if (!encryptionAvailable() && (await hasLlmSettings(db, userId))) {
		throw new LlmConfigError(
			"Encryption key is not configured. Refusing to use stored credentials."
		);
	}

	const data = await getLlmSecrets(db, userId);

	if (data) {
		const provider = requireMatiProvider(data.provider);
		let apiKey: string;
		try {
			apiKey = decryptStoredKey(data, userId);
		} catch {
			await markLlmNeedsReentry(db, userId, true);
			throw new LlmConfigError(
				CREDENTIAL_REENTRY_MESSAGE,
				"credential_reentry"
			);
		}
		if (data.needsReentry) {
			await markLlmNeedsReentry(db, userId, false);
		}
		return {
			apiKey,
			config: {
				source: "user",
				provider: provider.id,
				model: data.model,
				capabilities: requireSupportedTools(
					data.capabilities,
					"Saved settings"
				),
			},
		};
	}

	const operator = getOperatorDefault();
	if (!operator) {
		throw new LlmConfigError(
			"No LLM key is configured. Add your provider settings before chatting or generating a report."
		);
	}
	const capabilities = documentedCapabilitiesFor(operator.provider);
	return {
		apiKey: operator.apiKey,
		config: {
			source: "operator_default",
			provider: operator.provider,
			model: operator.model,
			capabilities: requireSupportedTools(capabilities, "Operator default"),
		},
	};
}
