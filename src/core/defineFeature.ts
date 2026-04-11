import type { FeatureModule } from "@/core/types";

export function defineFeature<const TFeature extends FeatureModule>(feature: TFeature) {
	return feature;
}
