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

import { access } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { APIButtonComponentWithCustomId, APIMessageTopLevelComponent } from "@discordjs/core";
import { ComponentType, MessageFlags } from "@discordjs/core";
import { MESSAGE_TEMPLATES_DIRECTORY } from "@/features/tickets/constants";
import type { LoadedMessageTemplate, MessageTemplateSource } from "@/features/tickets/types";
import { renderTemplate } from "@/features/tickets/utils";
import type { BotApp } from "@/core/types";

const TEMPLATE_SLOT_TYPE = "template-slot";
const TEMPLATE_SLOT_KIND_MANY = "many";
const COMPONENTS_V2_TYPES = new Set([
	ComponentType.Section,
	ComponentType.TextDisplay,
	ComponentType.Thumbnail,
	ComponentType.MediaGallery,
	ComponentType.File,
	ComponentType.Separator,
	ComponentType.Container
]);

export function createMessageSlot(slot: string): any {
	return {
		type: TEMPLATE_SLOT_TYPE,
		slot,
		slot_kind: TEMPLATE_SLOT_KIND_MANY
	};
}

export function createPanelOpenerSlot() {
	return createMessageSlot("panel-opener");
}

export function createRuntimeTextSlot() {
	return createMessageSlot("runtime-text");
}

export async function loadMessageTemplate(
	app: BotApp,
	reference: string,
	tokens?: Record<string, string | undefined>
): Promise<LoadedMessageTemplate> {
	const resolvedPath = await resolveMessageTemplatePath(reference);
	const rawPayload = await loadMessageTemplateSource(resolvedPath);
	const templatePayload =
		typeof rawPayload === "function"
			? rawPayload({
					locale: app.locale,
					LL: app.LL
				})
			: rawPayload;
	const normalizedPayload = normalizeMessageTemplate(templatePayload);
	const renderedPayload = tokens
		? (renderDeep(normalizedPayload, tokens) as LoadedMessageTemplate)
		: (structuredClone(normalizedPayload) as LoadedMessageTemplate);

	return applyComponentsV2Defaults(renderedPayload);
}

export function finalizeMessageTemplate(payload: LoadedMessageTemplate) {
	return sanitizeMessageTemplate(applyComponentsV2Defaults(payload));
}

export function appendMessageText(
	payload: LoadedMessageTemplate,
	text: string | undefined,
	options?: {
		slot?: string;
	}
) {
	const normalizedText = text?.trim();

	if (!normalizedText) {
		return payload;
	}

	if (usesComponentsV2(payload)) {
		// Components V2 messages cannot use the legacy `content` field, so extra
		// runtime text is injected as a text display block instead.
		return appendMessageComponents(
			payload,
			[
				{
					type: ComponentType.TextDisplay,
					content: normalizedText
				}
			],
			options?.slot
		);
	}

	return {
		...payload,
		content: [payload.content, normalizedText]
			.filter((part): part is string => Boolean(part?.trim()))
			.join("\n")
			.trim()
	};
}

export function appendMessageComponents(
	payload: LoadedMessageTemplate,
	components: APIMessageTopLevelComponent[] | undefined,
	slot = "actions"
): LoadedMessageTemplate {
	if (!components?.length) {
		return payload;
	}

	const currentComponents = payload.components ?? [];
	const injectedComponents = injectManyIntoSlots(currentComponents, components, slot);
	const nextComponents = injectedComponents.replaced ? injectedComponents.value : [...currentComponents, ...components];

	return {
		...payload,
		components: nextComponents
	};
}

export function appendMessageButton(
	payload: LoadedMessageTemplate,
	button: APIButtonComponentWithCustomId | undefined,
	options?: {
		actionSlot?: string;
	}
): LoadedMessageTemplate {
	if (!button) {
		return payload;
	}

	return appendMessageComponents(
		payload,
		[
			{
				type: ComponentType.ActionRow,
				components: [button]
			}
		],
		options?.actionSlot ?? "actions"
	);
}

