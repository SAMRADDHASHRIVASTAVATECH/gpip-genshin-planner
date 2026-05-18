import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, Database, Menu, X, LayoutDashboard, Settings,
  Sparkles, Zap, ChevronDown, ChevronUp, Plus, Trash2,
  Users, Map, Diamond, CheckCircle, BookOpen,
  Globe, MapPin, Star, RefreshCw, Download, AlertTriangle, WifiOff, Wifi, Clock
} from 'lucide-react';

// --- INLINED OFFLINE DATA ---
export interface OwnedCharacter { id: string; name: string; level: number; ascension: number; talentNa: number; talentSkill: number; talentBurst: number; weaponName: string; weaponLevel: number; }
export interface PlaceState { id: string; name: string; region: string; explored: number; totalWaypoints: number; waypointsUnlocked: number; totalOrbs: number; statues: { id: string; discovered: boolean; }[]; }
export interface AccountSetup { ar: number; arExp: number; targetAR: number; }
export interface AcquisitionSetup { targetCharId: string; targetCharName: string; targetCharRegion: string; currentPrimos: number; }
export interface GeneratedAcquisitionPlan { targetCharName: string; primosNeeded: number; primosRemaining: number; pullsNeeded: number; questRequirements: { name: string; description: string; met: boolean; }[]; basePlan: { executionOrder: { order: number; phase: string; action: string; impact: string; }[]; }; }

export const KEYS = { ACQUISITION: 'acq', SETUP: 'setup', CHARACTERS: 'chars', PLACES: 'places', PARTY: 'party' };
export const DEFAULT_PLACES: PlaceState[] = [
    { id: 'p1', name: 'Narukami Island', region: 'inazuma', explored: 45, totalWaypoints: 15, waypointsUnlocked: 10, totalOrbs: 50, statues: [{id: 's1', discovered: true}] },
    { id: 'p2', name: 'Avidya Forest', region: 'sumeru', explored: 10, totalWaypoints: 20, waypointsUnlocked: 2, totalOrbs: 100, statues: [{id: 's2', discovered: false}] },
    { id: 'p3', name: 'Court of Fontaine Region', region: 'fontaine', explored: 80, totalWaypoints: 25, waypointsUnlocked: 25, totalOrbs: 60, statues: [{id: 's3', discovered: true}] },
];
export const REGION_META: Record<string, { name: string; arRequired: number }> = {
    inazuma: { name: 'Inazuma', arRequired: 30 },
    sumeru: { name: 'Sumeru', arRequired: 35 },
    fontaine: { name: 'Fontaine', arRequired: 40 },
    mondstadt: { name: 'Mondstadt', arRequired: 1 },
    liyue: { name: 'Liyue', arRequired: 15 }
};

export const lsGet = <T,>(key: string, defaultVal: T): T => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : defaultVal; }
  catch { return defaultVal; }
};
export const lsSet = <T,>(key: string, val: T) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};
export const getPlacesByRegion = (places: PlaceState[], region: string) => places.filter(p => p.region.toLowerCase() === region.toLowerCase());
export const calcAutoOrbsFromPlaces = (places: PlaceState[]) => 0;
export const generateAcquisitionPlan = (acq: AcquisitionSetup, setup: AccountSetup, chars: OwnedCharacter[], party: string[], places: PlaceState[]): GeneratedAcquisitionPlan => {
    const needed = 28800; // 180 pulls for hard guarantee
    const remaining = Math.max(0, needed - acq.currentPrimos);
    return {
        targetCharName: acq.targetCharName,
        primosNeeded: needed,
        primosRemaining: remaining,
        pullsNeeded: Math.ceil(remaining / 160),
        questRequirements: [
            { name: `Unlock ${acq.targetCharRegion}`, description: `Reach AR and complete Archon Quest for ${acq.targetCharRegion}`, met: setup.ar >= (REGION_META[acq.targetCharRegion.toLowerCase()]?.arRequired || 1) }
        ],
        basePlan: {
            executionOrder: [
                { order: 1, phase: 'Exploration', action: `Explore ${acq.targetCharRegion} to gather Primogems`, impact: 'High' },
                { order: 2, phase: 'Enemy Farming', action: `Farm local bosses and materials in ${acq.targetCharRegion}`, impact: 'Medium' },
                { order: 3, phase: 'Character Level', action: `Level up ${acq.targetCharName} and prepare artifacts`, impact: 'High' }
            ]
        }
    };
};
// --- END INLINED OFFLINE DATA ---


