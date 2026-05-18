export type Element = "Anemo" | "Geo" | "Electro" | "Dendro" | "Hydro" | "Pyro" | "Cryo";

export type MaterialType = "local_specialty" | "boss_drop" | "enemy_drop" | "domain_output" | "ore" | "weekly_boss";

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  rarity: number;
  region: string;
  source?: string;
}

export interface Character {
  id: string;
  name: string;
  element: Element;
  weaponType: "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
  rarity: 4 | 5;
  ascensionMaterials: string[];
  talentBookDays: string[];
}

export interface Goal {
  id: string;
  uid: string;
  title: string;
  type: "character_level" | "weapon_level" | "talent_level";
  target: number;
  current: number;
  priority: number;
  blocked?: boolean;
}

export const AR_GATES = [
  { ar: 1, maxLevel: 20 },
  { ar: 15, maxLevel: 40 },
  { ar: 25, maxLevel: 50 },
  { ar: 30, maxLevel: 60 },
  { ar: 35, maxLevel: 70 },
  { ar: 40, maxLevel: 80 },
  { ar: 45, maxLevel: 90 },
];

// ── Place-based Exploration Types ─────────────────────────────────────────────

export type PlaceType =
  | "area"        // Major named area (Windrise, Guili Plains)
  | "subregion"   // Sub-island or sub-zone (Kannazuka, Yashiori Island)
  | "village"     // Named settlement (Springvale, Qingce Village)
  | "city"        // Major city (Mondstadt City, Liyue Harbor, Inazuma City)
  | "landmark"    // Named landmark (Stormterror's Lair, Wangshu Inn)
  | "mountain"    // Mountain zone (Dragonspine, Devantaka Mountain)
  | "domain_area" // Area containing a domain
  | "statue_area" // Area containing a Statue of The Seven
  | "dungeon"     // Underground/special zone (The Chasm Underground, Enkanomiya)
  | "desert"      // Desert zone (Hypostyle Desert, Desert of Hadramaveth)
  | "forest"      // Forest zone (Avidya Forest, Vanarana, Erinnyes Forest)
  | "underwater"  // Underwater zone (Fontaine underwater areas)
  | "ruins"       // Ruins zone (Guili Plains ruins, Dahri ruins)
  | "canyon"      // Canyon zone (Brightcrown Canyon)
  | "island"      // Island zone (Tsurumi, Seirai, etc.)
  | "hidden";     // Hidden/secret area (Realm of Farakhkert, Enkanomiya)

export type StatueType = "seven" | "moon";

export interface PlaceStatue {
  id: string;
  name: string;
  statueType: StatueType;   // "seven" = Statue of The Seven, "moon" = Statue of The Moon
  discovered: boolean;
  activated: boolean;       // activated = fully powered up (heals/stamina)
  nearbyOrbs: number;
  nearbyWaypoints: number;  // waypoints within reach of this statue
  progressionNote?: string; // e.g. "Unlocks Hydro healing in Fontaine"
}

export interface PlaceState {
  id: string;
  name: string;
  region: string;         // parent region id (mondstadt, liyue, etc.)
  type: PlaceType;
  explored: number;       // 0–100 %
  waypointsUnlocked: number;
  totalWaypoints: number;
  statues: PlaceStatue[];
  totalOrbs: number;      // total orbs available in this place when 100% explored
  notes?: string;         // optional flavor/hint text
}

export interface RegionExplorationSummary {
  id: string;
  name: string;
  places: PlaceState[];
  totalExplored: number;       // weighted average across places
  totalWaypoints: number;
  unlockedWaypoints: number;
  totalStatues: number;
  discoveredStatues: number;
  totalOrbs: number;
  collectedOrbs: number;       // estimated from exploration %
}
