// ============================================================
// GPIP Offline Data Engine — Full World Place & Statue Tracking
// ============================================================

export const KEYS = {
  SETUP:        'gpip-setup',
  CHARACTERS:   'gpip-characters',
  PLACES:       'gpip-places-v2',   // PlaceState[] — versioned to avoid stale cache
  PARTY:        'gpip-party',
  PLAN:         'gpip-plan',
  DB_SEEDED:    'gpip-db-seeded',
  ACQUISITION:  'gpip-acquisition-setup',
};

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
export function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Core Account Types ────────────────────────────────────────────────────────

export interface OwnedCharacter {
  id: string;
  name: string;
  level: number;
  ascension: number;
  talentNa: number;
  talentSkill: number;
  talentBurst: number;
  weaponName: string;
  weaponLevel: number;
}

export interface AccountSetup {
  ar: number;
  arExp: number;
  targetAR: number;
}

// ── Place & Statue Types ──────────────────────────────────────────────────────

export type PlaceType =
  | 'area' | 'subregion' | 'village' | 'city' | 'landmark'
  | 'mountain' | 'domain_area' | 'statue_area' | 'dungeon'
  | 'desert' | 'forest' | 'underwater' | 'ruins' | 'canyon'
  | 'island' | 'hidden';

export type StatueType = 'seven' | 'moon';

export interface PlaceStatue {
  id: string;
  name: string;
  statueType: StatueType;
  discovered: boolean;
  activated: boolean;
  nearbyOrbs: number;
  nearbyWaypoints: number;
  progressionNote?: string;
}

export interface PlaceState {
  id: string;
  name: string;
  region: string;
  type: PlaceType;
  explored: number;            // 0–100 %
  waypointsUnlocked: number;
  totalWaypoints: number;
  statues: PlaceStatue[];
  totalOrbs: number;
  notes?: string;
}

// Legacy alias for backward compat
export interface RegionState {
  id: string;
  name: string;
  explored: number;
  waypointsUnlocked: number;
  totalWaypoints: number;
  statuesUnlocked: number;
  totalStatues: number;
}

// ── EXP Tables ────────────────────────────────────────────────────────────────

export const AR_EXP_TABLE: Record<number, number> = {
  1:375,2:500,3:625,4:750,5:875,6:1000,7:1125,8:1275,9:1425,10:1575,
  11:1725,12:1875,13:2025,14:2175,15:2325,16:2475,17:2625,18:2775,19:2925,20:3075,
  21:3350,22:3625,23:3900,24:4175,25:4450,26:4725,27:5000,28:5275,29:5550,30:5825,
  31:6100,32:6375,33:6650,34:6925,35:7200,36:7475,37:7750,38:8025,39:8300,40:8575,
  41:9225,42:9900,43:10600,44:11325,45:12075,46:12850,47:13650,48:14475,49:15325,50:16200,
  51:17700,52:19250,53:20875,54:22575,55:24350,56:27000,57:29850,58:32950,59:36300,60:0
};

const CHAR_EXP_CUM: number[] = [
  0,1000,2325,4025,6175,8800,11950,15675,20025,25025,
  30725,37175,44400,52450,61375,71225,82050,93900,106800,120825,
  136975,154250,172700,192375,213325,235600,259250,284325,310875,338950,
  369625,401700,435250,470300,506900,545100,584950,626500,669800,714900,
  761850,810700,861500,914300,969150,1026100,1085200,1146500,1210050,1275900,
  1343100,1412600,1484500,1558850,1635700,1715100,1797100,1881750,1969100,2059200,
  2152100,2247900,2346600,2448300,2553000,2660850,2771800,2885950,3003350,3124050,
  3248100,3375550,3506450,3640850,3778800,3920350,4065550,4214450,4367100,4523550,
  4683850,4848050,5016200,5188350,5364550,5544850,5729300,5917950,6110850,6308050,
];

export function calcCharExpNeeded(fromLv: number, toLv: number): number {
  if (fromLv >= toLv) return 0;
  return CHAR_EXP_CUM[Math.min(toLv - 1, 89)] - CHAR_EXP_CUM[Math.min(fromLv - 1, 89)];
}

export function calcARExpNeeded(fromAR: number, fromExp: number, toAR: number): number {
  let total = 0;
  for (let ar = fromAR; ar < toAR; ar++) total += AR_EXP_TABLE[ar] ?? 0;
  return Math.max(0, total - fromExp);
}

export const WAYPOINT_EXP = 50;
export const CHEST_EXP    = 20;
export const ORB_EXP      = 50;
export const STATUE_ACTIVATION_EXP = 100; // AR EXP for activating a statue

// ── Shorthand statue builders ─────────────────────────────────────────────────

