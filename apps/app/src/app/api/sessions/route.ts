import { NextResponse } from "next/server";
import { z } from "zod";
import { withUserDb } from "../../../lib/db/client";
import { getTrainerConsentAt, listSessions } from "../../../lib/db/queries";
import { iso } from "../../../lib/db/rows";
import { openExerciseSession } from "../../../lib/sessions/service";
import { requireUser } from "../../../lib/supabase/server";

const createSchema = z.object({
	exerciseId: z.string().regex(/^[a-z0-9-]+$/),
});

export async function GET() {
	const { userId } = await requireUser();
	if (!userId) {
		return NextResponse.json({ error: "Sign in required." }, { status: 401 });
	}
	try {
		const { sessions, trainerConsentAt } = await withUserDb(
			userId,
			async (db) => {
				const rows = await listSessions(db, userId);
				const consentAt = await getTrainerConsentAt(db, userId);
				return { sessions: rows, trainerConsentAt: iso(consentAt) };
			}
		);
		return NextResponse.json({ sessions, trainerConsentAt });
	} catch {
		return NextResponse.json(
			{ error: "Could not list sessions." },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	const { userId } = await requireUser();
	if (!userId) {
		return NextResponse.json({ error: "Sign in required." }, { status: 401 });
	}
	const parsed = createSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid exercise." }, { status: 400 });
	}
	try {
		const session = await withUserDb(userId, (db) =>
			openExerciseSession(db, userId, parsed.data.exerciseId)
		);
		return NextResponse.json({ session });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not create session.";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
