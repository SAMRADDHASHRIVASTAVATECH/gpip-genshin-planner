import React, { useState, useEffect, useCallback } from "react";
import {
  lsGet, lsSet, KEYS, generateAcquisitionPlan, DEFAULT_PLACES, REGION_META,
  getPlacesByRegion, calcAutoOrbsFromPlaces,
  OwnedCharacter, PlaceState, AccountSetup, GeneratedAcquisitionPlan,
  AcquisitionSetup,
} from "../lib/offlineData";
import {
  Sparkles, Zap, ChevronDown, ChevronUp, Plus, Trash2,
  Users, Map, Diamond, CheckCircle, BookOpen, Target,
  Globe, MapPin, Star,
} from "lucide-react";

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

export default function AcquisitionPlanner() {
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
    fetch("/api/characters").then(r => r.json()).then(setDbChars).catch(() => {});
    fetch("/api/weapons").then(r => r.json()).then(setDbWeapons).catch(() => {});
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

  // Region places for the target character's region
  const targetRegionKey = (acqSetup.targetCharRegion || '').toLowerCase();
  const targetRegionPlaces = getPlacesByRegion(places, targetRegionKey);
  const targetRegionMeta = REGION_META[targetRegionKey];
  const autoOrbs = calcAutoOrbsFromPlaces(places);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
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

      {/* Setup Panel */}
      <div className="bg-surface border border-surface-accent rounded-2xl overflow-hidden">
        <button
          onClick={() => setSetupOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/30 transition-colors"
        >
          <span className="text-sm font-mono text-zinc-300 flex items-center gap-2">
            <Target size={16} className="text-purple-400" /> Target & Roster Configuration
          </span>
          {setupOpen ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
        </button>

        {setupOpen && (
          <div className="p-6 space-y-8 border-t border-surface-accent">
            {/* Target Character & Primos */}
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

              {/* Target region preview */}
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
                              <Star size={8} className="inline mr-0.5" />{undiscoveredStatues} statue{undiscoveredStatues > 1 ? 's' : ''} undiscovered
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
                  {targetRegionPlaces.length > 6 && (
                    <p className="text-[9px] font-mono text-zinc-600 mt-2">+{targetRegionPlaces.length - 6} more locations in {targetRegionMeta.name}</p>
                  )}
                </div>
              )}
            </div>

            {/* Character Roster */}
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

      {/* Plan Output */}
      {plan && (
        <div className="space-y-6">
          {/* Primogem Requirements */}
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

          {/* Quest & Region Requirements */}
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

          {/* Target Region Place Overview */}
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
                          <div className="text-orange-400">
                            → {undiscoveredStatues} statue{undiscoveredStatues > 1 ? 's' : ''} undiscovered
                          </div>
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

          {/* Integrated Progression Plan */}
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
