import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(
	new URL("./ExerciseHome.tsx", import.meta.url),
	"utf8"
);
const settings = readFileSync(
	new URL("./TrainerConsentSettingsForm.tsx", import.meta.url),
	"utf8"
);
const disclosure = readFileSync(
	new URL("./TrainerConsentDisclosure.tsx", import.meta.url),
	"utf8"
);

describe("exercise start flow", () => {
	it("does not block start behind a per-exercise accept-session dialog", () => {
		expect(home).not.toMatch(/I understand — start session/);
		expect(home).not.toMatch(/setPending/);
		expect(home).not.toMatch(/Before this session is captured/);
		expect(home).toMatch(/openExercise/);
		expect(home).toMatch(/TrainerConsentDisclosure/);
	});

	it("keeps account-level acknowledgement in Settings and a disclosure on Exercises", () => {
		expect(settings).toMatch(/I understand — acknowledge for this account/);
		expect(settings).toMatch(/\/api\/trainer-consent/);
		expect(disclosure).toMatch(/@ui-sdk\/react\/collapsible/);
	});

	it("does not share the extension capture consent path", () => {
		expect(home).not.toMatch(/mati\.consent\.v1/);
		expect(settings).toMatch(/editor extension has a separate capture/);
	});
});
