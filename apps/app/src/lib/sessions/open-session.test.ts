import { describe, expect, it } from "vitest";
import { pickPreferredOpenSession } from "./trainer-consent";

describe("pickPreferredOpenSession", () => {
	it("reproduces the old list-first bug that hid an in-progress session behind a newer complete row", () => {
		const sessions = [
			{
				id: "new-complete",
				status: "complete",
				created_at: "2026-11-16T12:00:00.000Z",
				updated_at: "2026-11-16T12:00:00.000Z",
			},
			{
				id: "old-running",
				status: "running",
				created_at: "2026-11-15T12:00:00.000Z",
				updated_at: "2026-11-15T12:00:00.000Z",
			},
		];
		expect(sessions.find((session) => session.status)?.id).toBe("new-complete");
		expect(pickPreferredOpenSession(sessions)?.id).toBe("old-running");
	});

	it("resumes leftover pending_consent instead of treating the exercise as empty", () => {
		const sessions = [
			{
				id: "pending",
				status: "pending_consent",
				created_at: "2026-11-16T12:00:00.000Z",
				updated_at: "2026-11-16T12:00:00.000Z",
			},
		];
		expect(pickPreferredOpenSession(sessions)?.id).toBe("pending");
	});

	it("prefers the most recently updated open session", () => {
		const sessions = [
			{
				id: "older-running",
				status: "running",
				created_at: "2026-11-14T12:00:00.000Z",
				updated_at: "2026-11-14T12:00:00.000Z",
			},
			{
				id: "newer-pending",
				status: "pending_consent",
				created_at: "2026-11-16T12:00:00.000Z",
				updated_at: "2026-11-16T12:00:00.000Z",
			},
		];
		expect(pickPreferredOpenSession(sessions)?.id).toBe("newer-pending");
	});
});
