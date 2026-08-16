// PASSENGER — localStorage 저장/로드.

import type { GameState } from './types';

const KEY = 'passenger_save_v1';

export function saveGame(state: GameState): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 무시
  }
}

export function loadGame(): GameState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== 'object' || !parsed.chapter) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEY);
  } catch {}
}

export function hasSave(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}
