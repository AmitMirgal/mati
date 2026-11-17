import { ProgressPreviewFrame } from "../../../components/ProgressPreviewFrame";
import RoundScreen from "../../../components/RoundScreen";
import { getChallenge } from "../../../lib/challenges";

export const dynamic = "force-dynamic";

function parseTheme(value: string | undefined): "dark" | "light" {
	return value === "dark" ? "dark" : "light";
}

export default async function TrainerPreviewPage({
	searchParams,
}: {
	searchParams: Promise<{ theme?: string }>;
}) {
	const params = await searchParams;
	const challenge = getChallenge("shelf");
	if (!challenge) {
		return null;
	}
	return (
		<ProgressPreviewFrame theme={parseTheme(params.theme)}>
			<RoundScreen
				challenge={challenge}
				initialFiles={challenge.starter}
				sessionId="preview-session-1"
				startedAt={Date.now()}
			/>
		</ProgressPreviewFrame>
	);
}
