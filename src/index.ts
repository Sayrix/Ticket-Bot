import { config } from "dotenv";
import { createBotApp } from "@/app";

config({ path: "./config/.env" });

async function main() {
	const { start, stop } = await createBotApp();

	process.on("SIGINT", () => {
		void stop().finally(() => process.exit(0));
	});

	process.on("SIGTERM", () => {
		void stop().finally(() => process.exit(0));
	});

	await start();
}

main().catch(async (error) => {
	console.error("[boot] Failed to start bot", error);
	process.exit(1);
});
