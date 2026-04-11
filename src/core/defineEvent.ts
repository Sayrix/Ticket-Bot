import type { EventModule } from "@/core/types";

export function defineEvent<TArgs extends unknown[]>(event: EventModule<TArgs>) {
	return event;
}
