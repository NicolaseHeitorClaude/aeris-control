import { useUI } from './state/store';

/* Modo apresentação: estado de UI + tela cheia opcional.
 * A tela cheia é apenas um complemento: se a API não existir ou for recusada
 * (iframe, política do navegador, iOS), o modo continua ativo ocupando a janela. */

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const doc = () => document as FsDoc;
export const fullscreenElement = () => doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null;
export const fullscreenAvailable = () => {
  const el = document.documentElement as FsEl;
  const enabled = doc().fullscreenEnabled ?? doc().webkitFullscreenEnabled ?? false;
  return enabled && !!(el.requestFullscreen || el.webkitRequestFullscreen);
};

/** Transição suave da área principal ao entrar/sair (sem remontar a cena 3D). */
function animateMain() {
  requestAnimationFrame(() => {
    const el = document.querySelector('.main') as HTMLElement | null;
    el?.animate?.(
      // Somente opacidade: transformações alterariam a medição do canvas 3D (getBoundingClientRect)
      [{ opacity: 0.15 }, { opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  });
}

let enteredFullscreen = false;

export function enterPresentation() {
  const ui = useUI.getState();
  if (ui.presentation) return;
  ui.setPresentation(true);
  ui.setPresentationFs(false);
  animateMain();
  if (!fullscreenAvailable()) return; // modo alternativo: ocupa a janela
  const el = document.documentElement as FsEl;
  try {
    const r = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.();
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined);
  } catch {
    /* recusado: permanece no modo alternativo */
  }
}

export function exitPresentation() {
  const ui = useUI.getState();
  if (!ui.presentation) return;
  ui.setPresentation(false);
  ui.setPresentationFs(false);
  animateMain();
  if (fullscreenElement()) {
    enteredFullscreen = false;
    try {
      const r = document.exitFullscreen ? document.exitFullscreen() : doc().webkitExitFullscreen?.();
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined);
    } catch {
      /* ignorar */
    }
  }
}

export const togglePresentation = () => (useUI.getState().presentation ? exitPresentation() : enterPresentation());

/** Sincroniza com a tela cheia: sair da tela cheia pelo navegador (ESC/F11) encerra o modo. */
export function bindFullscreenSync() {
  const onChange = () => {
    const fs = !!fullscreenElement();
    const ui = useUI.getState();
    if (fs) {
      enteredFullscreen = true;
      ui.setPresentationFs(true);
    } else if (enteredFullscreen) {
      enteredFullscreen = false;
      if (ui.presentation) exitPresentation();
    }
  };
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
}
