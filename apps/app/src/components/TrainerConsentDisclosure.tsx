"use client";

import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "@ui-sdk/react/collapsible";
import { ChevronDownIcon } from "lucide-react";
import {
	TRAINER_CAPTURE_DISCLOSURE,
	TRAINER_CAPTURE_SUMMARY,
} from "../lib/sessions/trainer-consent";

export function TrainerConsentDisclosure({
	acknowledged,
}: {
	acknowledged: boolean;
}) {
	return (
		<Collapsible className="rounded-md border border-border bg-card text-card-foreground">
			<CollapsibleTrigger
				aria-label="What Mati records when you start an exercise"
				className="flex w-full items-center justify-between gap-3 bg-transparent px-4 py-3 text-left font-medium text-foreground text-sm"
				type="button"
			>
				What Mati records when you start an exercise
				<ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform [[data-open]_&]:rotate-180" />
			</CollapsibleTrigger>
			<CollapsiblePanel className="px-4 pb-4 text-muted-foreground text-sm">
				<p className="mb-2 text-foreground">{TRAINER_CAPTURE_SUMMARY}</p>
				<ul className="mb-3 list-disc pl-5">
					{TRAINER_CAPTURE_DISCLOSURE.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
				<p>
					Selected context is sent to the LLM endpoint you configured. There is
					no covert monitoring.
					{acknowledged
						? " You already acknowledged this for your account."
						: " Starting an exercise acknowledges this once for your account. You can also acknowledge it in Settings."}
				</p>
			</CollapsiblePanel>
		</Collapsible>
	);
}
