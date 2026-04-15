import { PermissionFlagsBits } from "@discordjs/core";

export const MESSAGE_TEMPLATES_DIRECTORY = new URL("../../../messages", import.meta.url);
export const DEFAULT_NO_REASON = "No additional details were provided.";
export const TICKET_ACCESS_ALLOW =
	PermissionFlagsBits.ViewChannel |
	PermissionFlagsBits.SendMessages |
	PermissionFlagsBits.ReadMessageHistory |
	PermissionFlagsBits.AttachFiles |
	PermissionFlagsBits.EmbedLinks |
	PermissionFlagsBits.AddReactions;
