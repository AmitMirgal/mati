import { NextResponse } from "next/server";
import { withUserDb } from "../../../lib/db/client";
import {
	getTrainerConsentAt,
	stampTrainerConsent,
} from "../../../lib/db/queries";
import { iso } from "../../../lib/db/rows";
import { requireUser } from "../../../lib/supabase/server";

export async function GET() {
	const { userId } = await requireUser();
	if (!userId) {
		return NextResponse.json({ error: "Sign in required." }, { status: 401 });
	}
	try {
		const trainerConsentAt = await withUserDb(userId, (db) =>
			getTrainerConsentAt(db, userId)
		);
		return NextResponse.json({ trainerConsentAt: iso(trainerConsentAt) });
	} catch {
		return NextResponse.json(
			{ error: "Could not load trainer capture acknowledgement." },
			{ status: 500 }
		);
	}
}

export async function POST() {
	const { userId } = await requireUser();
	if (!userId) {
		return NextResponse.json({ error: "Sign in required." }, { status: 401 });
	}
	try {
		const trainerConsentAt = await withUserDb(userId, (db) =>
			stampTrainerConsent(db, userId)
		);
		return NextResponse.json({ trainerConsentAt: iso(trainerConsentAt) });
	} catch {
		return NextResponse.json(
			{ error: "Could not save trainer capture acknowledgement." },
			{ status: 500 }
		);
	}
}