export function appendPanelOpener(
	payload: LoadedMessageTemplate,
	components: APIMessageTopLevelComponent[] | undefined
): LoadedMessageTemplate {
	if (!components?.length) {
		return payload;
	}

	const currentComponents = payload.components ?? [];
	const slottedInjection = injectManyIntoSlots(currentComponents, components, "panel-opener");

	if (slottedInjection.replaced) {
		return {
			...payload,
			components: slottedInjection.value
		};
	}

	if (usesComponentsV2(payload)) {
		const containerInjection = appendComponentsToFirstContainer(currentComponents, components);

		if (containerInjection.replaced) {
			return {
				...payload,
				components: containerInjection.value
			};
		}
	}

	return appendMessageComponents(payload, components);
}

export function hasMessageComponentCustomId(payload: LoadedMessageTemplate, customId: string) {
	const visit = (value: unknown): boolean => {
		if (Array.isArray(value)) {
			return value.some((entry) => visit(entry));
		}

		if (!value || typeof value !== "object") {
			return false;
		}

		if ("custom_id" in value && value.custom_id === customId) {
			return true;
		}

		return Object.values(value).some((entry) => visit(entry));
	};

	return visit(payload.components);
}

function usesComponentsV2(payload: LoadedMessageTemplate) {
	return (
		payload.useComponentsV2 ??
		(Boolean((payload.flags ?? 0) & MessageFlags.IsComponentsV2) || hasComponentsV2Components(payload.components))
	);
}

async function resolveMessageTemplatePath(reference: string) {
	const templatesDirectoryPath = resolve(fileURLToPath(MESSAGE_TEMPLATES_DIRECTORY));
	const normalizedReference = reference.replaceAll("\\", "/").replace(/^\/+/, "");
	const resolvedBasePath = resolve(templatesDirectoryPath, normalizedReference);

	if (!resolvedBasePath.startsWith(templatesDirectoryPath)) {
		throw new Error(`Message template reference "${reference}" resolves outside the messages directory.`);
	}

	const candidatePaths =
		extname(resolvedBasePath) === "" ? [`${resolvedBasePath}.ts`, `${resolvedBasePath}.js`] : [resolvedBasePath];

	for (const candidatePath of candidatePaths) {
		try {
			await access(candidatePath);
			return candidatePath;
		} catch {}
	}

	throw new Error(`Message template "${reference}" was not found in ${templatesDirectoryPath}.`);
}

async function loadMessageTemplateSource(filePath: string) {
	const extension = extname(filePath).toLowerCase();

	if (extension === ".ts" || extension === ".js") {
		// Templates stay code-only in v4 so they remain typed in source and still
		// load correctly from the compiled JavaScript output.
		const importedModule = await import(pathToFileURL(filePath).href);
		return (importedModule.default ?? importedModule.message ?? importedModule) as MessageTemplateSource;
	}

	throw new Error(`Unsupported template file type "${extension}". Only JavaScript and TypeScript templates are supported.`);
}

function normalizeMessageTemplate(rawPayload: unknown): LoadedMessageTemplate {
	if (!rawPayload || typeof rawPayload !== "object") {
		throw new Error("Message templates must export a message payload object.");
	}

	const payload = rawPayload as LoadedMessageTemplate;

	return {
		content: payload.content,
		embeds: payload.embeds,
		components: payload.components,
		flags: payload.flags,
		allowed_mentions: payload.allowed_mentions,
		useComponentsV2: payload.useComponentsV2
	};
}

function applyComponentsV2Defaults(payload: LoadedMessageTemplate): LoadedMessageTemplate {
	const containsComponentsV2 = hasComponentsV2Components(payload.components);
	const hasComponentsV2Flag = Boolean((payload.flags ?? 0) & MessageFlags.IsComponentsV2);
	const resolvedUseComponentsV2 = payload.useComponentsV2 ?? (containsComponentsV2 || hasComponentsV2Flag);

	if (!resolvedUseComponentsV2) {
		if (containsComponentsV2) {
			throw new Error("Classic message templates cannot use Components V2 component types.");
		}

		return {
			...payload,
			flags: (payload.flags ?? 0) & ~MessageFlags.IsComponentsV2
		};
	}

	if (payload.content?.trim()) {
		throw new Error("Components V2 message templates cannot use content. Use TextDisplay components instead.");
	}

	if (payload.embeds?.length) {
		throw new Error("Components V2 message templates cannot use embeds.");
	}

	return {
		...payload,
		flags: (payload.flags ?? 0) | MessageFlags.IsComponentsV2
	};
}

