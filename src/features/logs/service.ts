/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/

import type { BotApp } from "@/core/types";
import type { TicketLogEvent } from "@/features/logs/types";
import { finalizeMessageTemplate, loadMessageTemplate } from "@/features/tickets/messages";
import { formatClaimStatus, formatTranscriptStatus, getDefaultNoReason } from "@/features/tickets/text";
import type { LogEventToggleKey } from "@/features/tickets/types";

const LOG_EVENT_TOGGLE_KEYS: Record<TicketLogEvent["kind"], LogEventToggleKey> = {
	ticketCreate: "ticketCreate",
	ticketClaim: "ticketClaim",
	ticketUnclaim: "ticketUnclaim",
	ticketClose: "ticketClose",
	ticketDelete: "ticketDelete",
	userAdded: "userAdded",
	userRemoved: "userRemoved",
	ticketRename: "ticketRename"
};

const LOG_TEMPLATE_REFERENCES: Record<TicketLogEvent["kind"], string> = {
	ticketCreate: "logs/ticket-created",
	ticketClaim: "logs/ticket-claimed",
	ticketUnclaim: "logs/ticket-unclaimed",
	ticketClose: "logs/ticket-closed",
	ticketDelete: "logs/ticket-deleted",
	userAdded: "logs/user-added",
	userRemoved: "logs/user-removed",
	ticketRename: "logs/ticket-renamed"
};

export async function sendTicketLog(app: BotApp, event: TicketLogEvent) {
	if (!shouldSendTicketLog(app, event.kind)) {
		if (!app.config.logs.channelId.trim()) {
			app.logger.warn(`Skipping ${event.kind} audit log because logs.channelId is empty.`);
		}
		return;
	}

	const channelId = app.config.logs.channelId.trim();

	try {
		const messageTemplate = await loadMessageTemplate(
			app,
			LOG_TEMPLATE_REFERENCES[event.kind],
			await createLogTokens(app, event)
		);
		const payload = finalizeMessageTemplate({
			...messageTemplate,
			allowed_mentions: messageTemplate.allowed_mentions ?? {
				parse: []
			}
		});

		await app.client.api.channels.createMessage(channelId, payload);
	} catch (error) {
		app.logger.warn(`Failed to send ${event.kind} audit log.`, error);
	}
}

export function shouldSendTicketLog(app: BotApp, kind: TicketLogEvent["kind"]) {
	if (!app.config.logs.enabled) {
		return false;
	}

	if (!app.config.logs.channelId.trim()) {
		return false;
	}

	const toggleKey = LOG_EVENT_TOGGLE_KEYS[kind];
	return app.config.logs.events?.[toggleKey] ?? true;
}

async function createLogTokens(app: BotApp, event: TicketLogEvent) {
	const openedAtSeconds = Math.floor(event.ticket.createdAt / 1000);
	const claimedById = resolveClaimedById(event);
	const [creator, claimer, target] = await Promise.all([
		app.client.api.users.get(event.ticket.createdById).catch(() => null),
		claimedById ? app.client.api.users.get(claimedById).catch(() => null) : Promise.resolve(null),
		"targetId" in event ? app.client.api.users.get(event.targetId).catch(() => null) : Promise.resolve(null)
	]);
	const creatorUsername = creator?.username ?? event.ticket.createdById;
	const tokens: Record<string, string | undefined> = {
		actorId: event.actor.id,
		actorMention: `<@${event.actor.id}>`,
		actorName: event.actor.username,
		claimStatus: formatClaimStatus(app, claimedById),
		claimerId: claimedById ?? undefined,
		claimerMention: claimedById ? `<@${claimedById}>` : undefined,
		claimerUsername: claimedById ? (claimer?.username ?? claimedById) : undefined,
		createdAt: `<t:${openedAtSeconds}:F>`,
		createdById: event.ticket.createdById,
		createdByMention: `<@${event.ticket.createdById}>`,
		createdByUsername: creatorUsername,
		reason: getDefaultNoReason(app),
		targetId: undefined,
		targetMention: undefined,
		targetName: undefined,
		ticketAge: formatDuration(app, Date.now() - event.ticket.createdAt),
		ticketChannelId: event.ticket.ticketChannelId,
		ticketChannelMention: `<#${event.ticket.ticketChannelId}>`,
		ticketId: event.ticket.ticketId,
		ticketNumber: event.ticket.ticketId,
		ticketTypeKey: event.ticket.ticketTypeKey,
		ticketTypeName: event.ticket.ticketTypeName,
		transcriptStatus: formatTranscriptStatus(app, null),
		transcriptUrl: undefined,
		userId: event.ticket.createdById,
		username: creatorUsername
	};

	switch (event.kind) {
		case "ticketCreate":
			tokens.reason = event.reason;
			break;
		case "ticketClose":
		case "ticketDelete":
			tokens.reason = event.reason;
			tokens.transcriptUrl = event.transcriptUrl ?? undefined;
			tokens.transcriptStatus = formatTranscriptStatus(app, event.transcriptUrl);
			break;
		case "userAdded":
		case "userRemoved":
			tokens.targetId = event.targetId;
			tokens.targetMention = `<@${event.targetId}>`;
			tokens.targetName = target?.username ?? event.targetId;
			break;
		case "ticketRename":
			tokens.oldChannelName = event.oldChannelName;
			tokens.newChannelName = event.newChannelName;
			break;
	}

	return tokens;
}

function resolveClaimedById(event: TicketLogEvent) {
	switch (event.kind) {
		case "ticketClaim":
		case "ticketUnclaim":
			return event.actor.id;
		default:
			return event.ticket.claimedById ?? undefined;
	}
}

function formatDuration(app: BotApp, durationMs: number) {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));

	if (totalSeconds < 60) {
		return `${totalSeconds}${app.LL.logs.duration.second_short()}`;
	}

	const units: Array<[label: string, seconds: number]> = [
		[app.LL.logs.duration.day_short(), 86_400],
		[app.LL.logs.duration.hour_short(), 3_600],
		[app.LL.logs.duration.minute_short(), 60],
		[app.LL.logs.duration.second_short(), 1]
	];
	const parts: string[] = [];
	let remainingSeconds = totalSeconds;

	for (const [label, unitSeconds] of units) {
		if (parts.length === 2) {
			break;
		}

		const unitValue = Math.floor(remainingSeconds / unitSeconds);

		if (unitValue <= 0) {
			continue;
		}

		parts.push(`${unitValue}${label}`);
		remainingSeconds -= unitValue * unitSeconds;
	}

	return parts.join(" ");
}

/*
Ticket-Bot is licensed under the GNU Affero General Public License,
version 3 only ("AGPL-3.0-only"). See LICENSE.md for the full license text.

Additional Term under GNU AGPL v3, Section 7(b):

You are required to preserve and display, in a location clearly visible
to end users interacting with the bot (such as bot embeds, the bot's
"Bio" Discord profile, status, or equivalent), a notice that the
software is powered by Ticket-Bot, including a link to the original
project repository or to its website.

This notice must not be removed, obscured, or replaced.
*/
