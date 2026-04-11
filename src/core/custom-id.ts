const CUSTOM_ID_SEPARATOR = ":";

export interface ParsedCustomId {
	featureKey: string;
	action: string;
	state: string[];
}

export function createCustomId(featureKey: string, action: string, ...state: string[]) {
	return [featureKey, action, ...state.map((part) => encodeURIComponent(part))].join(CUSTOM_ID_SEPARATOR);
}

export function parseCustomId(customId: string): ParsedCustomId | null {
	const [featureKey, action, ...rawState] = customId.split(CUSTOM_ID_SEPARATOR);

	if (!featureKey || !action) {
		return null;
	}

	return {
		featureKey,
		action,
		state: rawState.map((part) => decodeURIComponent(part))
	};
}
