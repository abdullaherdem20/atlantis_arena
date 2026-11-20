import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { BattleAction, BattleResult } from '../types/game';
import { BattleScene } from '../game/scenes/BattleScene';

interface Props {
  result: BattleResult;
  turnIndex: number;
  speed: 0.5 | 1 | 2 | 4;
  active: boolean;
  reducedMotion: boolean;
  lowGraphics: boolean;
  onAction: (action: BattleAction) => void;
}

export function BattleCanvas({ result, turnIndex, speed, active, reducedMotion, lowGraphics, onAction }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | undefined>(undefined);
  const scene = useRef<BattleScene | undefined>(undefined);
  const callback = useRef(onAction);
  callback.current = onAction;

  useEffect(() => {
    if (!host.current) return;
    const battleScene = new BattleScene(result, (action) => callback.current(action), reducedMotion);
    scene.current = battleScene;
    game.current = new Phaser.Game({
      type: lowGraphics ? Phaser.CANVAS : Phaser.AUTO,
      parent: host.current,
      width: 960,
      height: 540,
      backgroundColor: '#101840',
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: battleScene,
      audio: { noAudio: true },
      fps: { target: 60, forceSetTimeOut: lowGraphics },
    });
    return () => { game.current?.destroy(true); game.current = undefined; scene.current = undefined; };
  }, [result, reducedMotion, lowGraphics]);

  useEffect(() => {
    const current = result.turns[turnIndex];
    if (current && active) scene.current?.queueTurn(current, speed);
  }, [result, turnIndex, active]);

  return <div className="battle-canvas" ref={host} aria-label={`${result.arena.name} savaş animasyonu`} />;
}
