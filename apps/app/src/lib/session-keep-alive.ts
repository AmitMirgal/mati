"use client";

import { useEffect } from "react";
import { runBackground } from "./background";
import { refreshBrowserSession } from "./http/session-fetch";

export function useSessionKeepAlive() {
	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState !== "visible") {
				return;
			}
			runBackground(refreshBrowserSession());
		};
		const onFocus = () => {
			runBackground(refreshBrowserSession());
		};
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("focus", onFocus);
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("focus", onFocus);
		};
	}, []);
}
