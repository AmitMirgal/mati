"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/design-system/components/ui/card";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "@ui-sdk/react/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { runBackground } from "../lib/background";
import {
	TRAINER_CAPTURE_DISCLOSURE,
	TRAINER_CAPTURE_SUMMARY,
} from "../lib/sessions/trainer-consent";

export function TrainerConsentSettingsForm() {
	const [trainerConsentAt, setTrainerConsentAt] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		runBackground(
			fetch("/api/trainer-consent")
				.then((response) => response.json())
				.then((body: { trainerConsentAt?: string | null }) => {
					setTrainerConsentAt(body.trainerConsentAt ?? null);
				})
		);
	}, []);

	async function acknowledge() {
		setBusy(true);
		setError("");
		try {
			const response = await fetch("/api/trainer-consent", { method: "POST" });
			const body = (await response.json()) as {
				error?: string;
				trainerConsentAt?: string | null;
			};
			if (!response.ok) {
				setError(body.error ?? "Could not save acknowledgement.");
				return;
			}
			setTrainerConsentAt(body.trainerConsentAt ?? null);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Exercise capture</CardTitle>
				<CardDescription>
					One-time account acknowledgement for what Mati stores during a browser
					trainer session. The editor extension has a separate capture consent.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<Collapsible defaultOpen>
					<CollapsibleTrigger
						aria-label="Trainer capture details"
						className="flex w-full items-center justify-between gap-3 bg-transparent text-left font-medium text-foreground text-sm"
						type="button"
					>
						What is stored
						<ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform [[data-open]_&]:rotate-180" />
					</CollapsibleTrigger>
					<CollapsiblePanel className="pt-2 text-muted-foreground text-sm">
						<p className="mb-2 text-foreground">{TRAINER_CAPTURE_SUMMARY}</p>
						<ul className="list-disc pl-5">
							{TRAINER_CAPTURE_DISCLOSURE.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</CollapsiblePanel>
				</Collapsible>
				{trainerConsentAt ? (
					<p className="text-sm">
						Acknowledged{" "}
						<time dateTime={trainerConsentAt}>
							{new Date(trainerConsentAt).toLocaleString()}
						</time>
						.
					</p>
				) : (
					<Button
						disabled={busy}
						onClick={() => runBackground(acknowledge())}
						type="button"
					>
						I understand — acknowledge for this account
					</Button>
				)}
				{error ? (
					<p className="text-destructive text-sm" role="alert">
						{error}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
