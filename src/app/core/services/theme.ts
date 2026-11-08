import { Injectable, computed, effect, signal } from '@angular/core';
import { THEME_STORAGE_KEY } from '../constants/map.constants';

export type ThemeMode = 'light' | 'dark';

/** Classe aplicada no `<html>`; `styles.scss` usa-a para trocar o `color-scheme`. */
export const DARK_THEME_CLASS = 'dark-theme';

/**
 * Controla o tema claro/escuro da aplicação.
 *
 * Os tokens Material 3 (`--mat-sys-*`) são emitidos com `light-dark()`, então
 * basta alternar o `color-scheme` do `<html>` para que toda a interface troque
 * de cor. A preferência é persistida e, na primeira visita, segue o sistema.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(restoreMode());

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    effect(() => {
      const dark = this._mode() === 'dark';
      document.documentElement.classList.toggle(DARK_THEME_CLASS, dark);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
      } catch {
        // Armazenamento indisponível: mantém apenas em memória.
      }
    });
  }

  toggle(): void {
    this._mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
  }
}

function restoreMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Armazenamento indisponível: usa a preferência do sistema.
  }
  return prefersDark() ? 'dark' : 'light';
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}
