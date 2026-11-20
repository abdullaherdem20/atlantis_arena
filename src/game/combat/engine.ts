import { arenaById } from '../../data/arenas';
import { characterById } from '../../data/characters';
import { storeEvents } from '../../data/events';
import type { Arena, BattleAction, BattleCharacterStats, BattleLog, BattleResult, BattleTurn, Combatant, StoreEvent, Team } from '../../types/game';
import { SeededRandom } from '../../utils/rng';
import { getTeamBonuses, type TeamBonuses } from './synergies';

interface TurnModifiers {
  attack: number;
  defense: number;
  speed: number;
  crit: number;
  accuracy: number;
  special: number;
  healing: number;
  normalOnly: boolean;
  forcedNormalId?: string;
  weakenedId?: string;
  doubleHitId?: string;
}

const emptyStats = (): BattleCharacterStats => ({ damageDealt: 0, damageTaken: 0, healing: 0, shieldGiven: 0, criticals: 0, specials: 0, ultimates: 0, eliminations: 0 });
const cloneFighters = (fighters: Combatant[]): Combatant[] => fighters.map((fighter) => ({ ...fighter, buffs: { ...fighter.buffs }, stats: { ...fighter.stats }, statsBattle: { ...fighter.statsBattle }, appearance: [...fighter.appearance], quotes: [...fighter.quotes] }));
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const rollPerformance = (rng: SeededRandom): Combatant['performance'] => {
  const roll = rng.next();
  if (roll < .18) return { label: 'Kötü Gün', multiplier: .90 };
  if (roll < .78) return { label: 'Normal Gün', multiplier: 1 };
  if (roll < .96) return { label: 'İyi Gün', multiplier: 1.10 };
  return { label: 'Efsanevi Gün', multiplier: 1.20 };
};

const buildFighter = (id: string, team: Team, arena: Arena, bonuses: TeamBonuses, rng: SeededRandom): Combatant => {
  const character = characterById[id];
  if (!character) throw new Error(`Karakter bulunamadı: ${id}`);
  const arenaActive = arena.department === character.department;
  let hp = character.stats.hp;
  let attack = character.stats.attack * (1 + bonuses.attack);
  let defense = character.stats.defense * (1 + bonuses.defense);
  let speed = character.stats.speed;
  let crit = character.stats.crit + bonuses.crit;
  const performance = rollPerformance(rng);
  if (bonuses.siblingIds.includes(id)) { attack *= 1.2; defense *= 1.2; }
  if (arenaActive) {
    if (arena.bonusType === 'hp') hp *= 1 + arena.bonus;
    if (arena.bonusType === 'attack') attack *= 1 + arena.bonus;
    if (arena.bonusType === 'defense') defense *= 1 + arena.bonus;
    if (arena.bonusType === 'speed') speed *= 1 + arena.bonus;
    if (arena.bonusType === 'crit') crit += arena.bonus;
  }
  attack *= performance.multiplier;
  defense *= performance.multiplier;
  speed *= .96 + (performance.multiplier - .9) * .4;
  const maxHp = Math.round(hp);
  return { ...character, stats: { ...character.stats, attack, defense, speed, crit }, teamId: team.id, currentHp: maxHp, maxHp, energy: 0, shield: 0, alive: true, buffs: {}, performance, statsBattle: emptyStats() };
};

export const estimateWinChance = (leftTeam: Team, rightTeam: Team, arena: Arena, seed: number, samples = 320): [number, number] => {
  const rng = new SeededRandom(seed ^ 0x5f3759df);
  const teamRating = (team: Team): number => {
    const bonuses = getTeamBonuses(team);
    const base = team.characterIds.reduce((sum, id) => sum + characterById[id]!.power, 0);
    const arenaCount = team.characterIds.filter((id) => characterById[id]!.department === arena.department).length;
    return base * (1 + bonuses.attack * .55 + bonuses.defense * .45 + bonuses.special * .3 + arenaCount * arena.bonus * .035);
  };
  const leftRating = teamRating(leftTeam);
  const rightRating = teamRating(rightTeam);
  let leftWins = 0;
  const day = () => {
    const roll = rng.next();
    return roll < .18 ? .9 : roll < .78 ? 1 : roll < .96 ? 1.1 : 1.2;
  };
  for (let index = 0; index < samples; index += 1) {
    const leftScore = leftRating * day() * (.86 + rng.next() * .28) * (.94 + rng.next() * .12);
    const rightScore = rightRating * day() * (.86 + rng.next() * .28) * (.94 + rng.next() * .12);
    if (leftScore >= rightScore) leftWins += 1;
  }
  const left = Math.round(leftWins / samples * 100);
  return [left, 100 - left];
};

