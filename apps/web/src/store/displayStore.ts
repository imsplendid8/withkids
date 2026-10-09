import { create } from 'zustand';
import {
  DEFAULT_DISPLAY,
  PC_VIEWPORT_WIDTH,
  applyDisplay,
  loadDisplay,
  saveDisplay,
  type DisplaySettings,
} from '@/lib/display';

interface DisplayState {
  settings: DisplaySettings;
  hydrate: () => void;
  update: (patch: Partial<DisplaySettings>) => void;
}

export const useDisplayStore = create<DisplayState>((set, get) => ({
  settings: DEFAULT_DISPLAY,
  hydrate: () => {
    const settings = loadDisplay();
    applyDisplay(settings);
    set({ settings });
  },
  update: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveDisplay(settings);
    set({ settings });
  },
}));

/** next/head가 다시 그릴 때 화면 폭 설정을 되돌리지 않도록 같은 값을 쓴다 */
export const viewportContent = (settings: DisplaySettings) =>
  settings.layout === 'pc'
    ? `width=${PC_VIEWPORT_WIDTH}`
    : 'width=device-width, initial-scale=1, viewport-fit=cover';
