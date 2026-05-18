import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Database from "better-sqlite3";
import genshindb from "genshin-db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    element TEXT,
    weaponType TEXT,
    region TEXT,
    rarity INTEGER
  );

  CREATE TABLE IF NOT EXISTS weapons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    weaponType TEXT,
    rarity INTEGER
  );

  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    rarity INTEGER
  );

  CREATE TABLE IF NOT EXISTS enemies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    baseExp INTEGER DEFAULT 0,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    totalWaypoints INTEGER DEFAULT 0,
    totalChests INTEGER DEFAULT 0,
    totalStatues INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    type TEXT NOT NULL,
    totalWaypoints INTEGER DEFAULT 0,
    totalOrbs INTEGER DEFAULT 0,
    totalStatues INTEGER DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS user_goals (
    id TEXT PRIMARY KEY,
    characterId TEXT,
    currentLevel INTEGER,
    targetLevel INTEGER,
    weaponId TEXT,
    weaponCurrentLevel INTEGER,
    weaponTargetLevel INTEGER,
    talentNa INTEGER,
    talentSkill INTEGER,
    talentBurst INTEGER,
    talentTargetNa INTEGER,
    talentTargetSkill INTEGER,
    talentTargetBurst INTEGER
  );
`);

// ---------------------------------------------------------------------------
// Sync helpers
// ---------------------------------------------------------------------------
function syncCharacters() {
  const names: string[] = genshindb.characters('names', { matchCategories: true }) as any;
  const insert = db.prepare('INSERT OR REPLACE INTO characters (id, name, element, weaponType, region, rarity) VALUES (?, ?, ?, ?, ?, ?)');
  const tx = db.transaction((list: string[]) => {
    for (const n of list) {
      const c: any = genshindb.characters(n);
      if (c) insert.run(c.name.toLowerCase().replace(/ /g, '-'), c.name, c.element || 'Unknown', c.weapontype || c.weaponType || 'Unknown', c.region || 'Unknown', c.rarity || 4);
    }
  });
  tx(names);
  return names.length;
}

function syncWeapons() {
  const names: string[] = genshindb.weapons('names', { matchCategories: true }) as any;
  const insert = db.prepare('INSERT OR REPLACE INTO weapons (id, name, weaponType, rarity) VALUES (?, ?, ?, ?)');
  const tx = db.transaction((list: string[]) => {
    for (const n of list) {
      const w: any = genshindb.weapons(n);
      if (w) insert.run(w.name.toLowerCase().replace(/ /g, '-'), w.name, w.weapontype || w.weaponType || 'Unknown', w.rarity || 4);
    }
  });
  tx(names);
  return names.length;
}

function syncMaterials() {
  const names: string[] = genshindb.materials('names', { matchCategories: true }) as any;
  const insert = db.prepare('INSERT OR REPLACE INTO materials (id, name, category, rarity) VALUES (?, ?, ?, ?)');
  const tx = db.transaction((list: string[]) => {
    for (const n of list) {
      const m: any = genshindb.materials(n);
      if (m) insert.run(m.name.toLowerCase().replace(/ /g, '-'), m.name, m.category || 'Unknown', m.rarity || 1);
    }
  });
  tx(names);
  return names.length;
}

function seedRegions() {
  const regionData = [
    { id: 'mondstadt', name: 'Mondstadt', totalWaypoints: 66, totalChests: 354, totalStatues: 7 },
    { id: 'liyue', name: 'Liyue', totalWaypoints: 100, totalChests: 581, totalStatues: 12 },
    { id: 'inazuma', name: 'Inazuma', totalWaypoints: 72, totalChests: 413, totalStatues: 9 },
    { id: 'sumeru', name: 'Sumeru', totalWaypoints: 127, totalChests: 765, totalStatues: 14 },
    { id: 'fontaine', name: 'Fontaine', totalWaypoints: 93, totalChests: 520, totalStatues: 10 },
    { id: 'natlan', name: 'Natlan', totalWaypoints: 80, totalChests: 410, totalStatues: 8 },
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO regions (id, name, totalWaypoints, totalChests, totalStatues) VALUES (?, ?, ?, ?, ?)');
  for (const r of regionData) insert.run(r.id, r.name, r.totalWaypoints, r.totalChests, r.totalStatues);
  return regionData.length;
}

function seedPlaces() {
  // Full place-level exploration data — all real in-game locations
  const places = [
    // MONDSTADT
    { id:'mondstadt-city',         name:'Mondstadt City',                    region:'mondstadt', type:'area',        totalWaypoints:4,  totalOrbs:12,  totalStatues:0, notes:'The main city of Mondstadt.' },
    { id:'windrise',               name:'Windrise',                          region:'mondstadt', type:'statue_area', totalWaypoints:3,  totalOrbs:18,  totalStatues:1, notes:'Sacred tree south of Mondstadt.' },
    { id:'springvale',             name:'Springvale',                        region:'mondstadt', type:'village',     totalWaypoints:2,  totalOrbs:10,  totalStatues:0, notes:'Small hunting village.' },
    { id:'dawn-winery',            name:'Dawn Winery',                       region:'mondstadt', type:'landmark',    totalWaypoints:2,  totalOrbs:14,  totalStatues:0, notes:"Diluc's winery estate." },
    { id:'starsnatch-cliff',       name:'Starsnatch Cliff',                  region:'mondstadt', type:'area',        totalWaypoints:3,  totalOrbs:16,  totalStatues:0, notes:'Coastal cliffs east of Mondstadt.' },
    { id:'stormterrors-lair',      name:"Stormterror's Lair",                region:'mondstadt', type:'landmark',    totalWaypoints:4,  totalOrbs:20,  totalStatues:1, notes:'Ancient ruins where Dvalin resided.' },
    { id:'wolvendom',              name:'Wolvendom',                         region:'mondstadt', type:'area',        totalWaypoints:3,  totalOrbs:15,  totalStatues:0, notes:"Forest domain of the wolf pack." },
    { id:'brightcrown-mountains',  name:'Brightcrown Mountains',             region:'mondstadt', type:'area',        totalWaypoints:4,  totalOrbs:18,  totalStatues:1, notes:'Mountainous region north of Mondstadt.' },
    { id:'whispering-woods',       name:'Whispering Woods',                  region:'mondstadt', type:'forest',      totalWaypoints:2,  totalOrbs:10,  totalStatues:0, notes:'Dense forest west of Mondstadt.' },
    { id:'dragonspine',            name:'Dragonspine',                       region:'mondstadt', type:'area',        totalWaypoints:8,  totalOrbs:35,  totalStatues:1, notes:'Frozen mountain south of Mondstadt.' },
    { id:'cape-oath',              name:'Cape Oath',                         region:'mondstadt', type:'area',        totalWaypoints:2,  totalOrbs:8,   totalStatues:0, notes:'Southeastern coastal cape.' },
    { id:'dadaupa-gorge',          name:'Dadaupa Gorge',                     region:'mondstadt', type:'area',        totalWaypoints:2,  totalOrbs:10,  totalStatues:0, notes:'Gorge filled with Hilichurl camps.' },
    { id:'stormbearer-mountains',  name:'Stormbearer Mountains',             region:'mondstadt', type:'area',        totalWaypoints:3,  totalOrbs:12,  totalStatues:0, notes:'Northern mountains with strong winds.' },
    { id:'stormbearer-point',      name:'Stormbearer Point',                 region:'mondstadt', type:'area',        totalWaypoints:2,  totalOrbs:8,   totalStatues:0, notes:'Coastal point at the northern tip.' },
    { id:'falcon-coast',           name:'Falcon Coast',                      region:'mondstadt', type:'area',        totalWaypoints:2,  totalOrbs:9,   totalStatues:0, notes:'Eastern coast of Mondstadt.' },
    // LIYUE
    { id:'liyue-harbor',           name:'Liyue Harbor',                      region:'liyue',     type:'area',        totalWaypoints:4,  totalOrbs:14,  totalStatues:0, notes:'The great trading port of Liyue.' },
    { id:'qingce-village',         name:'Qingce Village',                    region:'liyue',     type:'village',     totalWaypoints:3,  totalOrbs:16,  totalStatues:1, notes:'Peaceful mountain village.' },
    { id:'wangshu-inn',            name:'Wangshu Inn',                       region:'liyue',     type:'landmark',    totalWaypoints:2,  totalOrbs:10,  totalStatues:0, notes:"Elevated inn above the wetlands." },
    { id:'guili-plains',           name:'Guili Plains',                      region:'liyue',     type:'area',        totalWaypoints:4,  totalOrbs:22,  totalStatues:1, notes:'Ancient battlefield ruins.' },
    { id:'lisha',                  name:'Lisha',                             region:'liyue',     type:'area',        totalWaypoints:5,  totalOrbs:24,  totalStatues:1, notes:'Fertile farmland region of Liyue.' },
    { id:'minlin',                 name:'Minlin',                            region:'liyue',     type:'area',        totalWaypoints:4,  totalOrbs:20,  totalStatues:1, notes:'Mountainous area with ancient ruins.' },
    { id:'mt-hulao',               name:'Mt. Hulao',                         region:'liyue',     type:'area',        totalWaypoints:3,  totalOrbs:16,  totalStatues:0, notes:'Mountain with Geo Hypostasis boss.' },
    { id:'yaoguang-shoal',         name:'Yaoguang Shoal',                    region:'liyue',     type:'area',        totalWaypoints:3,  totalOrbs:14,  totalStatues:0, notes:'Coastal shoal with glowing waters.' },
    { id:'dihua-marsh',            name:'Dihua Marsh',                       region:'liyue',     type:'area',        totalWaypoints:3,  totalOrbs:14,  totalStatues:0, notes:'Wetland marsh area.' },
    { id:'luhua-pool',             name:'Luhua Pool',                        region:'liyue',     type:'area',        totalWaypoints:3,  totalOrbs:14,  totalStatues:0, notes:'Ancient ruins submerged in a pool.' },
    { id:'tianqiu-valley',         name:'Tianqiu Valley',                    region:'liyue',     type:'area',        totalWaypoints:2,  totalOrbs:12,  totalStatues:0, notes:'Valley with ancient towers.' },
    { id:'jueyun-karst',           name:'Jueyun Karst',                      region:'liyue',     type:'area',        totalWaypoints:3,  totalOrbs:16,  totalStatues:1, notes:'Karst landscape with floating rocks.' },
    { id:'nantianmen',             name:'Nantianmen',                        region:'liyue',     type:'area',        totalWaypoints:3,  totalOrbs:14,  totalStatues:0, notes:'Southern gate area of Liyue.' },
    { id:'chasm-surface',          name:'The Chasm (Surface)',               region:'liyue',     type:'area',        totalWaypoints:6,  totalOrbs:28,  totalStatues:1, notes:'Surface area of the massive mining chasm.' },
    { id:'chasm-underground',      name:'The Chasm (Underground Mines)',     region:'liyue',     type:'dungeon',     totalWaypoints:8,  totalOrbs:40,  totalStatues:0, notes:'Vast underground mine network.' },
    { id:'sea-of-clouds',          name:'Sea of Clouds',                     region:'liyue',     type:'area',        totalWaypoints:4,  totalOrbs:18,  totalStatues:1, notes:'High-altitude cloud sea area.' },
    // INAZUMA
    { id:'narukami-island',        name:'Narukami Island',                   region:'inazuma',   type:'subregion',   totalWaypoints:14, totalOrbs:50,  totalStatues:2, notes:'Main island of Inazuma.' },
    { id:'kannazuka',              name:'Kannazuka',                         region:'inazuma',   type:'subregion',   totalWaypoints:10, totalOrbs:38,  totalStatues:1, notes:'War-torn island.' },
    { id:'yashiori-island',        name:'Yashiori Island',                   region:'inazuma',   type:'subregion',   totalWaypoints:10, totalOrbs:36,  totalStatues:1, notes:"Island with the Serpent's Head ruins." },
    { id:'watatsumi-island',       name:'Watatsumi Island',                  region:'inazuma',   type:'subregion',   totalWaypoints:8,  totalOrbs:30,  totalStatues:1, notes:'Resistance headquarters.' },
    { id:'seirai-island',          name:'Seirai Island',                     region:'inazuma',   type:'subregion',   totalWaypoints:8,  totalOrbs:28,  totalStatues:1, notes:'Perpetual storm island.' },
    { id:'tsurumi-island',         name:'Tsurumi Island',                    region:'inazuma',   type:'subregion',   totalWaypoints:8,  totalOrbs:28,  totalStatues:1, notes:'Fog-shrouded island with ancient ruins.' },
    { id:'enkanomiya',             name:'Enkanomiya',                        region:'inazuma',   type:'dungeon',     totalWaypoints:14, totalOrbs:55,  totalStatues:0, notes:'Ancient underwater civilization.' },
    { id:'inazuma-city',           name:'Inazuma City',                      region:'inazuma',   type:'area',        totalWaypoints:3,  totalOrbs:10,  totalStatues:0, notes:'Capital city of Inazuma.' },
    // SUMERU
    { id:'sumeru-city',            name:'Sumeru City',                       region:'sumeru',    type:'area',        totalWaypoints:5,  totalOrbs:16,  totalStatues:0, notes:'The great city of knowledge.' },
    { id:'avidya-forest',          name:'Avidya Forest',                     region:'sumeru',    type:'forest',      totalWaypoints:8,  totalOrbs:36,  totalStatues:2, notes:'Dense rainforest east of Sumeru City.' },
    { id:'vanarana',               name:'Vanarana',                          region:'sumeru',    type:'forest',      totalWaypoints:4,  totalOrbs:18,  totalStatues:1, notes:'Hidden Aranara village.' },
    { id:'vissudha-field',         name:'Vissudha Field',                    region:'sumeru',    type:'area',        totalWaypoints:5,  totalOrbs:22,  totalStatues:1, notes:'Fertile fields north of Sumeru City.' },
    { id:'ashavan-realm',          name:'Ashavan Realm',                     region:'sumeru',    type:'forest',      totalWaypoints:4,  totalOrbs:18,  totalStatues:0, notes:'Ancient forest realm.' },
    { id:'gandharva-ville',        name:'Gandharva Ville',                   region:'sumeru',    type:'village',     totalWaypoints:3,  totalOrbs:12,  totalStatues:0, notes:'Forest village.' },
    { id:'hypostyle-desert',       name:'Hypostyle Desert',                  region:'sumeru',    type:'desert',      totalWaypoints:8,  totalOrbs:34,  totalStatues:2, notes:'Vast desert with ancient ruins.' },
    { id:'desert-of-hadramaveth',  name:'Desert of Hadramaveth',             region:'sumeru',    type:'desert',      totalWaypoints:10, totalOrbs:42,  totalStatues:2, notes:'Deep desert region.' },
    { id:'ruins-of-dahri',         name:'Ruins of Dahri',                    region:'sumeru',    type:'area',        totalWaypoints:4,  totalOrbs:18,  totalStatues:0, notes:'Ancient ruins in the desert.' },
    { id:'devantaka-mountain',     name:'Devantaka Mountain',                region:'sumeru',    type:'area',        totalWaypoints:4,  totalOrbs:18,  totalStatues:1, notes:'Mountain region with Eremite camps.' },
    { id:'apam-woods',             name:'Apam Woods',                        region:'sumeru',    type:'forest',      totalWaypoints:4,  totalOrbs:16,  totalStatues:0, notes:'Forest area with Fungi enemies.' },
    // FONTAINE
    { id:'court-of-fontaine',      name:'Court of Fontaine',                 region:'fontaine',  type:'area',        totalWaypoints:6,  totalOrbs:22,  totalStatues:1, notes:'The grand capital of Fontaine.' },
    { id:'belleau-region',         name:'Belleau Region',                    region:'fontaine',  type:'area',        totalWaypoints:6,  totalOrbs:26,  totalStatues:1, notes:'Pastoral region of Fontaine.' },
    { id:'elynas',                 name:'Elynas',                            region:'fontaine',  type:'area',        totalWaypoints:6,  totalOrbs:26,  totalStatues:1, notes:'Ancient whale skeleton region.' },
    { id:'institute-of-natural-philosophy', name:'Institute of Natural Philosophy', region:'fontaine', type:'area', totalWaypoints:5,  totalOrbs:20,  totalStatues:0, notes:'Research institute area.' },
    { id:'beryl-region',           name:'Beryl Region',                      region:'fontaine',  type:'area',        totalWaypoints:5,  totalOrbs:20,  totalStatues:1, notes:'Coastal region of Fontaine.' },
    { id:'liffey-region',          name:'Liffey Region',                     region:'fontaine',  type:'area',        totalWaypoints:4,  totalOrbs:16,  totalStatues:0, notes:'River delta region.' },
    { id:'morte-region',           name:'Morte Region',                      region:'fontaine',  type:'area',        totalWaypoints:4,  totalOrbs:16,  totalStatues:0, notes:'Cliffside region with ancient ruins.' },
    { id:'poisson',                name:'Poisson',                           region:'fontaine',  type:'village',     totalWaypoints:3,  totalOrbs:12,  totalStatues:0, notes:'Mining village.' },
    { id:'merusea-village',        name:'Merusea Village',                   region:'fontaine',  type:'village',     totalWaypoints:2,  totalOrbs:10,  totalStatues:0, notes:'Underwater Melusine village.' },
    { id:'salacia-plain',          name:'Salacia Plain',                     region:'fontaine',  type:'underwater',  totalWaypoints:6,  totalOrbs:28,  totalStatues:1, notes:'Vast underwater plain.' },
    { id:'roman-ruins',            name:'Roman Ruins (Underwater)',          region:'fontaine',  type:'underwater',  totalWaypoints:4,  totalOrbs:18,  totalStatues:0, notes:'Submerged ancient ruins.' },
    // NATLAN
    { id:'natlan-city',            name:'Natlan (City of Totem)',            region:'natlan',    type:'area',        totalWaypoints:4,  totalOrbs:14,  totalStatues:0, notes:"Main settlement of Natlan." },
    { id:'scions-of-the-canopy',   name:'Scions of the Canopy',              region:'natlan',    type:'area',        totalWaypoints:5,  totalOrbs:22,  totalStatues:1, notes:'Forest tribe territory.' },
    { id:'children-of-echoes',     name:'Children of Echoes',                region:'natlan',    type:'area',        totalWaypoints:5,  totalOrbs:22,  totalStatues:1, notes:'Echo tribe territory.' },
    { id:'flower-feather-clan',    name:'Flower-Feather Clan',               region:'natlan',    type:'area',        totalWaypoints:5,  totalOrbs:22,  totalStatues:1, notes:'Feather clan territory.' },
    { id:'ocelot-family',          name:'Ocelot Family',                     region:'natlan',    type:'area',        totalWaypoints:4,  totalOrbs:18,  totalStatues:1, notes:'Ocelot clan territory.' },
    { id:'yumkasaur-mountain',     name:'Yumkasaur Mountain',                region:'natlan',    type:'area',        totalWaypoints:5,  totalOrbs:22,  totalStatues:1, notes:'Volcanic mountain region.' },
    { id:'crater',                 name:'The Crater',                        region:'natlan',    type:'area',        totalWaypoints:4,  totalOrbs:18,  totalStatues:0, notes:'Ancient volcanic crater.' },
    { id:'old-vines',              name:'Old Vines',                         region:'natlan',    type:'area',        totalWaypoints:3,  totalOrbs:14,  totalStatues:0, notes:'Ancient vine-covered ruins.' },
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO places (id, name, region, type, totalWaypoints, totalOrbs, totalStatues, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of places) insert.run(p.id, p.name, p.region, p.type, p.totalWaypoints, p.totalOrbs, p.totalStatues, p.notes);
  return places.length;
}

function seedEnemies() {
  const enemyData = [
    { id: 'hilichurl', name: 'Hilichurl', baseExp: 18, category: 'Common' },
    { id: 'mitachurl', name: 'Mitachurl', baseExp: 54, category: 'Common' },
    { id: 'ruin-guard', name: 'Ruin Guard', baseExp: 200, category: 'Elite' },
    { id: 'abyss-mage', name: 'Abyss Mage', baseExp: 200, category: 'Elite' },
    { id: 'fatui-skirmisher', name: 'Fatui Skirmisher', baseExp: 200, category: 'Elite' },
    { id: 'lawachurl', name: 'Lawachurl', baseExp: 300, category: 'Elite' },
    { id: 'geovishap', name: 'Geovishap', baseExp: 350, category: 'Elite' },
    { id: 'world-boss', name: 'World Boss (Weekly)', baseExp: 1000, category: 'Boss' },
    { id: 'regisvine', name: 'Regisvine (Boss)', baseExp: 600, category: 'Boss' },
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO enemies (id, name, baseExp, category) VALUES (?, ?, ?, ?)');
  for (const e of enemyData) insert.run(e.id, e.name, e.baseExp, e.category);
  return enemyData.length;
}

// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // FULL INITIAL FETCH (first launch)
  app.post("/api/fetch-all", (req, res) => {
    try {
      const prevCharCount = (db.prepare('SELECT COUNT(*) as c FROM characters').get() as any).c;
      const prevWeapCount = (db.prepare('SELECT COUNT(*) as c FROM weapons').get() as any).c;
      const prevMatCount  = (db.prepare('SELECT COUNT(*) as c FROM materials').get() as any).c;

      const charCount = syncCharacters();
      const weapCount = syncWeapons();
      const matCount  = syncMaterials();
      const regCount  = seedRegions();
      const enmCount  = seedEnemies();
      const plcCount  = seedPlaces();

      const newChars = charCount - prevCharCount;
      const newWeaps = weapCount - prevWeapCount;
      const newMats  = matCount  - prevMatCount;

      db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sync', ?)").run(new Date().toISOString());
      db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('db_seeded', '1')").run();

      res.json({
        success: true,
        seeded: true,
        counts: { characters: charCount, weapons: weapCount, materials: matCount, regions: regCount, enemies: enmCount, places: plcCount },
        newItems: { characters: newChars, weapons: newWeaps, materials: newMats, total: newChars + newWeaps + newMats }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // REFRESH CHECK (future update support)
  app.post("/api/refresh", (req, res) => {
    try {
      const prevCharCount = (db.prepare('SELECT COUNT(*) as c FROM characters').get() as any).c;
      const prevWeapCount = (db.prepare('SELECT COUNT(*) as c FROM weapons').get() as any).c;
      const prevMatCount  = (db.prepare('SELECT COUNT(*) as c FROM materials').get() as any).c;

      syncCharacters();
      syncWeapons();
      syncMaterials();

      const newCharCount = (db.prepare('SELECT COUNT(*) as c FROM characters').get() as any).c;
      const newWeapCount = (db.prepare('SELECT COUNT(*) as c FROM weapons').get() as any).c;
      const newMatCount  = (db.prepare('SELECT COUNT(*) as c FROM materials').get() as any).c;

      const newChars = newCharCount - prevCharCount;
      const newWeaps = newWeapCount - prevWeapCount;
      const newMats  = newMatCount  - prevMatCount;
      const total    = newChars + newWeaps + newMats;

      db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sync', ?)").run(new Date().toISOString());

      res.json({
        success: true,
        newItems: { characters: newChars, weapons: newWeaps, materials: newMats, total },
        message: total > 0 ? `${total} new items added to local database.` : 'Database is already up to date.'
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Legacy sync (kept for backward compat)
  app.post("/api/sync", (req, res) => {
    try {
      syncCharacters(); syncWeapons();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/db-status", (req, res) => {
    const seeded = db.prepare("SELECT value FROM meta WHERE key = 'db_seeded'").get() as any;
    const lastSync = db.prepare("SELECT value FROM meta WHERE key = 'last_sync'").get() as any;
    const charCount = (db.prepare('SELECT COUNT(*) as c FROM characters').get() as any).c;
    const weapCount = (db.prepare('SELECT COUNT(*) as c FROM weapons').get() as any).c;
    const matCount  = (db.prepare('SELECT COUNT(*) as c FROM materials').get() as any).c;
    res.json({ seeded: seeded?.value === '1', lastSync: lastSync?.value || null, charCount, weapCount, matCount });
  });

  app.get("/api/characters", (req, res) => {
    const chars = db.prepare('SELECT * FROM characters ORDER BY name').all();
    res.json(chars);
  });

  app.get("/api/weapons", (req, res) => {
    const weaps = db.prepare('SELECT * FROM weapons ORDER BY rarity DESC, name').all();
    res.json(weaps);
  });

  app.get("/api/materials", (req, res) => {
    const mats = db.prepare('SELECT * FROM materials ORDER BY name').all();
    res.json(mats);
  });

  app.get("/api/enemies", (req, res) => {
    const enemies = db.prepare('SELECT * FROM enemies ORDER BY baseExp').all();
    res.json(enemies);
  });

  app.get("/api/regions", (req, res) => {
    const regions = db.prepare('SELECT * FROM regions ORDER BY name').all();
    res.json(regions);
  });

  app.get("/api/places", (req, res) => {
    const places = db.prepare('SELECT * FROM places ORDER BY region, name').all();
    res.json(places);
  });

  app.get("/api/places/:region", (req, res) => {
    const places = db.prepare('SELECT * FROM places WHERE region = ? ORDER BY name').all(req.params.region);
    res.json(places);
  });

  // Goals CRUD
  app.get("/api/goals", (req, res) => {
    const goals = db.prepare('SELECT * FROM user_goals').all();
    res.json(goals.map((g: any) => ({
      id: g.id, characterId: g.characterId,
      currentLevel: g.currentLevel, targetLevel: g.targetLevel,
      weaponId: g.weaponId, weaponCurrentLevel: g.weaponCurrentLevel,
      weaponTargetLevel: g.weaponTargetLevel,
      talents: { na: g.talentNa, skill: g.talentSkill, burst: g.talentBurst },
      talentTargets: { na: g.talentTargetNa, skill: g.talentTargetSkill, burst: g.talentTargetBurst }
    })));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`GPIP Offline Server running on http://localhost:${PORT}`));
}

startServer().catch((err) => console.error("Failed to start server:", err));