const eligibleEvents = (fighters: Combatant[], rarity: StoreEvent['rarity'], previousId?: string): StoreEvent[] => {
  const aliveIds = new Set(fighters.filter((fighter) => fighter.alive).map((fighter) => fighter.id));
  return storeEvents.filter((event) => {
    if (event.rarity !== rarity || event.id === previousId) return false;
    if (event.specialCharacter && !aliveIds.has(event.specialCharacter)) return false;
    if (event.id === 'siblings') {
      const arda = fighters.find((fighter) => fighter.id === 'arda' && fighter.alive);
      const ozgur = fighters.find((fighter) => fighter.id === 'ozgur-sercan' && fighter.alive);
      return Boolean(arda && ozgur && arda.teamId === ozgur.teamId);
    }
    return true;
  });
};

const chooseEvent = (rng: SeededRandom, fighters: Combatant[], previousId?: string): StoreEvent => {
  const roll = rng.next();
  const rarity: StoreEvent['rarity'] = roll < .7 ? 'Normal' : roll < .95 ? 'Nadir' : 'Efsanevi';
  let options = eligibleEvents(fighters, rarity, previousId);
  if (!options.length) options = eligibleEvents(fighters, 'Normal', previousId);
  return rng.pick(options);
};

const heal = (fighter: Combatant, amount: number): number => {
  if (!fighter.alive) return 0;
  const applied = Math.min(Math.max(0, Math.round(amount)), fighter.maxHp - fighter.currentHp);
  fighter.currentHp += applied;
  return applied;
};

