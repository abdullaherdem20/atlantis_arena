import Phaser from 'phaser';
import { characterById } from '../../data/characters';
import type { BattleAction, BattleResult, BattleTurn, GameSettings } from '../../types/game';

type ActionCallback = (action: BattleAction) => void;
type BattleSpeed = GameSettings['speed'];

export class BattleScene extends Phaser.Scene {
  private readonly result: BattleResult;
  private readonly onAction: ActionCallback;
  private fighters = new Map<string, Phaser.GameObjects.Image>();
  private nameplates = new Map<string, Phaser.GameObjects.Text>();
  private reducedMotion: boolean;
  private ready = false;
  private pendingTurn?: { turn: BattleTurn; speed: BattleSpeed };

  constructor(result: BattleResult, onAction: ActionCallback, reducedMotion: boolean) {
    super({ key: `battle-${result.seed}` });
    this.result = result;
    this.onAction = onAction;
    this.reducedMotion = reducedMotion;
  }

  preload(): void {
    this.load.image('arena', `./assets/arenas/${this.result.arena.id}.png`);
    const ids = [...this.result.leftTeam.characterIds, ...this.result.rightTeam.characterIds];
    ids.forEach((id) => this.load.image(id, `./assets/characters-v2/${id}.png`));
  }

  create(): void {
    this.add.image(480, 270, 'arena').setDisplaySize(960, 540);
    this.add.rectangle(480, 270, 960, 540, 0x07102e, .08);
    this.add.rectangle(480, 480, 960, 120, 0x07102e, .16);
    const leftPositions = [[112, 355], [220, 305], [170, 500], [305, 470], [365, 370]];
    const rightPositions = [[848, 355], [740, 305], [790, 500], [655, 470], [595, 370]];
    this.result.leftTeam.characterIds.forEach((id, index) => this.addFighter(id, leftPositions[index]!, false));
    this.result.rightTeam.characterIds.forEach((id, index) => this.addFighter(id, rightPositions[index]!, true));
    this.add.text(480, 34, this.result.arena.name.toLocaleUpperCase('tr-TR'), { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '17px', color: '#ffffff', backgroundColor: '#101840dc', padding: { x: 14, y: 8 } }).setOrigin(.5).setDepth(20);
    this.ready = true;
    if (this.pendingTurn) {
      const pending = this.pendingTurn;
      this.pendingTurn = undefined;
      this.playTurn(pending.turn, pending.speed);
    }
  }

