"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/design-system/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { runBackground } from "../lib/background";
import { pickPreferredOpenSession } from "../lib/sessions/trainer-consent";
import type { ChallengeMeta } from "../lib/types";
import { markNavigating } from "./NavigationProgress";
import { NavLink } from "./NavLink";
import { TrainerConsentDisclosure } from "./TrainerConsentDisclosure";

export interface SessionRow {
	created_at?: string;
	exercise_id: string;
	finished_at: string | null;
	id: string;
	started_at: string | null;
	status: string;
	updated_at?: string;
}

export function ExerciseHome({
	challenges,
	fixtureSessions,
	fixtureTrainerConsentAt,
}: {
	challenges: ChallengeMeta[];
	fixtureSessions?: SessionRow[];
	fixtureTrainerConsentAt?: string | null;
}) {
	const router = useRouter();
	const [sessions, setSessions] = useState<SessionRow[]>(fixtureSessions ?? []);
	const [trainerConsentAt, setTrainerConsentAt] = useState<string | null>(
		fixtureTrainerConsentAt ?? null
	);
	const [openingId, setOpeningId] = useState<string | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		if (fixtureSessions) {
			return;
		}
		runBackground(
			fetch("/api/sessions")
				.then((response) => response.json())
				.then(
					(body: {
						sessions?: SessionRow[];
						trainerConsentAt?: string | null;
					}) => {
						setSessions(body.sessions ?? []);
						setTrainerConsentAt(body.trainerConsentAt ?? null);
					}
				)
				.catch(() => setSessions([]))
		);
	}, [fixtureSessions]);

	const latestFor = (exerciseId: string) =>
		pickPreferredOpenSession(
			sessions
				.filter((session) => session.exercise_id === exerciseId)
				.map((session) => ({
					...session,
					created_at: session.created_at ?? session.started_at ?? "",
					updated_at:
						session.updated_at ??
						session.started_at ??
						session.created_at ??
						"",
				}))
		) ?? sessions.find((session) => session.exercise_id === exerciseId);

	async function openExercise(challenge: ChallengeMeta) {
		setError("");
		setOpeningId(challenge.id);
		try {
			const created = await fetch("/api/sessions", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ exerciseId: challenge.id }),
			});
			const body = await created.json();
			if (!created.ok) {
				setError(body.error ?? "Could not open session.");
				return;
			}
			markNavigating();
			router.push(`/session/${body.session.id}`);
		} finally {
			setOpeningId(null);
		}
	}

	return (
		<main className="mx-auto grid min-w-0 max-w-5xl gap-10 px-4 py-10">
			<section className="grid gap-3">
				<p className="text-muted-foreground text-sm uppercase tracking-wide">
					Individual learning
				</p>
				<h1 className="font-semibold text-3xl">
					Learn from how you use AI on coding tasks
				</h1>
				<p className="max-w-2xl text-muted-foreground">
					Two manually maintained exercises. Edit in the browser, run the
					harness, chat with a tool-using trainer, then revisit an
					evidence-grounded report. This is not a Google interview replica.
				</p>
				<TrainerConsentDisclosure acknowledged={Boolean(trainerConsentAt)} />
			</section>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Could not start</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<div className="grid gap-4 md:grid-cols-2">
				{challenges.map((challenge) => {
					const session = latestFor(challenge.id);
					const complete = sessions.find(
						(row) =>
							row.exercise_id === challenge.id && row.status === "complete"
					);
					const isRunning = session?.status === "running";
					return (
						<Card key={challenge.id}>
							<CardHeader>
								<CardTitle>{challenge.title}</CardTitle>
								<CardDescription>
									{challenge.difficulty} · {challenge.minutes} min
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-3">
								<p>{challenge.blurb}</p>
								<ul className="list-disc pl-5 text-muted-foreground text-sm">
									{challenge.tasks.map((task) => (
										<li key={task.id}>{task.title}</li>
									))}
								</ul>
								<div className="flex flex-wrap gap-2">
									{isRunning && session ? (
										<Button asChild>
											<NavLink href={`/session/${session.id}`}>Resume</NavLink>
										</Button>
									) : (
										<Button
											disabled={openingId === challenge.id}
											onClick={() => runBackground(openExercise(challenge))}
											type="button"
										>
											{session?.status === "pending_consent"
												? "Continue"
												: "Start"}
										</Button>
									)}
									{complete ? (
										<Button asChild variant="secondary">
											<NavLink href={`/session/${complete.id}/report`}>
												View report
											</NavLink>
										</Button>
									) : null}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</main>
	);
}