const applyEvent = (event: StoreEvent, fighters: Combatant[], rng: SeededRandom, modifiers: TurnModifiers, logs: BattleLog[]): void => {
  const alive = fighters.filter((fighter) => fighter.alive);
  const addLog = (text: string, type: BattleLog['type'] = 'event') => logs.push({ text, type });
  switch (event.id) {
    case 'mayfest': modifiers.attack += .10; break;
    case 'alarm': {
      const targets = alive.filter((fighter) => fighter.id !== 'yusuf');
      if (targets.length) { modifiers.weakenedId = rng.pick(targets).id; addLog(`${characterById[modifiers.weakenedId]!.name} alarmdan etkilendi.`); }
      if (alive.some((fighter) => fighter.id === 'yusuf')) addLog('YUSUF alarmdan etkilenmedi.');
      break;
    }
    case 'high-flow': break;
    case 'low-flow': alive.forEach((fighter) => heal(fighter, fighter.maxHp * .10)); break;
    case 'complaint': modifiers.weakenedId = rng.pick(alive).id; break;
    case 'meal': alive.forEach((fighter) => heal(fighter, fighter.maxHp * .15)); break;
    case 'shipment': alive.forEach((fighter) => { fighter.shield += 12; }); break;
    case 'queue': modifiers.speed -= .20; break;
    case 'checkout-fail': alive.filter((fighter) => fighter.department === 'Danışma').forEach((fighter) => { fighter.energy = Math.max(0, fighter.energy - 20); }); break;
    case 'out-stock': modifiers.forcedNormalId = rng.pick(alive).id; break;
    case 'journey': alive.forEach((fighter) => { if (/ay|hafta|Yeni/.test(fighter.experience) && !/yıl/.test(fighter.experience)) fighter.buffs.journey = 1; }); break;
    case 'protein': modifiers.healing += .30; break;
    case 'ski': modifiers.special += .20; break;
    case 'bike': modifiers.speed += .20; break;
    case 'tent': alive.filter((fighter) => fighter.department === 'Quechua').forEach((fighter) => { fighter.shield += 18; }); break;
    case 'closing': modifiers.attack += .15; break;
    case 'alarms': modifiers.crit += .05; break;
    case 'shelf': modifiers.defense += .10; break;
    case 'return': { const target = rng.pick(alive); heal(target, (target.maxHp - target.currentHp) * .35); break; }
    case 'checkout-ok': alive.filter((fighter) => fighter.department === 'Danışma').forEach((fighter) => { fighter.energy = clamp(fighter.energy + 20, 0, 100); }); break;
    case 'record': modifiers.attack += .10; alive.filter((fighter) => fighter.id === 'yusuf').forEach((fighter) => { fighter.buffs.record = 1; }); break;
    case 'forclaz': alive.filter((fighter) => fighter.id === 'yusuf').forEach((fighter) => { fighter.energy = 100; }); addLog('YUSUF: “Forclaz mı? Yine mi?”', 'special'); break;
    case 'foot': alive.filter((fighter) => fighter.id === 'deniz-arda').forEach((fighter) => { fighter.buffs.foot = 1; }); break;
    case 'theatre': alive.filter((fighter) => fighter.id === 'sude').forEach((fighter) => { fighter.buffs.theatre = 1; }); break;
    case 'siblings': alive.filter((fighter) => fighter.id === 'arda' || fighter.id === 'ozgur-sercan').forEach((fighter) => heal(fighter, fighter.maxHp * .20)); break;
    case 'boss': alive.filter((fighter) => fighter.teamId === alive.find((member) => member.id === 'gokhan')?.teamId).forEach((fighter) => { fighter.buffs.boss = 1; }); break;
    case 'payday': modifiers.attack += .20; alive.forEach((fighter) => { fighter.energy = clamp(fighter.energy + 15, 0, 100); }); break;
    case 'bonus': alive.forEach((fighter) => { fighter.energy = clamp(fighter.energy + 30, 0, 100); }); break;
    case 'black-friday': modifiers.attack += .30; break;
    case 'outage': modifiers.accuracy -= .20; break;
    case 'inventory-night': modifiers.normalOnly = true; break;
    case 'visit': alive.filter((fighter) => fighter.manager).forEach((fighter) => { fighter.buffs.visit = 1; }); break;
    case 'regional': alive.filter((fighter) => fighter.manager).forEach((fighter) => { fighter.energy = 100; }); break;
    case 'historic-record': modifiers.attack += .30; break;
    case 'annual-inventory': alive.forEach((fighter) => { fighter.energy = 0; }); break;
    case 'mystery': modifiers.doubleHitId = rng.pick(alive).id; break;
    case 'chaos': modifiers.attack += .50; modifiers.crit += .20; break;
    default: break;
  }
};

const actionKind = (actor: Combatant, event: StoreEvent, modifiers: TurnModifiers): BattleAction['kind'] => {
  if (actor.id === 'abdullah' || modifiers.normalOnly || modifiers.forcedNormalId === actor.id) return 'attack';
  const costMultiplier = event.id === 'high-flow' ? 1.2 : 1;
  if (actor.energy >= 100 * costMultiplier && (actor.buffs.ultimateCooldown ?? 0) <= 0) return 'ultimate';
  if (actor.energy >= 50 * costMultiplier && (actor.buffs.specialCooldown ?? 0) <= 0) return 'special';
  return 'attack';
};

const selectTarget = (actor: Combatant, enemies: Combatant[], rng: SeededRandom): Combatant => {
  const available = enemies.filter((enemy) => enemy.alive);
  const pool = available.length ? available : enemies;
  if (actor.role === 'saldırı' && rng.next() < .55) return [...pool].sort((a, b) => a.currentHp - b.currentHp)[0]!;
  return rng.pick(pool);
};

