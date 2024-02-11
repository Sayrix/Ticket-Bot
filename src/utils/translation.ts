/*
Copyright © 2024 小兽兽/zhiyan114 (github.com/zhiyan114)
File is licensed respectively under the terms of the Creative Commons Attribution 4.0 International
or whichever license the project is using at the time https://github.com/Sayrix/Ticket-Bot/blob/main/LICENSE.md
*/

import path from "node:path";
import fs from "fs-extra";

export class Translation {
	private primaryData: {[k: string]: string | undefined};
	private backupData?: {[k: string]: string | undefined};

	/**
     * locale handler module
     * @param optName The locale file name (w/o extension)
     * @param dir The directory of the locale files
     */
	constructor(optName: string, dir?: string) {
		dir = dir ?? "./locale";
		const fullDir = path.join(dir, `${optName}.json`);
		if(!fs.existsSync(fullDir))
			throw new TranslationError("Translation file not found, check your config to verify if the name is correct or not");

		this.primaryData = JSON.parse(fs.readFileSync(fullDir, "utf8"));
		if(optName !== "main")
			this.backupData = JSON.parse(fs.readFileSync(path.join(dir, "main.json"), "utf8"));
	}

	/**
     * Get the translation value or backup value if it doesn't exist
     * @param key The object key the translation should pull
     * @returns the translation data or throw error if the translation data cannot be found at all
     */
	getValue(key: string): string {
		// Try return the data from the main translation file
		const main = this.primaryData[key];
		if(main) return main;

		// Pull backup and throw error if it doesn't exist
		const backup = this.backupData && this.backupData[key];
		if(!backup)
			throw new TranslationError(`TRANSLATION: Key '${key}' failed to pull backup translation. This indicates this key data does not exist at all.`);
        
		// Return the backup translation
		console.warn(`TRANSLATION: Key '${key}' is missing translation. If you can, please help fill in the translation and make PR for it.`);
		return backup;
	}

	/**
     * Get the translation value that isn't on the top of the JSON object
     * @param key All the keys leading to the value (or the classic dot access `"first.second"`)
     * @returns the translation data or throw error if the translation data cannot be found at all
     */
	// eslint-disable-next-line no-unused-vars
	getSubValue(keys: string): string;
	// eslint-disable-next-line no-unused-vars
	getSubValue(...keys: string[]): string;
	getSubValue(...keys: string[]): string {
		// Convert the dot to array
		if(keys.length === 1)
			keys = keys[0].split(".");

		// Check the primary value first
		let main: {[k: string]: string | undefined} | string | undefined = this.primaryData;
		let bkup: {[k: string]: string | undefined} | string | undefined = this.backupData;
		
		for(const key of keys) {
			if(typeof(main) === "object")
				main = main[key];
			if(this.backupData && typeof(bkup) === "object")
				bkup = bkup[key];
		}

		if(typeof(main) === "string" || typeof(main) === "number") return main;
		if(typeof(bkup) !== "string" && typeof(bkup) !== "number")
			throw new TranslationError(`TRANSLATION: Key '${keys.join(".")}' failed to pull backup translation. This indicates this key data does not exist at all.`);
		console.warn(`TRANSLATION: Key '${keys.join(".")}' is missing translation. If you can, please help fill in the translation and make PR for it.`);
		return bkup;
	}

	/**
     * Used for translation keys that can be empty
     * @param keys All the keys leading to the value
     * @returns the translation data or undefined if the translation data cannot be found
     */
	getNoErrorSubValue(...keys: string[]): string | undefined {
		try {
			return this.getSubValue(...keys);
		} catch(ex) {
			return;
		}
	}

	/**
     * Get the raw translation value (getSubValue but without string/number checks)
     * @param key All the keys leading to the value (or the classic dot access `"first.second"`)
     * @returns the translation data or throw error if the translation data cannot be found at all
     */
	// eslint-disable-next-line no-unused-vars
	getSubRawValue(keys: string): string | number | null | object;
	// eslint-disable-next-line no-unused-vars
	getSubRawValue(...keys: string[]): string | number | null | object;
	getSubRawValue(...keys: string[]): string | number | null | object {
		// Convert the dot to array
		if(keys.length === 1)
			keys = keys[0].split(".");

		// Check the primary value first
		let main: {[k: string]: string | undefined} | string | undefined = this.primaryData;
		let bkup: {[k: string]: string | undefined} | string | undefined = this.backupData;
		
		for(const key of keys) {
			if(typeof(main) === "object")
				main = main[key];
			if(this.backupData && typeof(bkup) === "object")
				bkup = bkup[key];
		}

		if(main !== undefined) return main;
		if(bkup === undefined)
			throw new TranslationError(`TRANSLATION: Key '${keys.join(".")}' failed to pull backup translation. This indicates this key data does not exist at all.`);
		console.warn(`TRANSLATION: Key '${keys.join(".")}' is missing translation. This is a raw value operation so please contact the dev before translating it.`);
		return bkup;
	}
}

export class TranslationError {
	name = "TranslationError";
	message: string;
	constructor(msg: string) {
		this.message = msg;
	}
}