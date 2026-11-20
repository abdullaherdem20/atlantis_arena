import { beforeEach, describe, expect, it } from 'vitest';
import { clearSave, defaultSave, loadSave, persistSave } from '../utils/storage';

describe('LocalStorage kaydı', () => {
  beforeEach(() => localStorage.clear());

  it('ayarları ve istatistikleri kalıcı saklar', () => {
    const save = { ...structuredClone(defaultSave), wins: 4, settings: { ...defaultSave.settings, speed: 4 as const, reducedMotion: true } };
    persistSave(save);
    expect(loadSave()).toMatchObject({ wins: 4, settings: { speed: 4, reducedMotion: true } });
  });

  it('geçmişi güvenli şekilde sıfırlar', () => {
    persistSave({ ...structuredClone(defaultSave), battles: 8 });
    expect(clearSave().battles).toBe(0);
    expect(loadSave().battles).toBe(0);
  });
});