const attackMultiplier = (actor: Combatant, kind: BattleAction['kind'], bonuses: TeamBonuses, modifiers: TurnModifiers, turn: number): number => {
  let value = 1 + modifiers.attack + (actor.buffs.journey ? .20 : 0) + (actor.buffs.record ? .40 : 0) + (actor.buffs.visit ? .25 : 0);
  if (modifiers.weakenedId === actor.id) value *= .5;
  if (actor.id === 'yusuf') {
    const fallenAllies = Math.min(4, actor.buffs.fallenAllies ?? 0);
    value *= 1 + fallenAllies * .125;
  }
  if (kind === 'special') value *= 1.35 + bonuses.special + modifiers.special + (actor.buffs.foot ? 1 : 0);
  if (kind === 'ultimate') value *= 1.85 + bonuses.special + modifiers.special;
  if (turn > 15) value *= 1 + (turn - 15) * .14;
  return value;
};

const applyDamage = (actor: Combatant, target: Combatant, rawDamage: number): number => {
  const rounded = Math.max(1, Math.round(rawDamage));
  const absorbed = Math.min(target.shield, rounded);
  target.shield -= absorbed;
  const hpDamage = Math.min(target.currentHp, rounded - absorbed);
  target.currentHp -= hpDamage;
  actor.statsBattle.damageDealt += hpDamage + absorbed;
  target.statsBattle.damageTaken += hpDamage + absorbed;
  return hpDamage + absorbed;
};

