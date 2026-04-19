import type { BotApp } from "@/core/types";

export function getDefaultNoReason(app: BotApp) {
	return app.LL.shared.no_reason_provided();
}

export function formatClaimStatus(app: BotApp, claimedBy: string | null | undefined) {
	return claimedBy ? app.LL.shared.claim_status.claimed_by({ userId: claimedBy }) : app.LL.shared.claim_status.unclaimed();
}

export function formatTranscriptStatus(app: BotApp, transcriptUrl: string | null | undefined) {
	return transcriptUrl
		? app.LL.shared.transcript_status.ready({ url: transcriptUrl })
		: app.LL.shared.transcript_status.unavailable();
}
