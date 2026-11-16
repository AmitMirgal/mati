import { ProgressPreviewFrame } from "../../../components/ProgressPreviewFrame";
import { SettingsScreen } from "../../../components/SettingsScreen";

export const dynamic = "force-dynamic";

function parseTheme(value: string | undefined): "dark" | "light" {
	return value === "dark" ? "dark" : "light";
}

export default async function SettingsPreviewPage({
	searchParams,
}: {
	searchParams: Promise<{ reentry?: string; theme?: string }>;
}) {
	const params = await searchParams;
	const llmFixture =
		params.reentry === "1"
			? {
					encryptionReady: true,
					settings: {
						configured: true,
						source: "user" as const,
						provider: "openai",
						model: "gpt-4.1",
						keyFingerprint: "sha256:example…demo",
						needsReentry: true,
						capabilities: {
							tools: "supported",
							streaming: "supported",
							structuredOutput: "unknown",
							usageReporting: "supported",
						},
					},
				}
			: undefined;
	return (
		<ProgressPreviewFrame theme={parseTheme(params.theme)}>
			<SettingsScreen email="learner@example.test" llmFixture={llmFixture} />
		</ProgressPreviewFrame>
	);
}