const teamSupport = (actor: Combatant, allies: Combatant[], enemies: Combatant[], kind: BattleAction['kind'], modifiers: TurnModifiers, bonuses: TeamBonuses, logs: BattleLog[]): void => {
  const aliveAllies = allies.filter((ally) => ally.alive);
  const weakest = [...aliveAllies].sort((a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp)[0];
  const healFactor = (1 + modifiers.healing + bonuses.healing) * (kind === 'ultimate' ? 1.45 : 1);
  if (actor.id === 'pinar' && weakest) {
    const amount = heal(weakest, weakest.maxHp * (kind === 'ultimate' ? .25 : .12) * healFactor);
    actor.statsBattle.healing += amount;
    if (amount) logs.push({ text: `PINAR, ${weakest.name} için +${amount} HP yeniledi.`, type: 'heal' });
  }
  if (actor.id === 'merve') {
    const targets = kind === 'ultimate' ? aliveAllies : weakest ? [weakest] : [];
    targets.forEach((target) => { const amount = heal(target, target.maxHp * .16 * healFactor); actor.statsBattle.healing += amount; target.energy = clamp(target.energy + 18, 0, 100); });
  }
  if (actor.id === 'hazal') {
    const targets = kind === 'ultimate' ? aliveAllies : weakest ? [weakest] : [];
    targets.forEach((target) => { const amount = Math.round(actor.stats.defense * (kind === 'ultimate' ? .75 : .5)); target.shield += amount; actor.statsBattle.shieldGiven += amount; });
  }
  if (actor.id === 'aysegul') aliveAllies.forEach((ally) => { ally.energy = clamp(ally.energy + (kind === 'ultimate' ? 28 : 16), 0, 100); });
  if (actor.id === 'beyza') enemies.filter((enemy) => enemy.alive).forEach((enemy, index) => { if (kind === 'ultimate' || index === 0) enemy.energy = Math.max(0, enemy.energy - (kind === 'ultimate' ? 35 : 22)); });
  if (actor.id === 'gokhan' || actor.id === 'duygu' || actor.id === 'selen') aliveAllies.forEach((ally) => { ally.buffs.teamAttack = 2; });
  if (actor.id === 'emirhan') actor.shield += Math.round(actor.stats.defense * .6);
};

export const simulateBattle = (leftTeam: Team, rightTeam: Team, arenaInput: Arena | string, seed: number): BattleResult => {
  const arena = typeof arenaInput === 'string' ? arenaById[arenaInput] : arenaInput;
  if (!arena) throw new Error('Arena bulunamadı.');
  const rng = new SeededRandom(seed);
  const leftBonuses = getTeamBonuses(leftTeam);
  const rightBonuses = getTeamBonuses(rightTeam);
  const estimatedWinChance = estimateWinChance(leftTeam, rightTeam, arena, seed);
  const left = leftTeam.characterIds.map((id) => buildFighter(id, leftTeam, arena, leftBonuses, rng));
  const right = rightTeam.characterIds.map((id) => buildFighter(id, rightTeam, arena, rightBonuses, rng));
  const initialLeft = cloneFighters(left);
  const initialRight = cloneFighters(right);
  const turns: BattleTurn[] = [];
  let previousEvent: string | undefined;
  let turn = 0;
  let tiebreaker = false;

  while (left.some((fighter) => fighter.alive) && right.some((fighter) => fighter.alive) && turn < 40) {
    turn += 1;
    const all = [...left, ...right];
    const event = chooseEvent(rng, all, previousEvent);
    previousEvent = event.id;
    const logs: BattleLog[] = [
      { text: `TUR ${turn} — ${event.name}`, type: 'event' },
      { text: event.description, type: 'event' },
    ];
    const modifiers: TurnModifiers = { attack: 0, defense: 0, speed: 0, crit: 0, accuracy: 0, special: 0, healing: turn > 15 ? -(turn - 15) * .05 : 0, normalOnly: false };
    applyEvent(event, all, rng, modifiers, logs);
    const startAlive = all.filter((fighter) => fighter.alive);
    const order = [...startAlive].sort((a, b) => (b.stats.speed * (1 + modifiers.speed) + rng.next()) - (a.stats.speed * (1 + modifiers.speed) + rng.next()));
    const actions: BattleAction[] = [];

    for (const actor of order) {
      const allies = actor.teamId === leftTeam.id ? left : right;
      const enemies = actor.teamId === leftTeam.id ? right : left;
      const teamBonuses = actor.teamId === leftTeam.id ? leftBonuses : rightBonuses;
      const target = selectTarget(actor, enemies, rng);
      let kind = actionKind(actor, event, modifiers);
      const accuracy = clamp(.94 + modifiers.accuracy - (target.buffs.evade ? .12 : 0), .45, .99);
      if (rng.next() > accuracy) kind = 'miss';
      const actionId = `${turn}-${actor.id}-${actions.length}`;
      if (kind === 'miss') {
        actions.push({ id: actionId, turn, actorId: actor.id, targetId: target.id, actorTeamId: actor.teamId, kind, amount: 0, critical: false, label: 'ISKALADI!' });
        logs.push({ text: `${actor.name}, ${target.name} karşısında ıskaladı!`, type: 'damage' });
        actor.energy = clamp(actor.energy + 20, 0, 100);
        continue;
      }
      const isSpecial = kind === 'special' || kind === 'ultimate';
      const critChance = clamp(actor.stats.crit + modifiers.crit, 0, .65);
      const critical = rng.next() < critChance;
      const defenseMultiplier = 1 + modifiers.defense + (target.buffs.boss ? .20 : 0);
      const ignoredDefense = actor.id === 'ozgur-sercan' ? .45 : 0;
      const effectiveDefense = target.stats.defense * defenseMultiplier * (1 - ignoredDefense);
      const base = Math.max(5, actor.stats.attack * attackMultiplier(actor, kind, teamBonuses, modifiers, turn) - effectiveDefense * .42);
      let damage = base * (.88 + rng.next() * .24) * (critical ? 1.6 : 1);
      if (actor.buffs.teamAttack) damage *= 1.16;
      if (actor.buffs.theatre) damage *= 1.3;
      const amount = applyDamage(actor, target, damage);
      if (critical) actor.statsBattle.criticals += 1;
      if (kind === 'special') { actor.energy = 0; actor.statsBattle.specials += 1; actor.buffs.specialCooldown = 2; }
      else if (kind === 'ultimate') { actor.energy = 0; actor.statsBattle.ultimates += 1; actor.buffs.ultimateCooldown = 4; }
      else actor.energy = clamp(actor.energy + Math.round(20 * (1 + teamBonuses.energy)), 0, 100);
      target.energy = clamp(target.energy + 10, 0, 100);
      const label = kind === 'ultimate' ? actor.ultimate : kind === 'special' ? actor.special : 'Normal Saldırı';
      actions.push({ id: actionId, turn, actorId: actor.id, targetId: target.id, actorTeamId: actor.teamId, kind, amount, critical, label });
      logs.push({ text: `${actor.name}, ${target.name} hedefine ${amount} hasar verdi${critical ? ' — KRİTİK!' : '.'}`, type: kind === 'ultimate' ? 'ultimate' : isSpecial ? 'special' : 'damage' });
      if (isSpecial) teamSupport(actor, allies, enemies, kind, modifiers, teamBonuses, logs);
      if (modifiers.doubleHitId === actor.id) {
        const extra = applyDamage(actor, target, damage * .45);
        actions.push({ id: `${actionId}-extra`, turn, actorId: actor.id, targetId: target.id, actorTeamId: actor.teamId, kind: 'attack', amount: extra, critical: false, label: 'Gizli Müşteri Bonusu' });
      }
    }

    for (const fighter of [...left, ...right]) {
      if (fighter.currentHp <= 0 && fighter.alive) {
        fighter.currentHp = 0;
        fighter.alive = false;
        const killerAction = [...actions].reverse().find((action) => action.targetId === fighter.id && action.amount > 0);
        if (killerAction) {
          const killer = [...left, ...right].find((member) => member.id === killerAction.actorId);
          if (killer) killer.statsBattle.eliminations += 1;
        }
        logs.push({ text: `${fighter.name} ELENDİ!`, type: 'elimination' });
        const team = fighter.teamId === leftTeam.id ? left : right;
        team.filter((ally) => ally.id === 'yusuf' && ally.alive).forEach((ally) => { ally.buffs.fallenAllies = (ally.buffs.fallenAllies ?? 0) + 1; });
      }
      ['specialCooldown', 'ultimateCooldown', 'teamAttack'].forEach((key) => { if ((fighter.buffs[key] ?? 0) > 0) fighter.buffs[key] -= 1; });
      delete fighter.buffs.journey; delete fighter.buffs.record; delete fighter.buffs.visit; delete fighter.buffs.foot; delete fighter.buffs.theatre; delete fighter.buffs.boss;
    }
    turns.push({ number: turn, event, actions, logs, left: cloneFighters(left), right: cloneFighters(right) });
  }

  const leftAlive = left.some((fighter) => fighter.alive);
  const rightAlive = right.some((fighter) => fighter.alive);
  let winnerId: string;
  if (leftAlive !== rightAlive) winnerId = leftAlive ? leftTeam.id : rightTeam.id;
  else {
    tiebreaker = true;
    const score = (fighters: Combatant[]) => fighters.reduce((sum, fighter) => sum + fighter.currentHp + fighter.statsBattle.damageDealt + fighter.statsBattle.healing * .7 + fighter.statsBattle.shieldGiven * .5, 0);
    winnerId = score(left) >= score(right) ? leftTeam.id : rightTeam.id;
  }
  const allFinal = [...left, ...right];
  const mvp = [...allFinal].sort((a, b) => {
    const value = (fighter: Combatant) => fighter.statsBattle.damageDealt + fighter.statsBattle.healing * .8 + fighter.statsBattle.shieldGiven * .6 + fighter.statsBattle.eliminations * 35 + (fighter.alive ? 25 : 0);
    return value(b) - value(a);
  })[0]!;
  return {
    seed, arena, leftTeam, rightTeam, winnerId,
    loserId: winnerId === leftTeam.id ? rightTeam.id : leftTeam.id,
    turns, initialLeft, initialRight, finalLeft: cloneFighters(left), finalRight: cloneFighters(right),
    mvpId: mvp.id, duration: Math.max(12, turns.length * 12), estimatedWinChance, tiebreaker,
  };
};