function s7(id: string, label: string, orbs: number, wps = 2, note?: string): PlaceStatue {
  return { id, name: `Statue of The Seven — ${label}`, statueType: 'seven',
    discovered: false, activated: false, nearbyOrbs: orbs, nearbyWaypoints: wps, progressionNote: note };
}
function sMoon(id: string, label: string, orbs: number, wps = 2, note?: string): PlaceStatue {
  return { id, name: `Statue of The Moon — ${label}`, statueType: 'moon',
    discovered: false, activated: false, nearbyOrbs: orbs, nearbyWaypoints: wps, progressionNote: note };
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL WORLD PLACE DATABASE
// Every real explorable location from all released regions.
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PLACES: PlaceState[] = [

  // ══════════════════════════════════════════════════════════════════
  // MONDSTADT — City of Freedom
  // ══════════════════════════════════════════════════════════════════
  { id:'mondstadt-city',        name:'Mondstadt City',        region:'mondstadt', type:'city',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:12,
    statues:[], notes:'Capital of Mondstadt. Cathedral, Knights HQ, and Mondstadt Winery.' },

  { id:'windrise',              name:'Windrise',              region:'mondstadt', type:'statue_area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:18,
    statues:[s7('s7-windrise','Windrise',8,3,'First Statue most players encounter. Anemo healing.')],
    notes:'Sacred tree south of Mondstadt. Cecilia flowers nearby.' },

  { id:'springvale',            name:'Springvale',            region:'mondstadt', type:'village',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:10,
    statues:[], notes:'Hunting village. Bennett\'s home. Hilichurl camps nearby.' },

  { id:'dawn-winery',           name:'Dawn Winery',           region:'mondstadt', type:'landmark',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:14,
    statues:[], notes:'Diluc\'s estate. Dandelion Seeds. Fatui patrols.' },

  { id:'starsnatch-cliff',      name:'Starsnatch Cliff',      region:'mondstadt', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:16,
    statues:[], notes:'Eastern coastal cliffs. Cecilia flowers. Fischl\'s favorite spot.' },

  { id:'stormterrors-lair',     name:"Stormterror's Lair",    region:'mondstadt', type:'ruins',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:20,
    statues:[s7('s7-lair',"Stormterror's Lair",10,3,'Anemo healing. Near Dvalin boss arena.')],
    notes:'Ancient ruins. Dvalin\'s domain. Significant Anemo energy.' },

  { id:'wolvendom',             name:'Wolvendom',             region:'mondstadt', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:15,
    statues:[], notes:'Wolf pack territory. Razor\'s home. Wolfhook berries.' },

  { id:'brightcrown-canyon',    name:'Brightcrown Canyon',    region:'mondstadt', type:'canyon',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[s7('s7-brightcrown','Brightcrown Canyon',9,3,'Anemo healing. Near Anemo Hypostasis.')],
    notes:'Canyon north of Mondstadt. Anemo Hypostasis boss. Strong winds.' },

  { id:'whispering-woods',      name:'Whispering Woods',      region:'mondstadt', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:10,
    statues:[], notes:'Dense forest west of Mondstadt. Windwheel Asters.' },

  { id:'dragonspine',           name:'Dragonspine',           region:'mondstadt', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:8, totalOrbs:35,
    statues:[s7('s7-dragonspine','Dragonspine',15,4,'Cryo healing. Crimson Agate collectibles.')],
    notes:'Frozen mountain. Sheer Cold mechanic. Crimson Agate. Frostarm Lawachurl.' },

  { id:'cape-oath',             name:'Cape Oath',             region:'mondstadt', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:8,
    statues:[], notes:'Southeastern coastal cape. Ruin Guards.' },

  { id:'dadaupa-gorge',         name:'Dadaupa Gorge',         region:'mondstadt', type:'canyon',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:10,
    statues:[], notes:'Gorge with Hilichurl camps. Slime drops.' },

  { id:'stormbearer-mountains', name:'Stormbearer Mountains', region:'mondstadt', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:12,
    statues:[], notes:'Northern mountains. Electro Hypostasis. Strong winds.' },

  { id:'stormbearer-point',     name:'Stormbearer Point',     region:'mondstadt', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:8,
    statues:[], notes:'Northern coastal tip of Mondstadt.' },

  { id:'falcon-coast',          name:'Falcon Coast',          region:'mondstadt', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:9,
    statues:[], notes:'Eastern coast. Ruin Guards patrol.' },

  { id:'mondstadt-domain-areas',name:'Domain Areas (Mondstadt)',region:'mondstadt', type:'domain_area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:8,
    statues:[], notes:'Cecilia Garden, Forsaken Rift, Peak of Vindagnyr domains.' },

  // ══════════════════════════════════════════════════════════════════
  // LIYUE — Harbor of Stone
  // ══════════════════════════════════════════════════════════════════
  { id:'liyue-harbor',          name:'Liyue Harbor',          region:'liyue', type:'city',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:14,
    statues:[], notes:'Great trading port. Zhongli and Childe story. Bubu Pharmacy.' },

  { id:'qingce-village',        name:'Qingce Village',        region:'liyue', type:'village',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:16,
    statues:[s7('s7-qingce','Qingce Village',8,3,'Geo healing. Near Qingxin peaks.')],
    notes:'Mountain village. Qingxin flowers. Ruin Hunters nearby.' },

  { id:'wangshu-inn',           name:'Wangshu Inn',           region:'liyue', type:'landmark',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:10,
    statues:[], notes:'Elevated inn. Xiao\'s resting place. Violetgrass on cliffs.' },

  { id:'guili-plains',          name:'Guili Plains',          region:'liyue', type:'ruins',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:22,
    statues:[s7('s7-guili','Guili Plains',10,3,'Geo healing. Ancient battlefield.')],
    notes:'Ancient battlefield ruins. Cor Lapis deposits. Ruin Hunters.' },

  { id:'lisha',                 name:'Lisha',                 region:'liyue', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:24,
    statues:[s7('s7-lisha','Lisha',12,3,'Geo healing. Farmland region.')],
    notes:'Fertile farmland. Jueyun Chilis. Treasure Hoarders.' },

  { id:'minlin',                name:'Minlin',                region:'liyue', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:20,
    statues:[s7('s7-minlin','Minlin',10,3,'Geo healing. Adeptus territory.')],
    notes:'Mountainous area. Ancient ruins. Adeptus lore. Qingxin flowers.' },

  { id:'mt-hulao',              name:'Mt. Hulao',             region:'liyue', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:16,
    statues:[], notes:'Geo Hypostasis boss. Noctilucous Jade deposits.' },

  { id:'yaoguang-shoal',        name:'Yaoguang Shoal',        region:'liyue', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:14,
    statues:[], notes:'Coastal shoal. Glowing waters at night. Starconch shells.' },

  { id:'dihua-marsh',           name:'Dihua Marsh',           region:'liyue', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:14,
    statues:[], notes:'Wetland marsh. Violetgrass on cliff faces.' },

  { id:'luhua-pool',            name:'Luhua Pool',            region:'liyue', type:'ruins',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:14,
    statues:[], notes:'Submerged ruins. Pyro Regisvine boss.' },

  { id:'tianqiu-valley',        name:'Tianqiu Valley',        region:'liyue', type:'ruins',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:12,
    statues:[], notes:'Ancient towers. Ruin Hunters.' },

  { id:'jueyun-karst',          name:'Jueyun Karst',          region:'liyue', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:16,
    statues:[s7('s7-jueyun','Jueyun Karst',8,2,'Geo healing. Floating rocks.')],
    notes:'Karst landscape. Floating rocks. Adeptus territory.' },

  { id:'nantianmen',            name:'Nantianmen',            region:'liyue', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:14,
    statues:[], notes:'Southern gate. Mountain passes. Geovishap Hatchlings.' },

  { id:'chasm-surface',         name:'The Chasm (Surface)',   region:'liyue', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:6, totalOrbs:28,
    statues:[s7('s7-chasm','The Chasm',14,4,'Geo healing. Lumenstone Adjuvant mechanic.')],
    notes:'Mining chasm surface. Lumenstone Adjuvant. Ruin Serpent boss.' },

  { id:'chasm-underground',     name:'The Chasm (Underground Mines)', region:'liyue', type:'dungeon',
    explored:0, waypointsUnlocked:0, totalWaypoints:8, totalOrbs:40,
    statues:[], notes:'Vast underground mines. Dark areas require Lumenstone. Unique puzzles.' },

  { id:'sea-of-clouds',         name:'Sea of Clouds',         region:'liyue', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[s7('s7-sea-of-clouds','Sea of Clouds',9,3,'Geo healing. High altitude.')],
    notes:'High-altitude cloud sea. Qingxin flowers. Adeptus lore.' },

  { id:'guyun-stone-forest',    name:'Guyun Stone Forest',    region:'liyue', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:14,
    statues:[], notes:'Stone pillars rising from the sea. Primo Geovishap boss.' },

  { id:'mt-tianheng',           name:'Mt. Tianheng',          region:'liyue', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:10,
    statues:[], notes:'Mountain overlooking Liyue Harbor. Geo Samachurl camps.' },

  { id:'liyue-domain-areas',    name:'Domain Areas (Liyue)',  region:'liyue', type:'domain_area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:10,
    statues:[], notes:'Hidden Palace of Lianshan Formula, Taishan Mansion, etc.' },

  // ══════════════════════════════════════════════════════════════════
  // INAZUMA — Nation of Eternity
  // ══════════════════════════════════════════════════════════════════
  { id:'narukami-island',       name:'Narukami Island',       region:'inazuma', type:'island',
    explored:0, waypointsUnlocked:0, totalWaypoints:14, totalOrbs:50,
    statues:[
      s7('s7-narukami-shrine','Narukami (Grand Narukami Shrine)',12,4,'Electro healing. Main island statue.'),
      s7('s7-narukami-konda','Narukami (Konda Village)',10,3,'Electro healing. Near Konda Village.'),
    ],
    notes:'Main island. Inazuma City, Grand Narukami Shrine, Konda Village, Araumi.' },

  { id:'kannazuka',             name:'Kannazuka',             region:'inazuma', type:'island',
    explored:0, waypointsUnlocked:0, totalWaypoints:10, totalOrbs:38,
    statues:[s7('s7-kannazuka','Kannazuka',10,3,'Electro healing. War-torn island.')],
    notes:'War-torn island. Shogunate vs Resistance. Mikage Furnace. Maguu Kenki boss.' },

  { id:'yashiori-island',       name:'Yashiori Island',       region:'inazuma', type:'island',
    explored:0, waypointsUnlocked:0, totalWaypoints:10, totalOrbs:36,
    statues:[s7('s7-yashiori','Yashiori Island',10,3,'Electro healing. Serpent ruins.')],
    notes:"Serpent's Head ruins. Orobashi's remains. Balethunder mechanic." },

  { id:'watatsumi-island',      name:'Watatsumi Island',      region:'inazuma', type:'island',
    explored:0, waypointsUnlocked:0, totalWaypoints:8, totalOrbs:30,
    statues:[s7('s7-watatsumi','Watatsumi Island',10,3,'Electro healing. Resistance HQ.')],
    notes:'Resistance HQ. Sangonomiya Shrine. Bioluminescent flora. Coral butterflies.' },

  { id:'seirai-island',         name:'Seirai Island',         region:'inazuma', type:'island',
    explored:0, waypointsUnlocked:0, totalWaypoints:8, totalOrbs:28,
    statues:[s7('s7-seirai','Seirai Island',10,3,'Electro healing. Perpetual storm.')],
    notes:'Perpetual storm. Amakumo Peak. Thunder Manifestation boss. Electroculus.' },

  { id:'tsurumi-island',        name:'Tsurumi Island',        region:'inazuma', type:'island',
    explored:0, waypointsUnlocked:0, totalWaypoints:8, totalOrbs:28,
    statues:[s7('s7-tsurumi','Tsurumi Island',10,3,'Electro healing. Fog-shrouded island.')],
    notes:'Fog-shrouded. Ancient ruins. Time-loop quest mechanic. Thunderbird lore.' },

  { id:'enkanomiya',            name:'Enkanomiya',            region:'inazuma', type:'hidden',
    explored:0, waypointsUnlocked:0, totalWaypoints:14, totalOrbs:55,
    statues:[], notes:'Ancient underwater civilization. Day/Night (Whitenight/Evernight) mechanic.' },

  { id:'inazuma-city',          name:'Inazuma City',          region:'inazuma', type:'city',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:10,
    statues:[], notes:'Capital of Inazuma. Shogunate HQ. Hanamizaka. Komore Teahouse.' },

  { id:'araumi',                name:'Araumi',                region:'inazuma', type:'ruins',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:12,
    statues:[], notes:'Submerged ruins on Narukami. Perpetual Mechanical Array boss.' },

  { id:'tatarasuna',            name:'Tatarasuna',            region:'inazuma', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:16,
    statues:[], notes:'Kannazuka industrial area. Mikage Furnace. Ore deposits.' },

  { id:'inazuma-domain-areas',  name:'Domain Areas (Inazuma)',region:'inazuma', type:'domain_area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:10,
    statues:[], notes:'Violet Court, Momiji-Dyed Court, Slumbering Court domains.' },

  // ══════════════════════════════════════════════════════════════════
  // SUMERU — Nation of Wisdom
  // ══════════════════════════════════════════════════════════════════
  { id:'sumeru-city',           name:'Sumeru City',           region:'sumeru', type:'city',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:16,
    statues:[], notes:'City of knowledge. Akademiya. Port Ormos nearby.' },

  { id:'avidya-forest',         name:'Avidya Forest',         region:'sumeru', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:8, totalOrbs:36,
    statues:[
      s7('s7-avidya-west','Avidya Forest (West)',10,3,'Dendro healing. Rainforest west.'),
      s7('s7-avidya-east','Avidya Forest (East)',10,3,'Dendro healing. Rainforest east.'),
    ],
    notes:'Dense rainforest. Dendroculus collectibles. Fungi enemies. Aranara.' },

  { id:'vanarana',              name:'Vanarana',              region:'sumeru', type:'hidden',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[s7('s7-vanarana','Vanarana',10,3,'Dendro healing. Requires Aranyaka quest.')],
    notes:'Hidden Aranara village. Requires Aranyaka quest chain. Unique flora.' },

  { id:'vissudha-field',        name:'Vissudha Field',        region:'sumeru', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:22,
    statues:[s7('s7-vissudha','Vissudha Field',10,3,'Dendro healing. Fertile fields.')],
    notes:'Fertile fields north of Sumeru City. Nilotpala Lotus.' },

  { id:'ashavan-realm',         name:'Ashavan Realm',         region:'sumeru', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[], notes:'Ancient forest realm. Dendro puzzles. Ruin Golem.' },

  { id:'gandharva-ville',       name:'Gandharva Ville',       region:'sumeru', type:'village',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:12,
    statues:[], notes:'Forest village. Collei\'s home. Aranara nearby.' },

  { id:'mawtiyima-forest',      name:'Mawtiyima Forest',      region:'sumeru', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:16,
    statues:[], notes:'Deep forest. Unique Dendro mushroom puzzles.' },

  { id:'hypostyle-desert',      name:'Hypostyle Desert',      region:'sumeru', type:'desert',
    explored:0, waypointsUnlocked:0, totalWaypoints:8, totalOrbs:34,
    statues:[
      s7('s7-hypostyle-n','Hypostyle Desert (North)',10,3,'Dendro healing. Northern desert.'),
      s7('s7-hypostyle-s','Hypostyle Desert (South)',10,3,'Dendro healing. Southern desert.'),
    ],
    notes:'Vast desert. Ancient ruins. Scarab beetles. Padisarah flowers. Eremites.' },

  { id:'desert-of-hadramaveth', name:'Desert of Hadramaveth', region:'sumeru', type:'desert',
    explored:0, waypointsUnlocked:0, totalWaypoints:10, totalOrbs:42,
    statues:[
      s7('s7-hadramaveth-w','Desert of Hadramaveth (West)',12,4,'Dendro healing. Deep desert west.'),
      s7('s7-hadramaveth-e','Desert of Hadramaveth (East)',12,4,'Dendro healing. Deep desert east.'),
    ],
    notes:'Deep desert. Khaj-Nisut ruins. Setekh Wenut boss. Primal Obelisks.' },

  { id:'realm-of-farakhkert',   name:'Realm of Farakhkert',   region:'sumeru', type:'hidden',
    explored:0, waypointsUnlocked:0, totalWaypoints:6, totalOrbs:26,
    statues:[s7('s7-farakhkert','Realm of Farakhkert',12,3,'Dendro healing. Hidden underground realm.')],
    notes:'Hidden underground realm beneath the desert. Unique Dendro puzzles. Apep lore.' },

  { id:'ruins-of-dahri',        name:'Ruins of Dahri',        region:'sumeru', type:'ruins',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[], notes:'Ancient ruins. Primal Obelisk puzzles. Eremite camps.' },

  { id:'devantaka-mountain',    name:'Devantaka Mountain',    region:'sumeru', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[s7('s7-devantaka','Devantaka Mountain',10,3,'Dendro healing. Mountain region.')],
    notes:'Mountain region. Eremite camps. Jadeplume Terrorshroom boss.' },

  { id:'apam-woods',            name:'Apam Woods',            region:'sumeru', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:16,
    statues:[], notes:'Forest area. Fungi enemies. Dendro puzzles.' },

  { id:'chatrakam-cave',        name:'Chatrakam Cave',        region:'sumeru', type:'dungeon',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:10,
    statues:[], notes:'Cave system. Unique mushroom puzzles.' },

  { id:'sumeru-domain-areas',   name:'Domain Areas (Sumeru)', region:'sumeru', type:'domain_area',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:12,
    statues:[], notes:'Spire of Solitary Enlightenment, Tower of Abject Pride, etc.' },

  // ══════════════════════════════════════════════════════════════════
  // FONTAINE — Nation of Justice
  // ══════════════════════════════════════════════════════════════════
  { id:'court-of-fontaine',     name:'Court of Fontaine',     region:'fontaine', type:'city',
    explored:0, waypointsUnlocked:0, totalWaypoints:6, totalOrbs:22,
    statues:[s7('s7-court-fontaine','Court of Fontaine',10,3,'Hydro healing. Capital city.')],
    notes:'Grand capital. Opera Epiclese. Palais Mermonia. Tribunal.' },

  { id:'belleau-region',        name:'Belleau Region',        region:'fontaine', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:6, totalOrbs:26,
    statues:[
      s7('s7-belleau','Belleau Region',10,3,'Hydro healing. Pastoral region.'),
      sMoon('sm-belleau','Belleau Region',8,2,'Hydro stamina. Fontaine-exclusive statue.'),
    ],
    notes:'Pastoral region. Lakelight Lily flowers. Melusine settlements.' },

  { id:'elynas',                name:'Elynas',                region:'fontaine', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:6, totalOrbs:26,
    statues:[
      s7('s7-elynas','Elynas',10,3,'Hydro healing. Ancient whale skeleton.'),
      sMoon('sm-elynas','Elynas',8,2,'Hydro stamina. Near whale skeleton ruins.'),
    ],
    notes:'Ancient whale skeleton. Unique geological formations. Pneuma/Ousia puzzles.' },

  { id:'institute-of-natural-philosophy', name:'Institute of Natural Philosophy', region:'fontaine', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:20,
    statues:[], notes:'Research institute. Pneuma/Ousia mechanic. Clockwork Meka.' },

  { id:'beryl-region',          name:'Beryl Region',          region:'fontaine', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:20,
    statues:[
      s7('s7-beryl','Beryl Region',10,3,'Hydro healing. Coastal region.'),
      sMoon('sm-beryl','Beryl Region',8,2,'Hydro stamina. Melusine coastal area.'),
    ],
    notes:'Coastal region. Melusine settlements. Fontemer Unihorn boss.' },

  { id:'liffey-region',         name:'Liffey Region',         region:'fontaine', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:16,
    statues:[sMoon('sm-liffey','Liffey Region',8,2,'Hydro stamina. River delta.')],
    notes:'River delta. Hydro Tulpa boss. Pneuma/Ousia puzzles.' },

  { id:'morte-region',          name:'Morte Region',          region:'fontaine', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:16,
    statues:[], notes:'Cliffside region. Ancient ruins. Clockwork Meka.' },

  { id:'erinnyes-forest',       name:'Erinnyes Forest',       region:'fontaine', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:22,
    statues:[
      s7('s7-erinnyes','Erinnyes Forest',10,3,'Hydro healing. Ancient forest.'),
      sMoon('sm-erinnyes','Erinnyes Forest',8,2,'Hydro stamina. Forest statue.'),
    ],
    notes:'Ancient forest. Unique Fontaine flora. Pneuma/Ousia puzzles.' },

  { id:'poisson',               name:'Poisson',               region:'fontaine', type:'village',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:12,
    statues:[], notes:'Mining village. Fontemer Unihorn boss nearby.' },

  { id:'merusea-village',       name:'Merusea Village',       region:'fontaine', type:'village',
    explored:0, waypointsUnlocked:0, totalWaypoints:2, totalOrbs:10,
    statues:[], notes:'Underwater Melusine village. Aquatic Stamina required.' },

  { id:'salacia-plain',         name:'Salacia Plain',         region:'fontaine', type:'underwater',
    explored:0, waypointsUnlocked:0, totalWaypoints:6, totalOrbs:28,
    statues:[
      s7('s7-salacia','Salacia Plain (Underwater)',12,3,'Hydro healing. Underwater statue.'),
      sMoon('sm-salacia','Salacia Plain (Underwater)',10,3,'Hydro stamina. Deep underwater.'),
    ],
    notes:'Vast underwater plain. Unique underwater exploration. Hydroculus.' },

  { id:'roman-ruins-underwater',name:'Roman Ruins (Underwater)',region:'fontaine', type:'underwater',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[sMoon('sm-roman-ruins','Roman Ruins (Underwater)',8,2,'Hydro stamina. Submerged ruins.')],
    notes:'Submerged ancient ruins. Unique underwater puzzles.' },

  { id:'fontaine-research-institute', name:'Fontaine Research Institute', region:'fontaine', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:12,
    statues:[], notes:'Research facility. Clockwork Meka enemies.' },

  { id:'fontaine-domain-areas', name:'Domain Areas (Fontaine)',region:'fontaine', type:'domain_area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:10,
    statues:[], notes:'Denouement of Sin, Echoes of the Deep Tides, etc.' },

  // ══════════════════════════════════════════════════════════════════
  // NATLAN — Nation of War
  // ══════════════════════════════════════════════════════════════════
  { id:'natlan-city',           name:'Natlan (City of Totem)',region:'natlan', type:'city',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:14,
    statues:[], notes:'Main settlement. Pyro Archon\'s domain. Tribal council.' },

  { id:'scions-of-the-canopy',  name:'Scions of the Canopy', region:'natlan', type:'forest',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:22,
    statues:[s7('s7-canopy','Scions of the Canopy',10,3,'Pyro healing. Forest tribe.')],
    notes:'Forest tribe territory. Natlan beast riders.' },

  { id:'children-of-echoes',    name:'Children of Echoes',   region:'natlan', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:22,
    statues:[s7('s7-echoes','Children of Echoes',10,3,'Pyro healing. Echo tribe.')],
    notes:'Echo tribe territory. Sound-based puzzles.' },

  { id:'flower-feather-clan',   name:'Flower-Feather Clan',  region:'natlan', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:22,
    statues:[s7('s7-feather','Flower-Feather Clan',10,3,'Pyro healing. Feather clan.')],
    notes:'Feather clan territory. Aerial combat focus.' },

  { id:'ocelot-family',         name:'Ocelot Family',        region:'natlan', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[s7('s7-ocelot','Ocelot Family',10,3,'Pyro healing. Ocelot clan.')],
    notes:'Ocelot clan territory. Beast riders.' },

  { id:'yumkasaur-mountain',    name:'Yumkasaur Mountain',   region:'natlan', type:'mountain',
    explored:0, waypointsUnlocked:0, totalWaypoints:5, totalOrbs:22,
    statues:[s7('s7-yumkasaur','Yumkasaur Mountain',10,3,'Pyro healing. Volcanic mountain.')],
    notes:'Volcanic mountain. Pyro Regisvine variant. Lava terrain.' },

  { id:'crater',                name:'The Crater',           region:'natlan', type:'area',
    explored:0, waypointsUnlocked:0, totalWaypoints:4, totalOrbs:18,
    statues:[], notes:'Ancient volcanic crater. Lava-filled terrain.' },

  { id:'old-vines',             name:'Old Vines',            region:'natlan', type:'ruins',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:14,
    statues:[], notes:'Ancient vine-covered ruins of Natlan.' },

  { id:'natlan-domain-areas',   name:'Domain Areas (Natlan)', region:'natlan', type:'domain_area',
    explored:0, waypointsUnlocked:0, totalWaypoints:3, totalOrbs:10,
    statues:[], notes:'Natlan domain areas. Pyro-themed challenges.' },
];

// ── Region Metadata ───────────────────────────────────────────────────────────

export const REGION_META: Record<string, { name: string; arRequired: number; quest: string; element: string }> = {
  mondstadt: { name:'Mondstadt', arRequired:1,  quest:'Prologue: The Outlander Who Caught the Wind', element:'Anemo' },
  liyue:     { name:'Liyue',     arRequired:23, quest:'Chapter I: Of the Land Amidst Monoliths',     element:'Geo'   },
  inazuma:   { name:'Inazuma',   arRequired:30, quest:'Chapter II: The Immovable God and the Eternal Euthymia', element:'Electro' },
  sumeru:    { name:'Sumeru',    arRequired:35, quest:'Chapter III: Through Mists of Smoke and Forests Dark',   element:'Dendro'  },
  fontaine:  { name:'Fontaine',  arRequired:40, quest:'Chapter IV: Prelude of Blancheur and Noirceur',          element:'Hydro'   },
  natlan:    { name:'Natlan',    arRequired:45, quest:'Chapter V: Flowers Resplendent on the Sun-Scorched Sojourn', element:'Pyro' },
};

export function getRegionIds(): string[] { return Object.keys(REGION_META); }

export function getPlacesByRegion(places: PlaceState[], regionId: string): PlaceState[] {
  return places.filter(p => p.region === regionId);
}

export function getAllStatues(places: PlaceState[]): Array<PlaceStatue & { placeName: string; region: string }> {
  return places.flatMap(p => p.statues.map(s => ({ ...s, placeName: p.name, region: p.region })));
}

export function getStatuesByType(places: PlaceState[], type: StatueType): Array<PlaceStatue & { placeName: string; region: string }> {
  return getAllStatues(places).filter(s => s.statueType === type);
}

export function summarizeRegion(places: PlaceState[], regionId: string): RegionState {
  const rp = getPlacesByRegion(places, regionId);
  const totalOrbs = rp.reduce((a, p) => a + p.totalOrbs, 0);
  const allStatues = rp.flatMap(p => p.statues);
  return {
    id: regionId,
    name: REGION_META[regionId]?.name ?? regionId,
    explored: totalOrbs > 0 ? Math.round(rp.reduce((a, p) => a + p.explored * p.totalOrbs, 0) / totalOrbs) : 0,
    waypointsUnlocked: rp.reduce((a, p) => a + p.waypointsUnlocked, 0),
    totalWaypoints: rp.reduce((a, p) => a + p.totalWaypoints, 0),
    statuesUnlocked: allStatues.filter(s => s.discovered).length,
    totalStatues: allStatues.length,
  };
}

export function buildRegionSummaries(places: PlaceState[]): RegionState[] {
  return getRegionIds().map(id => summarizeRegion(places, id));
}

// ── Orb Calculation ───────────────────────────────────────────────────────────

export function calcAutoOrbsFromPlaces(places: PlaceState[]): number {
  let total = 0;
  for (const p of places) {
    const ex = p.explored / 100;
    const activatedStatues = p.statues.filter(s => s.activated).length;
    const statueBonus = p.statues.length > 0 ? (activatedStatues / p.statues.length) * 0.3 : 0;
    total += Math.floor(p.totalOrbs * (ex * 0.7 + statueBonus));
  }
  return total;
}

/** Legacy wrapper */
export function calcAutoOrbs(regions: RegionState[]): number {
  const REGION_ORBS: Record<string, number> = {
    mondstadt:140, liyue:220, inazuma:180, sumeru:260, fontaine:200, natlan:170,
  };
  let total = 0;
  for (const r of regions) {
    const density = REGION_ORBS[r.id] ?? 150;
    const ex = r.explored / 100;
    const st = r.totalStatues > 0 ? r.statuesUnlocked / r.totalStatues : 0;
    total += Math.floor(density * (ex * 0.7 + st * 0.3));
  }
  return total;
}

// ── Exploration Opportunities ─────────────────────────────────────────────────

export function calcPlaceExplorationOpportunities(places: PlaceState[]): string[] {
  const opps: string[] = [];
  // Sort by most impactful first: undiscovered statues > unopened waypoints > remaining orbs
  const sorted = [...places].sort((a, b) => {
    const aScore = (a.statues.filter(s => !s.discovered).length * 3)
      + (a.totalWaypoints - a.waypointsUnlocked)
      + Math.floor(a.totalOrbs * (1 - a.explored / 100) / 10);
    const bScore = (b.statues.filter(s => !s.discovered).length * 3)
      + (b.totalWaypoints - b.waypointsUnlocked)
      + Math.floor(b.totalOrbs * (1 - b.explored / 100) / 10);
    return bScore - aScore;
  });

  for (const p of sorted) {
    if (p.explored >= 100 && p.statues.every(s => s.discovered)) continue;
    const unopenedWp = p.totalWaypoints - p.waypointsUnlocked;
    const undiscoveredStatues = p.statues.filter(s => !s.discovered);
    const unactivatedStatues  = p.statues.filter(s => s.discovered && !s.activated);
    const orbsLeft = Math.floor(p.totalOrbs * (1 - p.explored / 100));

    for (const statue of undiscoveredStatues)
      opps.push(`Discover ${statue.name} near ${p.name} — ~${statue.nearbyOrbs} orbs nearby`);
    for (const statue of unactivatedStatues)
      opps.push(`Activate ${statue.name} near ${p.name}${statue.progressionNote ? ` (${statue.progressionNote})` : ''}`);
    if (unopenedWp > 0)
      opps.push(`Unlock ${unopenedWp} waypoint${unopenedWp > 1 ? 's' : ''} near ${p.name} (+${unopenedWp * WAYPOINT_EXP} AR EXP)`);
    if (orbsLeft > 0 && p.explored < 100)
      opps.push(`Explore ${p.name} (${p.explored}% done) — ~${orbsLeft} orbs remaining (+${orbsLeft * ORB_EXP} AR EXP)`);
  }
  return opps;
}

// ── Enemy Data ────────────────────────────────────────────────────────────────

export interface EnemyEntry {
  name: string; exp: number; risk: number;
  category: 'Common' | 'Elite' | 'Boss';
  materials: string[];
}

export const ENEMY_DATA: EnemyEntry[] = [
  { name:'Hilichurl',          exp:18,   risk:1, category:'Common', materials:['Hilichurl Arrowhead','Slime Condensate'] },
  { name:'Treasure Hoarder',   exp:24,   risk:1, category:'Common', materials:['Treasure Hoarder Insignia'] },
  { name:'Mitachurl',          exp:54,   risk:2, category:'Common', materials:['Hilichurl Horns','Hilichurl Masks'] },
  { name:'Fatui Skirmisher',   exp:150,  risk:2, category:'Elite',  materials:["Recruit's Insignia","Sergeant's Insignia"] },
  { name:'Nobushi',            exp:120,  risk:2, category:'Elite',  materials:['Old Handguard','Kageuchi Handguard'] },
  { name:'Abyss Mage',         exp:200,  risk:3, category:'Elite',  materials:['Divining Scroll','Sealed Scroll'] },
  { name:'Ruin Guard',         exp:200,  risk:3, category:'Elite',  materials:['Chaos Gear','Chaos Axis'] },
  { name:'Lawachurl',          exp:300,  risk:3, category:'Elite',  materials:['Hilichurl Horns','Heavy Horn'] },
  { name:'Geovishap',          exp:350,  risk:4, category:'Elite',  materials:['Juvenile Jade'] },
  { name:'Rifthound',          exp:250,  risk:3, category:'Elite',  materials:['Spectral Husk','Spectral Heart'] },
  { name:'Primo Geovishap',    exp:600,  risk:4, category:'Boss',   materials:['Juvenile Jade','Hurricane Seed'] },
  { name:'Regisvine Boss',     exp:600,  risk:4, category:'Boss',   materials:['Hurricane Seed','Leyline Sprout'] },
  { name:'Weekly Boss',        exp:1000, risk:5, category:'Boss',   materials:["Dvalin's Plume",'Tail of Boreas'] },
];

// ── Plan Types ────────────────────────────────────────────────────────────────

export interface EnemyStep {
  enemy: string; killCount: number; totalExp: number; materials: string[]; reason: string;
}
export interface CharUpgrade {
  name: string; priority: number; label: string; detail: string;
  mats: Record<string, number>; expNeeded: number;
}
export interface PlanStep {
  order: number; phase: string; action: string; impact: 'High' | 'Medium' | 'Low';
}
export interface GeneratedPlan {
  partyStrengthScore: number; partyStrengthLabel: string;
  charUpgrades: CharUpgrade[]; materialList: Record<string, number>;
  enemyRoute: EnemyStep[]; arExpNeeded: number; autoOrbs: number;
  orbExpContribution: number; arExpRemaining: number;
  explorationOpportunities: string[]; executionOrder: PlanStep[];
  timestamp: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLANNER ENGINE IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

function calcPartyStrength(party: OwnedCharacter[]): { score: number; label: string } {
  if (!party || party.length === 0) return { score: 0, label: 'Unformed' };

  let totalScore = 0;
  for (const char of party) {
    // Basic level scaling
    totalScore += char.level * 2;
    // Ascension bonus
    totalScore += char.ascension * 15;
    // Talent multipliers
    const avgTalent = (char.talentNa + char.talentSkill + char.talentBurst) / 3;
    totalScore += avgTalent * 10;
    // Weapon scaling
    totalScore += char.weaponLevel * 1.5;
  }

  const avgScore = totalScore / party.length;
  
  let label = 'Beginner';
  if (avgScore > 250) label = 'Overpowered';
  else if (avgScore > 180) label = 'Strong';
  else if (avgScore > 100) label = 'Capable';
  else if (avgScore > 50) label = 'Developing';

  return { score: Math.floor(avgScore), label };
}

function generateCharacterUpgrades(party: OwnedCharacter[]): CharUpgrade[] {
  const upgrades: CharUpgrade[] = [];
  if (!party) return upgrades;

  // Determine the highest level in the party to find "falling behind" characters
  const highestLevel = Math.max(...party.map(c => c.level), 0);
  
  party.forEach(char => {
    let priority = 0;
    let label = '';
    let detail = '';
    let expNeeded = 0;
    const mats: Record<string, number> = {};

    // 1. Leveling (Prioritize if trailing behind highest leveled char)
    if (char.level < highestLevel - 10) {
      const targetLv = highestLevel;
      priority = 3; // High
      label = `Level Up ${char.name}`;
      detail = `Falling behind party. Level from ${char.level} to ${targetLv}.`;
      expNeeded = calcCharExpNeeded(char.level, targetLv);
      mats["Hero's Wit"] = Math.ceil(expNeeded / 20000); // Approximation
    } 
    // 2. Ascension (If level capped)
    else if (char.level === 20 || char.level === 40 || char.level === 50 || char.level === 60 || char.level === 70 || char.level === 80) {
       priority = 3;
       label = `Ascend ${char.name}`;
       detail = `Ready for Ascension ${char.ascension + 1}.`;
       mats['Local Specialty'] = (char.ascension + 1) * 5; 
       mats['Boss Material'] = (char.ascension + 1) * 2;
    }
    // 3. Weapon (If weapon trails character level)
    else if (char.weaponLevel < char.level) {
      priority = 2; // Medium
      label = `Upgrade ${char.weaponName}`;
      detail = `Weapon is underleveled (${char.weaponLevel}) compared to character (${char.level}).`;
      mats['Weapon Enhancement Ore'] = (char.level - char.weaponLevel) * 2;
    }
    // 4. Talents (If overall talents are low compared to ascension)
    else if ((char.talentNa + char.talentSkill + char.talentBurst) / 3 < char.ascension + 1) {
      priority = 1; // Low
      label = `Upgrade Talents for ${char.name}`;
      detail = `Talents are low for current ascension phase.`;
      mats['Talent Books'] = 6;
      mats['Common Enemy Drops'] = 10;
    }

    if (label) {
      upgrades.push({ name: char.name, priority, label, detail, mats, expNeeded });
    }
  });

  // Sort by priority (descending)
  return upgrades.sort((a, b) => b.priority - a.priority);
}

function buildMaterialList(upgrades: CharUpgrade[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const up of upgrades) {
    for (const [mat, count] of Object.entries(up.mats)) {
      totals[mat] = (totals[mat] || 0) + count;
    }
  }
  return totals;
}

function generateEnemyRoute(partyStrengthScore: number, expNeeded: number): EnemyStep[] {
  const route: EnemyStep[] = [];
  if (expNeeded <= 0) return route;

  let remainingExp = expNeeded;
  
  // Filter enemies based on safe risk level for the party
  const maxRisk = partyStrengthScore > 200 ? 5 : (partyStrengthScore > 100 ? 3 : 2);
  const safeEnemies = ENEMY_DATA.filter(e => e.risk <= maxRisk);
  
  if (safeEnemies.length === 0) return route;

  // Distribute EXP needed among safe enemies
  // Prefer elites/bosses if party is strong, otherwise commons
  const sortedEnemies = safeEnemies.sort((a, b) => {
      if (partyStrengthScore > 150) return b.exp - a.exp; // Strong party prefers high exp
      return a.exp - b.exp; // Weak party prefers low exp (safer)
  });

  for (const enemy of sortedEnemies) {
    if (remainingExp <= 0) break;

    // Determine how many to kill. Don't assign *all* exp to one enemy type if possible
    const maxKills = Math.ceil(remainingExp / enemy.exp);
    const killCount = Math.min(maxKills, enemy.category === 'Boss' ? 2 : (enemy.category === 'Elite' ? 10 : 25));
    
    if (killCount > 0) {
      const expGained = killCount * enemy.exp;
      route.push({
        enemy: enemy.name,
        killCount: killCount,
        totalExp: expGained,
        materials: enemy.materials,
        reason: enemy.category === 'Boss' ? 'High yield target' : 'Farming route'
      });
      remainingExp -= expGained;
    }
  }

  return route;
}

function buildExecutionOrder(
  exploration: string[],
  upgrades: CharUpgrade[],
  enemies: EnemyStep[]
): PlanStep[] {
  const order: PlanStep[] = [];
  let stepCounter = 1;

  // 1. Easy exploration (Statues & Waypoints) - Quick AR EXP
  exploration.filter(e => e.includes('Discover') || e.includes('Activate') || e.includes('Unlock')).forEach(exp => {
      order.push({ order: stepCounter++, phase: 'Exploration', action: exp, impact: 'High' });
  });

  // 2. Character Upgrades (Leveling/Ascension) - Boost power before combat
  upgrades.filter(u => u.priority === 3).forEach(up => {
      order.push({ order: stepCounter++, phase: 'Power Up', action: `${up.label}: ${up.detail}`, impact: 'High' });
  });

  // 3. Farming Routes
  enemies.forEach(enemy => {
       order.push({ order: stepCounter++, phase: 'Combat', action: `Hunt ${enemy.killCount}x ${enemy.enemy} for ${enemy.totalExp} EXP and materials.`, impact: 'Medium' });
  });

  // 4. Weapon/Talent Upgrades - Use farmed materials
  upgrades.filter(u => u.priority < 3).forEach(up => {
      order.push({ order: stepCounter++, phase: 'Refinement', action: `${up.label}: ${up.detail}`, impact: 'Medium' });
  });

  // 5. Deep Exploration (Orbs/100%) - Time consuming
  exploration.filter(e => e.includes('Explore')).forEach(exp => {
      order.push({ order: stepCounter++, phase: 'Exploration', action: exp, impact: 'Low' });
  });

  return order;
}

export function generatePlan(
  setup: AccountSetup,
  characters: OwnedCharacter[],
  party: string[],
  places: PlaceState[]
): GeneratedPlan {
  
  // Resolve string IDs back to actual OwnedCharacter objects for internal calculation
  const activeParty = characters.filter(c => party.includes(c.id));

  // 1. Calculate AR EXP Needs
  const arExpNeeded = calcARExpNeeded(setup.ar, setup.arExp, setup.targetAR);

  // 2. Analyze Party Strength
  const { score: partyStrengthScore, label: partyStrengthLabel } = calcPartyStrength(activeParty);

  // 3. Generate Upgrades
  const charUpgrades = generateCharacterUpgrades(activeParty);
  const materialList = buildMaterialList(charUpgrades);

  // 4. Exploration and Orbs
  const autoOrbs = calcAutoOrbsFromPlaces(places);
  const explorationOpportunities = calcPlaceExplorationOpportunities(places);
  
  // Calculate expected AR EXP from exploration opportunities
  let orbExpContribution = 0;
  for (const opp of explorationOpportunities) {
     if (opp.includes('waypoint')) {
         const match = opp.match(/\+(\d+)\sAR EXP/);
         if (match) orbExpContribution += parseInt(match[1], 10);
     } else if (opp.includes('orbs remaining')) {
         const match = opp.match(/\+(\d+)\sAR EXP/);
         if (match) orbExpContribution += parseInt(match[1], 10);
     }
  }

  // 5. Combat Needs
  const arExpRemaining = Math.max(0, arExpNeeded - orbExpContribution);
  const enemyRoute = generateEnemyRoute(partyStrengthScore, arExpRemaining);

  // 6. Final Execution Plan
  const executionOrder = buildExecutionOrder(explorationOpportunities, charUpgrades, enemyRoute);

  return {
    partyStrengthScore,
    partyStrengthLabel,
    charUpgrades,
    materialList,
    enemyRoute,
    arExpNeeded,
    autoOrbs,
    orbExpContribution,
    arExpRemaining,
    explorationOpportunities,
    executionOrder,
    timestamp: new Date().toISOString()
  };
}

export interface AcquisitionSetup {
  targetCharId: string;
  targetCharName: string;
  targetCharRegion: string;
  currentPrimos: number;
}

export interface QuestRequirement {
  name: string;
  description: string;
  met: boolean;
}

export interface GeneratedAcquisitionPlan {
  targetCharName: string;

  primosNeeded: number;
  primosRemaining: number;
  pullsNeeded: number;

  questRequirements: {
    name: string;
    description: string;
    met: boolean;
  }[];

  basePlan: GeneratedPlan;
}

export function generateAcquisitionPlan(
  acq: AcquisitionSetup,
  setup: AccountSetup,
  characters: OwnedCharacter[],
  party: string[],
  places: PlaceState[]
): GeneratedAcquisitionPlan {

  const basePlan = generatePlan(
    setup,
    characters,
    party,
    places
  );

  return {
    targetCharName: acq.targetCharName,

    primosNeeded: 25600,

    primosRemaining: Math.max(
      0,
      25600 - acq.currentPrimos
    ),

    pullsNeeded: Math.ceil(
      Math.max(0, 25600 - acq.currentPrimos) / 160
    ),

    questRequirements: [
      {
        name: "Adventure Rank Requirement",
        description: `Reach AR ${Math.max(40, setup.targetAR)}`,
        met: setup.ar >= Math.max(40, setup.targetAR),
      },

      {
        name: "Exploration Progression",
        description: "Unlock statues and nearby waypoints",
        met: calcAutoOrbsFromPlaces(places) > 20,
      },
    ],

    basePlan,
  };
}