function sanitizeMessageTemplate(payload: LoadedMessageTemplate): LoadedMessageTemplate {
	const usesV2 = usesComponentsV2(payload);
	const nextPayload: LoadedMessageTemplate = {};

	if (payload.allowed_mentions) {
		nextPayload.allowed_mentions = payload.allowed_mentions;
	}

	const sanitizedComponents = stripTemplateSlots(payload.components);

	if (sanitizedComponents?.length) {
		nextPayload.components = sanitizedComponents;
	}

	if (typeof payload.flags === "number") {
		nextPayload.flags = payload.flags;
	}

	if (!usesV2 && payload.content?.trim()) {
		nextPayload.content = payload.content;
	}

	if (!usesV2 && payload.embeds?.length) {
		nextPayload.embeds = payload.embeds;
	}

	return nextPayload;
}

function hasComponentsV2Components(components: APIMessageTopLevelComponent[] | undefined) {
	return components?.some((component) => COMPONENTS_V2_TYPES.has(component.type)) ?? false;
}

function injectManyIntoSlots(
	components: APIMessageTopLevelComponent[],
	injectedComponents: APIMessageTopLevelComponent[],
	slot: string
): {
	replaced: boolean;
	value: APIMessageTopLevelComponent[];
} {
	let replaced = false;

	const visit = (value: unknown): unknown => {
		if (Array.isArray(value)) {
			return value.flatMap((entry) => {
				const resolvedEntry = visit(entry);
				return Array.isArray(resolvedEntry) ? resolvedEntry : [resolvedEntry];
			});
		}

		if (isTemplateSlot(value)) {
			if (value.slot !== slot || value.slot_kind !== TEMPLATE_SLOT_KIND_MANY) {
				return value;
			}

			replaced = true;
			return structuredClone(injectedComponents);
		}

		if (value && typeof value === "object") {
			return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, visit(entry)]));
		}

		return value;
	};

	return {
		replaced,
		value: visit(components) as APIMessageTopLevelComponent[]
	};
}

function appendComponentsToFirstContainer(
	components: APIMessageTopLevelComponent[],
	appendedComponents: APIMessageTopLevelComponent[]
): {
	replaced: boolean;
	value: APIMessageTopLevelComponent[];
} {
	let replaced = false;

	const visit = (value: unknown): unknown => {
		if (Array.isArray(value)) {
			return value.map((entry) => visit(entry));
		}

		if (!value || typeof value !== "object") {
			return value;
		}

		if (
			!replaced &&
			"type" in value &&
			value.type === ComponentType.Container &&
			"components" in value &&
			Array.isArray(value.components)
		) {
			replaced = true;
			return {
				...value,
				components: [...value.components, ...structuredClone(appendedComponents)]
			};
		}

		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, visit(entry)]));
	};

	return {
		replaced,
		value: visit(components) as APIMessageTopLevelComponent[]
	};
}

function stripTemplateSlots(components: APIMessageTopLevelComponent[] | undefined) {
	if (!components?.length) {
		return components;
	}

	const visit = (value: unknown): unknown => {
		if (isTemplateSlot(value)) {
			return undefined;
		}

		if (Array.isArray(value)) {
			return value.flatMap((entry) => {
				const resolvedEntry = visit(entry);
				return resolvedEntry === undefined ? [] : [resolvedEntry];
			});
		}

		if (value && typeof value === "object") {
			const nextValue = Object.fromEntries(
				Object.entries(value)
					.map(([key, entry]) => [key, visit(entry)])
					.filter(([, entry]) => entry !== undefined)
			);

			return nextValue;
		}

		return value;
	};

	return visit(components) as APIMessageTopLevelComponent[];
}

function isTemplateSlot(value: unknown): value is {
	slot: string;
	slot_kind?: string;
} {
	return Boolean(
		value &&
			typeof value === "object" &&
			"slot" in value &&
			typeof value.slot === "string" &&
			(!("type" in value) || value.type === TEMPLATE_SLOT_TYPE)
	);
}

function renderDeep(value: unknown, tokens: Record<string, string | undefined>): unknown {
	if (typeof value === "string") {
		return renderTemplate(value, tokens);
	}

	if (Array.isArray(value)) {
		return value.map((entry) => renderDeep(entry, tokens));
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, renderDeep(entry, tokens)]));
	}

	return value;
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
