import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshSession = vi.fn();

vi.mock("../supabase/client", () => ({
	createBrowserSupabase: () => ({
		auth: { refreshSession },
	}),
}));

import { fetchTrainerRequest, fetchWithAuthRetry } from "./session-fetch";

describe("fetchWithAuthRetry", () => {
	beforeEach(() => {
		refreshSession.mockReset();
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("retries once after 401 when the browser session refreshes", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ status: 401, ok: false })
			.mockResolvedValueOnce({ status: 200, ok: true });
		vi.stubGlobal("fetch", fetchMock);
		refreshSession.mockResolvedValue({ error: null });
		const response = await fetchWithAuthRetry("/api/sessions/x/chat", {
			method: "POST",
		});
		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(refreshSession).toHaveBeenCalledTimes(1);
	});

	it("does not retry 401 when refresh fails — the tab-refresh failure mode", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ status: 401, ok: false });
		vi.stubGlobal("fetch", fetchMock);
		refreshSession.mockResolvedValue({ error: new Error("expired") });
		const response = await fetchWithAuthRetry("/api/sessions/x/chat", {
			method: "POST",
		});
		expect(response.status).toBe(401);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe("fetchTrainerRequest", () => {
	beforeEach(() => {
		refreshSession.mockReset();
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("starts a leftover pending session then retries the trainer request", async () => {
		const notRunning = {
			status: 409,
			ok: false,
			clone() {
				return {
					json: async () =>
						await Promise.resolve({ error: "Session is not running." }),
				};
			},
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(notRunning)
			.mockResolvedValueOnce({ status: 200, ok: true })
			.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({}) });
		vi.stubGlobal("fetch", fetchMock);
		const response = await fetchTrainerRequest("session-1", "/api/chat", {
			method: "POST",
			body: JSON.stringify({ message: "hi" }),
		});
		expect(response.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
			"/api/sessions/session-1/start"
		);
	});
});
