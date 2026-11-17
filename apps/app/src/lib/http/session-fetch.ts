import { SESSION_NOT_RUNNING_ERROR } from "../sessions/trainer-consent";
import { createBrowserSupabase } from "../supabase/client";

export async function refreshBrowserSession(): Promise<boolean> {
	try {
		const supabase = createBrowserSupabase();
		const { error } = await supabase.auth.refreshSession();
		return !error;
	} catch {
		return false;
	}
}

export async function fetchWithAuthRetry(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const response = await fetch(input, init);
	if (response.status !== 401) {
		return response;
	}
	const refreshed = await refreshBrowserSession();
	if (!refreshed) {
		return response;
	}
	return await fetch(input, init);
}

async function isSessionNotRunning(response: Response): Promise<boolean> {
	if (response.status !== 409) {
		return false;
	}
	const body = (await response
		.clone()
		.json()
		.catch(() => null)) as {
		error?: unknown;
	} | null;
	return body?.error === SESSION_NOT_RUNNING_ERROR;
}

export async function fetchTrainerRequest(
	sessionId: string,
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const response = await fetchWithAuthRetry(input, init);
	if (!(await isSessionNotRunning(response))) {
		return response;
	}
	const started = await fetchWithAuthRetry(`/api/sessions/${sessionId}/start`, {
		method: "POST",
	});
	if (!started.ok) {
		return response;
	}
	return await fetchWithAuthRetry(input, init);
}