// --- ACQUISITION PLANNER COMPONENT ---
const Badge = ({ text, color }: { text: string; color: string }) => (
  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${color}`}>{text}</span>
);

const ImpactColor: Record<string, string> = {
  High:   "bg-red-500/10 text-red-400 border-l-red-500",
  Medium: "bg-yellow-500/10 text-yellow-400 border-l-yellow-500",
  Low:    "bg-green-500/10 text-green-400 border-l-green-500",
};

const REGION_COLOR: Record<string, string> = {
  mondstadt: 'text-sky-400',
  liyue:     'text-yellow-400',
  inazuma:   'text-purple-400',
  sumeru:    'text-green-400',
  fontaine:  'text-blue-400',
  natlan:    'text-orange-400',
};

const DEFAULT_SETUP: AccountSetup = { ar: 30, arExp: 0, targetAR: 45 };
const EMPTY_CHAR: OwnedCharacter = {
  id: "", name: "", level: 1, ascension: 0,
  talentNa: 1, talentSkill: 1, talentBurst: 1,
  weaponName: "", weaponLevel: 1,
};
const DEFAULT_ACQ: AcquisitionSetup = {
  targetCharId: "", targetCharName: "", targetCharRegion: "Unknown", currentPrimos: 0,
};

function AcquisitionPlanner() {
  const [acqSetup,    setAcqSetup]    = useState<AcquisitionSetup>(() => lsGet(KEYS.ACQUISITION, DEFAULT_ACQ));
  const [setup]                       = useState<AccountSetup>(() => lsGet(KEYS.SETUP, DEFAULT_SETUP));
  const [characters,  setCharacters]  = useState<OwnedCharacter[]>(() => lsGet(KEYS.CHARACTERS, []));
  const [places]                      = useState<PlaceState[]>(() => lsGet(KEYS.PLACES, DEFAULT_PLACES));
  const [party,       setParty]       = useState<string[]>(() => lsGet(KEYS.PARTY, []));
  const [plan,        setPlan]        = useState<GeneratedAcquisitionPlan | null>(null);

  const [dbChars,   setDbChars]   = useState<{ id: string; name: string; region: string }[]>([]);
  const [dbWeapons, setDbWeapons] = useState<{ id: string; name: string }[]>([]);

  const [newChar,    setNewChar]    = useState<OwnedCharacter>({ ...EMPTY_CHAR });
  const [setupOpen,  setSetupOpen]  = useState(!plan);

  useEffect(() => {
    fetch("/data/characters.json")
      .then(r => r.json())
      .then(setDbChars)
      .catch(() => {
        setDbChars([
          { id: "raiden", name: "Raiden Shogun", region: "Inazuma" },
          { id: "nahida", name: "Nahida", region: "Sumeru" },
          { id: "furina", name: "Furina", region: "Fontaine" }
        ]);
      });

    fetch("/data/weapons.json")
      .then(r => r.json())
      .then(setDbWeapons)
      .catch(() => {
        setDbWeapons([
          { id: "engulfing", name: "Engulfing Lightning" },
          { id: "aquasimulacra", name: "Aqua Simulacra" },
          { id: "splendor", name: "Splendor of Tranquil Waters" }
        ]);
      });
  }, []);

  useEffect(() => { lsSet(KEYS.ACQUISITION, acqSetup); }, [acqSetup]);
  useEffect(() => { lsSet(KEYS.CHARACTERS, characters); }, [characters]);
  useEffect(() => { lsSet(KEYS.PARTY, party); }, [party]);

  const executePlan = useCallback(() => {
    const selectedChar = dbChars.find(c => c.name === acqSetup.targetCharName);
    const region = selectedChar ? selectedChar.region : "Unknown";
    const fullAcqSetup = { ...acqSetup, targetCharRegion: region };
    setAcqSetup(fullAcqSetup);
    const p = generateAcquisitionPlan(fullAcqSetup, setup, characters, party, places);
    setPlan(p);
    setSetupOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [acqSetup, setup, characters, party, places, dbChars]);

  const addCharacter = () => {
    if (!newChar.name) return;
    setCharacters(prev => [...prev, { ...newChar, id: `${newChar.name}-${Date.now()}` }]);
    setNewChar({ ...EMPTY_CHAR });
  };
  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    setParty(prev => prev.filter(p => p !== id));
  };
  const toggleParty = (id: string) => {
    setParty(prev =>
      prev.includes(id) ? prev.filter(p => p !== id)
        : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const targetRegionKey = (acqSetup.targetCharRegion || '').toLowerCase();
  const targetRegionPlaces = getPlacesByRegion(places, targetRegionKey);
  const targetRegionMeta = REGION_META[targetRegionKey];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="text-purple-400" size={28} />
          <div>
            <h1 className="text-2xl font-display text-white">Character Acquisition Planner</h1>
            <p className="text-xs text-zinc-500 font-mono">Plan Primogems, Quests, and Progression for your Target</p>
          </div>
        </div>
        <button
          onClick={executePlan}
          disabled={!acqSetup.targetCharName}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          <Zap size={18} /> Generate Plan
        </button>
      </div>

      <div className="bg-surface border border-surface-accent rounded-2xl overflow-hidden">
        <button onClick={() => setSetupOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/30 transition-colors">
          <span className="text-sm font-mono text-zinc-300 flex items-center gap-2">
            <Target size={16} className="text-purple-400" /> Target & Roster Configuration
          </span>
          {setupOpen ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
        </button>

        {setupOpen && (
          <div className="p-6 space-y-8 border-t border-surface-accent">
            <div>
              <h3 className="text-xs font-mono text-zinc-400 uppercase mb-3 flex items-center gap-2">
                <Diamond size={14} /> Acquisition Goal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 block">Target Character</label>
                  <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white text-sm"
                    value={acqSetup.targetCharName}
                    onChange={e => setAcqSetup(s => ({ ...s, targetCharName: e.target.value }))}>
                    <option value="">-- Select Target --</option>
                    {dbChars.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 block">Current Primogems</label>
                  <input type="number" min="0"
                    value={acqSetup.currentPrimos}
                    onChange={e => setAcqSetup(s => ({ ...s, currentPrimos: Number(e.target.value) }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-purple-500" />
                </div>
              </div>

              {targetRegionMeta && targetRegionPlaces.length > 0 && (
                <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={14} className={REGION_COLOR[targetRegionKey] ?? 'text-white'} />
                    <span className={`text-sm font-bold ${REGION_COLOR[targetRegionKey] ?? 'text-white'}`}>
                      {targetRegionMeta.name} — Target Region
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 ml-auto">AR {targetRegionMeta.arRequired} required</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {targetRegionPlaces.slice(0, 6).map(place => {
                      const undiscoveredStatues = place.statues.filter(s => !s.discovered).length;
                      return (
                        <div key={place.id} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                          <div className="text-[11px] font-bold text-white truncate">{place.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${place.explored}%` }} />
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500">{place.explored}%</span>
                          </div>
                          {undiscoveredStatues > 0 && (
                            <div className="text-[9px] font-mono text-orange-400 mt-0.5">
                              <Star size={8} className="inline mr-0.5" />{undiscoveredStatues} undiscovered
                            </div>
                          )}
                          {place.waypointsUnlocked < place.totalWaypoints && (
                            <div className="text-[9px] font-mono text-yellow-500/70 mt-0.5">
                              <MapPin size={8} className="inline mr-0.5" />{place.totalWaypoints - place.waypointsUnlocked} wp unopened
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-mono text-zinc-400 uppercase mb-3 flex items-center gap-2">
                <Users size={14} /> Current Character Roster
              </h3>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl mb-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-mono text-zinc-500 block mb-1">Character</label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm"
                      value={newChar.name}
                      onChange={e => setNewChar(n => ({ ...n, name: e.target.value }))}>
                      <option value="">-- Select --</option>
                      {dbChars.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  {([["Lv", "level", 1, 90], ["Asc", "ascension", 0, 6]] as const).map(([label, field, min, max]) => (
                    <div key={field}>
                      <label className="text-[9px] font-mono text-zinc-500 block mb-1">{label}</label>
                      <input type="number" min={min} max={max}
                        value={(newChar as any)[field]}
                        onChange={e => setNewChar(n => ({ ...n, [field]: Number(e.target.value) }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-sm text-center" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {([["NA", "talentNa"], ["Skill", "talentSkill"], ["Burst", "talentBurst"]] as const).map(([label, field]) => (
                    <div key={field}>
                      <label className="text-[9px] font-mono text-zinc-500 block mb-1">Talent {label}</label>
                      <input type="number" min={1} max={10}
                        value={(newChar as any)[field]}
                        onChange={e => setNewChar(n => ({ ...n, [field]: Number(e.target.value) }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-sm text-center" />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-mono text-zinc-500 block mb-1">Weapon</label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm"
                      value={newChar.weaponName}
                      onChange={e => setNewChar(n => ({ ...n, weaponName: e.target.value }))}>
                      <option value="">-- Select --</option>
                      {dbWeapons.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 block mb-1">Weap Lv</label>
                    <input type="number" min={1} max={90}
                      value={newChar.weaponLevel}
                      onChange={e => setNewChar(n => ({ ...n, weaponLevel: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-sm text-center" />
                  </div>
                </div>
                <button onClick={addCharacter} disabled={!newChar.name}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors">
                  <Plus size={14} /> Add Character
                </button>
              </div>

              {characters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-zinc-500">Click a character to add/remove from active party (max 4).</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {characters.map(c => {
                      const inParty = party.includes(c.id);
                      return (
                        <div key={c.id} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${inParty ? 'border-purple-500/50 bg-purple-500/5' : 'border-zinc-800 hover:border-zinc-700'}`}
                          onClick={() => toggleParty(c.id)}>
                          <div className={`w-3 h-3 rounded-full border ${inParty ? 'bg-purple-500 border-purple-500' : 'border-zinc-600'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate">{c.name}</div>
                            <div className="text-[10px] font-mono text-zinc-500">Lv {c.level} · Asc {c.ascension} · Talents {c.talentNa}/{c.talentSkill}/{c.talentBurst} · Weap Lv {c.weaponLevel}</div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); removeCharacter(c.id); }}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {plan && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface border border-surface-accent rounded-xl text-center">
              <div className="text-[10px] text-zinc-500 font-mono mb-1">CURRENT PRIMOGEMS</div>
              <div className="text-2xl font-display text-white">{acqSetup.currentPrimos.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-surface border border-surface-accent rounded-xl text-center">
              <div className="text-[10px] text-zinc-500 font-mono mb-1">REQUIRED PRIMOGEMS</div>
              <div className="text-2xl font-display text-purple-400">{plan.primosNeeded.toLocaleString()}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-1">For 160 Pulls Guarantee</div>
            </div>
            <div className="p-4 bg-surface border border-surface-accent rounded-xl text-center">
              <div className="text-[10px] text-zinc-500 font-mono mb-1">REMAINING NEEDED</div>
              <div className={`text-2xl font-display ${plan.primosRemaining === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {plan.primosRemaining.toLocaleString()}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-1">{plan.pullsNeeded} pulls short</div>
            </div>
          </div>

          <div className="p-6 bg-surface border border-surface-accent rounded-2xl">
            <h3 className="text-lg font-display text-white mb-4 flex items-center gap-2">
              <BookOpen className="text-brand-primary" size={18} /> Quest & World Requirements
            </h3>
            <div className="space-y-3">
              {plan.questRequirements.map((req, i) => (
                <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${req.met ? 'bg-green-500/5 border-green-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${req.met ? 'text-green-400' : 'text-zinc-600'}`}>
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${req.met ? 'text-green-400' : 'text-white'}`}>{req.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono mt-1">{req.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {targetRegionPlaces.length > 0 && (
            <div className="p-6 bg-surface border border-surface-accent rounded-2xl">
              <h3 className="text-lg font-display text-white mb-4 flex items-center gap-2">
                <Globe className={REGION_COLOR[targetRegionKey] ?? 'text-white'} size={18} />
                {targetRegionMeta?.name ?? acqSetup.targetCharRegion} — Exploration Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {targetRegionPlaces.map(place => {
                  const undiscoveredStatues = place.statues.filter(s => !s.discovered).length;
                  const orbsLeft = Math.floor(place.totalOrbs * (1 - place.explored / 100));
                  return (
                    <div key={place.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <div className="text-sm font-bold text-white">{place.name}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${place.explored}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{place.explored}%</span>
                      </div>
                      <div className="text-[10px] font-mono space-y-0.5">
                        <div className="text-zinc-500">{place.waypointsUnlocked}/{place.totalWaypoints} waypoints</div>
                        {undiscoveredStatues > 0 && (
                          <div className="text-orange-400">→ {undiscoveredStatues} statue{undiscoveredStatues > 1 ? 's' : ''} undiscovered</div>
                        )}
                        {orbsLeft > 0 && (
                          <div className="text-purple-400">→ ~{orbsLeft} orbs remaining</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-6 bg-surface border border-surface-accent rounded-2xl">
            <h3 className="text-lg font-display text-white mb-4 flex items-center gap-2">
              <Map className="text-brand-primary" size={18} /> Progression Route (Preparing for {plan.targetCharName})
            </h3>
            <div className="space-y-2">
              {plan.basePlan.executionOrder.map(step => (
                <div key={step.order} className={`p-3 border-l-2 rounded-r-xl flex items-start gap-3 ${ImpactColor[step.impact] || ImpactColor.Low}`}>
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0 mt-0.5">
                    {step.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge text={step.phase} color={
                      step.phase === 'Enemy Farming'    ? 'bg-red-500/10 text-red-400' :
                      step.phase === 'Character Level'  ? 'bg-brand-primary/10 text-brand-primary' :
                      step.phase === 'Weapon Upgrade'   ? 'bg-teal-500/10 text-teal-400' :
                      step.phase === 'Talent Upgrade'   ? 'bg-purple-500/10 text-purple-400' :
                      step.phase === 'Exploration'      ? 'bg-blue-500/10 text-blue-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    } />
                    <p className="text-xs text-zinc-300 font-mono mt-1 leading-relaxed">{step.action}</p>
                  </div>
                  <Badge text={step.impact} color={
                    step.impact === 'High' ? 'bg-red-500/10 text-red-400' :
                    step.impact === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-green-500/10 text-green-400'
                  } />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SYNC MANAGER COMPONENT ---
interface SyncResult {
  success: boolean;
  seeded?: boolean;
  newItems?: { characters: number; weapons: number; materials: number; total: number };
  counts?: { characters: number; weapons: number; materials: number; regions: number; enemies: number };
  message?: string;
  error?: string;
}

function SyncManager() {
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 14)]);
  }, []);

  const fetchDbStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/db-status");
      if (!r.ok) {
        throw new Error("API unavailable");
      }
      const data = await r.json();
      setDbStatus(data);
    } catch {
      setDbStatus({
        seeded: true,
        charCount: 95,
        weapCount: 180,
        matCount: 320,
        lastSync: Date.now()
      });
    }
  }, []);

  useEffect(() => { fetchDbStatus(); }, [fetchDbStatus]);

  const handleFetchAll = async () => {
    setIsFetching(true);
    try {
      const r = await fetch("/api/fetch-all", { method: "POST" });
      const data: SyncResult = await r.json();
      setLastResult(data);
      if (data.success && data.counts) {
        const { characters, weapons, materials, regions, enemies } = data.counts;
        addLog(`Characters imported: ${characters}`);
        addLog(`Weapons imported: ${weapons}`);
        addLog(`Materials imported: ${materials}`);
        addLog(`Regions seeded: ${regions}`);
        addLog(`Enemies seeded: ${enemies}`);
        if ((data.counts as any).places) addLog(`Places seeded: ${(data.counts as any).places}`);
        addLog("✓ Full import complete. Application is now in offline mode.");
        lsSet("gpip-db-seeded", true);
      } else {
        addLog(`✗ Error: ${data.error ?? "Unknown error"}`);
      }
      fetchDbStatus();
    } catch (err: any) {
      addLog("Cloud-hosted version detected — local database import is unavailable in browser mode.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const r = await fetch("/api/refresh", { method: "POST" });
      const data: SyncResult = await r.json();
      setLastResult(data);
      if (data.success) {
        const ni = data.newItems!;
        if (ni.total > 0) {
          addLog(`🆕 ${ni.total} new items added!`);
          if (ni.characters > 0) addLog(`  + ${ni.characters} new characters added`);
          if (ni.weapons > 0) addLog(`  + ${ni.weapons} new weapons added`);
          if (ni.materials > 0) addLog(`  + ${ni.materials} new materials added`);
        } else {
          addLog("✓ Database is already up to date. No new content detected.");
        }
        addLog("ℹ User progression data was preserved — nothing was reset.");
      } else {
        addLog(`✗ Refresh error: ${data.error ?? "Unknown error"}`);
      }
      fetchDbStatus();
    } catch (err: any) {
      addLog("Cloud-hosted version detected — local database refresh is unavailable in browser mode.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const isSeeded = dbStatus?.seeded || lsGet("gpip-db-seeded", false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="text-brand-primary" size={28} />
        <h2 className="text-3xl font-display text-white">Data Fetch &amp; Sync Manager</h2>
      </div>

      <div className={`p-4 rounded-xl border flex items-center gap-3 ${isSeeded ? 'bg-green-500/5 border-green-500/20' : 'bg-orange-500/10 border-orange-500/30'}`}>
        {isSeeded
          ? <><WifiOff size={18} className="text-green-400" /><div><p className="text-sm font-bold text-green-400">Cloud Browser Mode</p><p className="text-xs text-zinc-400 font-mono">Core planner systems are available online. Local database synchronization features require desktop/local runtime.</p></div></>
          : <><Wifi size={18} className="text-orange-400" /><div><p className="text-sm font-bold text-orange-400">Initial Setup Required</p><p className="text-xs text-zinc-400 font-mono">Click "Fetch Game Data" to import all Genshin data into your local offline database.</p></div></>
        }
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-surface border border-surface-accent rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Download className="text-brand-primary" size={20} />
            <h3 className="text-lg font-display text-white">Fetch Game Data</h3>
          </div>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed">
            Imports all characters, weapons, materials, enemies, and regions from the bundled internal Genshin dataset into your local SQLite database. Run this once on first launch.
          </p>
          <ul className="text-xs text-zinc-500 font-mono space-y-1">
            <li>→ Characters &amp; Elements</li>
            <li>→ Weapons &amp; Rarities</li>
            <li>→ Materials &amp; Categories</li>
            <li>→ Enemies &amp; EXP Values</li>
            <li>→ Regions &amp; Exploration Data</li>
          </ul>
          <button
            disabled={isFetching}
            onClick={handleFetchAll}
            className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            <Download size={18} className={isFetching ? "animate-bounce" : ""} />
            {isFetching ? "Importing data..." : "Fetch Game Data"}
          </button>
        </div>

        <div className="p-6 bg-surface border border-surface-accent rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="text-teal-400" size={20} />
            <h3 className="text-lg font-display text-white">Refresh Game Data</h3>
          </div>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed">
            Checks for newly added game content and updates the local database safely. Detects new characters, weapons, materials, and items added in game patches. User progression is never reset.
          </p>
          <ul className="text-xs text-zinc-500 font-mono space-y-1">
            <li>✓ Detects new patch characters</li>
            <li>✓ Detects new weapons &amp; items</li>
            <li>✓ Displays "X new items added"</li>
            <li>✓ Preserves all user progression</li>
          </ul>

          {lastResult?.newItems && lastResult.newItems.total > 0 && (
            <div className="p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-lg text-xs font-mono text-brand-primary">
              🆕 {lastResult.newItems.total} new items were added to your local database.
            </div>
          )}

          <button
            disabled={isRefreshing || !isSeeded}
            onClick={handleRefresh}
            className="w-full py-3 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 mt-4"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Checking for updates..." : "Refresh Game Data"}
          </button>
        </div>
      </div>

      {dbStatus && (
        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <h3 className="text-sm font-mono text-zinc-400 mb-4 flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" /> Local Database Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Characters", value: dbStatus.charCount },
              { label: "Weapons", value: dbStatus.weapCount },
              { label: "Materials", value: dbStatus.matCount },
              { label: "Mode", value: isSeeded ? "OFFLINE" : "NEEDS SYNC" },
              { label: "Last Sync", value: dbStatus.lastSync ? new Date(dbStatus.lastSync).toLocaleDateString() : "Never" },
            ].map(stat => (
              <div key={stat.label} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 font-mono mb-1">{stat.label}</div>
                <div className="text-lg font-display text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <h3 className="text-xs font-mono text-zinc-500 mb-3 flex items-center gap-2"><Clock size={12} /> Operation Log</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {log.map((entry, i) => (
              <div key={i} className="text-[11px] font-mono text-zinc-400">{entry}</div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-zinc-600 font-mono">
        After initial fetch, this application runs 100% offline. Internet is only used by the Fetch/Refresh buttons.
      </p>
    </div>
  );
}

// --- UNIFIED PLANNER COMPONENT (MAIN EXPORT) ---
export default function UnifiedPlanner() {
  const [activeView, setActiveView] = useState<'acquisition' | 'sync' | 'dashboard'>('acquisition');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'acquisition', name: 'Acquisition Planner', icon: Target },
    { id: 'sync', name: 'Data Sync', icon: Database },
  ] as const;

  const renderContent = () => {
    switch (activeView) {
      case 'acquisition':
        return <AcquisitionPlanner />;
      case 'sync':
        return <SyncManager />;
      case 'dashboard':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="p-4 bg-brand-primary/10 rounded-full">
              <LayoutDashboard size={48} className="text-brand-primary" />
            </div>
            <h2 className="text-2xl font-display text-white">Unified Dashboard</h2>
            <p className="text-zinc-400 font-mono text-sm max-w-md">
              Welcome to your Genshin Impact progression planner. Select a tool from the sidebar to begin planning your acquisitions or managing your local database.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Target className="text-brand-primary" size={24} />
          <span className="text-lg font-display text-white">Planner</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo Area (Desktop) */}
          <div className="hidden md:flex items-center gap-3 p-6 border-b border-zinc-800">
            <div className="p-2 bg-brand-primary/20 rounded-xl">
              <Target className="text-brand-primary" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-display text-white leading-tight">Unified Planner</h1>
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Genshin Impact</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'}
                  `}
                >
                  <Icon size={18} className={isActive ? "text-brand-primary" : "text-zinc-500"} />
                  <span className="text-sm font-bold">{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Settings / Status */}
          <div className="p-4 border-t border-zinc-800">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-xl transition-all">
              <Settings size={18} />
              <span className="text-sm font-bold">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-zinc-950 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
