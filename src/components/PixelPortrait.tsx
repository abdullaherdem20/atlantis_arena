import type { Character } from '../types/game';

export function PixelPortrait({ character, size = 'medium', eliminated = false }: { character: Character; size?: 'tiny' | 'small' | 'medium' | 'large'; eliminated?: boolean }) {
  return (
    <div className={`pixel-portrait pixel-portrait--${size} ${eliminated ? 'is-eliminated' : ''}`} style={{ '--accent': character.accent } as React.CSSProperties}>
      <img src={`./assets/characters-v2/${character.id}.png`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = `./assets/portraits/${character.id}.png`; }} alt={`${character.name} pixel art portresi`} draggable={false} />
      {eliminated && <span>ELENDİ</span>}
    </div>
  );
}
