export const TRAINER_CAPTURE_DISCLOSURE = [
	"Prompts and assistant replies from this session",
	"The frozen exercise snapshot and the code you save",
	"Browser test-run summaries (not a certificate)",
	"Provider-reported token usage when the endpoint returns it",
] as const;

export const TRAINER_CAPTURE_SUMMARY =
	"Mati stores the following for you only, until you delete the account or we apply the documented retention window.";

export const SESSION_NOT_RUNNING_ERROR = "Session is not running.";

export const OPEN_SESSION_STATUSES = ["pending_consent", "running"] as const;

export function isOpenSessionStatus(status: string): boolean {
	return status === "pending_consent" || status === "running";
}

export function pickPreferredOpenSession<
	T extends {
		created_at: string;
		status: string;
		updated_at: string;
	},
>(sessions: T[]): T | null {
	const open = sessions.filter((session) =>
		isOpenSessionStatus(session.status)
	);
	if (open.length === 0) {
		return null;
	}
	return open.reduce((best, session) => {
		if (session.updated_at > best.updated_at) {
			return session;
		}
		if (session.updated_at < best.updated_at) {
			return best;
		}
		return session.created_at > best.created_at ? session : best;
	});
}
