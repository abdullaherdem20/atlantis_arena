import { useState } from 'react';
import { audioEngine } from '../game/audio/AudioEngine';
import { loadSave, persistSave } from '../utils/storage';

interface BrandHeaderProps {
  compact?: boolean;
  onHome?: () => void;
  subtitle?: string;
}

export function BrandHeader({ compact = false, onHome, subtitle }: BrandHeaderProps) {
  const [muted, setMuted] = useState(() => loadSave().settings.muted);
  const toggleSound = () => {
    const save = loadSave();
    const settings = { ...save.settings, muted: !muted };
    persistSave({ ...save, settings });
    audioEngine.configure(settings);
    setMuted(settings.muted);
    window.dispatchEvent(new CustomEvent('atlantis-settings', { detail: settings }));
    if (!settings.muted) audioEngine.sfx('click');
  };
  return (
    <header className={`brand-header ${compact ? 'brand-header--compact' : ''}`}>
      {onHome && <button className="header-back" onClick={onHome} aria-label="Önceki ekrana dön">‹ <span>GERİ</span></button>}
      <button className="brand-mark" onClick={onHome} disabled={!onHome} aria-label="Ana menüye dön">
        <span className="brand-mark__spark">A</span>
        <span><b>ATLANTIS</b><small>ARENA</small></span>
      </button>
      {subtitle && <div className="brand-header__subtitle">{subtitle}</div>}
      <div className="brand-header__actions"><div className="brand-header__status"><i /> AUTO BATTLER</div><button className="sound-toggle" onClick={toggleSound} aria-label={muted ? 'Sesleri aç' : 'Sesleri kapat'}>{muted ? 'SES KAPALI' : 'SES AÇIK'}</button></div>
    </header>
  );
}