  private addFighter(id: string, [x, y]: number[], flip: boolean): void {
    const character = characterById[id]!;
    const isShort = ['yagmur', 'sude'].includes(id);
    const isTall = ['deniz-arda', 'can', 'merve', 'sinejan'].includes(id);
    const height = isShort ? 132 : isTall ? 168 : character.manager ? 162 : 150;
    const sprite = this.add.image(x!, y!, id).setOrigin(.5, 1).setDisplaySize(height * .72, height).setFlipX(flip).setDepth(Math.round(y!));
    const plate = this.add.text(x!, y! - height - 12, character.name, { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '10px', color: '#ffffff', backgroundColor: '#101840e6', padding: { x: 5, y: 3 } }).setOrigin(.5).setDepth(500);
    this.fighters.set(id, sprite);
    this.nameplates.set(id, plate);
    this.tweens.add({ targets: sprite, y: y! - 3, scaleY: sprite.scaleY * 1.012, duration: 720 + (id.length % 5) * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  playTurn(turn: BattleTurn, speed: BattleSpeed): void {
    turn.actions.forEach((action, index) => {
      this.time.delayedCall((index * 520) / speed, () => this.playAction(action, speed));
    });
    this.time.delayedCall(Math.max(900, turn.actions.length * 520 / speed), () => this.syncFighters(turn));
  }

  queueTurn(turn: BattleTurn, speed: BattleSpeed): void {
    if (!this.ready) {
      this.pendingTurn = { turn, speed };
      return;
    }
    this.playTurn(turn, speed);
  }

  private playAction(action: BattleAction, speed: number): void {
    this.onAction(action);
    const actor = this.fighters.get(action.actorId);
    const target = this.fighters.get(action.targetId);
    if (!actor || !target) return;
    const originalX = actor.x;
    const originalAngle = actor.angle;
    if (action.kind === 'ultimate' && !this.reducedMotion) this.cameras.main.flash(190 / speed, 255, 212, 71, false, undefined, this);
    const impact = () => {
      const color = this.effectColor(action.actorId, action.kind);
      const orb = this.add.circle(actor.x, actor.y - 70, action.kind === 'ultimate' ? 15 : 9, color).setStrokeStyle(3, 0xffffff, .8).setDepth(700);
      this.tweens.add({ targets: orb, x: target.x, y: target.y - 70, scale: 1.8, duration: (this.reducedMotion ? 50 : 155) / speed, onComplete: () => {
        orb.destroy();
        if (action.kind !== 'miss') {
          target.setTint(action.critical ? 0xffd447 : 0xff6666);
          const recoil = target.flipX ? 12 : -12;
          this.tweens.add({ targets: target, x: target.x + recoil, scaleX: target.scaleX * .94, duration: 80 / speed, yoyo: true });
          this.time.delayedCall(150 / speed, () => target.clearTint());
          if (action.critical && !this.reducedMotion) this.cameras.main.shake(100 / speed, .007);
        }
        const label = action.kind === 'miss' ? 'ISKALADI!' : `${action.critical ? 'KRİTİK! ' : ''}-${action.amount}`;
        const text = this.add.text(target.x, target.y - 160, label, { fontFamily: 'monospace', fontStyle: 'bold', fontSize: action.critical ? '21px' : '17px', color: action.critical ? '#ffd447' : action.kind === 'miss' ? '#ffffff' : '#ff4545', stroke: '#101840', strokeThickness: 5 }).setOrigin(.5).setDepth(900);
        this.tweens.add({ targets: text, y: text.y - 48, alpha: 0, duration: 850 / speed, onComplete: () => text.destroy() });
      }});
    };
    if (this.reducedMotion) impact();
    else {
      const forward = actor.flipX ? -48 : 48;
      const windup = actor.flipX ? 7 : -7;
      this.tweens.add({ targets: actor, x: originalX + windup, angle: actor.flipX ? 4 : -4, duration: 120 / speed, onComplete: () => {
        this.tweens.add({ targets: actor, x: originalX + forward, angle: actor.flipX ? -7 : 7, scaleY: actor.scaleY * .97, duration: 170 / speed, yoyo: true, hold: 50 / speed, onYoyo: impact, onComplete: () => { actor.x = originalX; actor.angle = originalAngle; } });
      }});
    }
  }

  private effectColor(id: string, kind: BattleAction['kind']): number {
    if (kind === 'ultimate') return 0xffd447;
    if (['ikra', 'sinejan'].includes(id)) return 0x8de9ff;
    if (['arda', 'deniz-arda'].includes(id)) return 0x25bfff;
    if (['pinar', 'aysegul'].includes(id)) return 0x4ade80;
    if (['gulnihal', 'beyza', 'sude'].includes(id)) return 0xe879f9;
    return kind === 'special' ? 0x9d6cff : 0xffffff;
  }

  private syncFighters(turn: BattleTurn): void {
    [...turn.left, ...turn.right].forEach((fighter) => {
      const sprite = this.fighters.get(fighter.id);
      const plate = this.nameplates.get(fighter.id);
      if (!sprite || !plate || fighter.alive) return;
      sprite.setTint(0x56617c).setAlpha(.58).setAngle(fighter.teamId === this.result.leftTeam.id ? -78 : 78).setScale(sprite.scaleX * .88, sprite.scaleY * .88);
      plate.setColor('#8e97af').setText(`${fighter.name} • KO`);
    });
  }
}
