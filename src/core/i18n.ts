import type { Logger } from "@/core/logger";
import type { Locales, TranslationFunctions } from "../../i18n/i18n-types.js";
import { i18nObject, isLocale } from "../../i18n/i18n-util.js";
import { loadLocale } from "../../i18n/i18n-util.sync.js";

export function createBotI18n(
	requestedLocale: string,
	logger?: Logger
): {
	locale: Locales;
	LL: TranslationFunctions;
} {
	const locale = isLocale(requestedLocale) ? requestedLocale : "en";

	try {
		loadLocale(locale);
		return {
			locale,
			LL: i18nObject(locale)
		};
	} catch (error) {
		logger?.warn(`Failed to load locale "${requestedLocale}". Falling back to "en".`, error);
		loadLocale("en");
		return {
			locale: "en",
			LL: i18nObject("en")
		};
	}
}
