import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

/** Toasts (Notyf) com a identidade da marca. */
export const notyf = new Notyf({
  duration: 4200,
  ripple: false,
  dismissible: true,
  position: { x: 'right', y: 'top' },
  types: [
    { type: 'success', background: '#12805c', icon: { className: 'bx bx-check-circle', tagName: 'i', color: '#fff' } },
    { type: 'error', background: '#c4314b', duration: 6000, icon: { className: 'bx bx-error-circle', tagName: 'i', color: '#fff' } },
    { type: 'info', background: '#0f2557', icon: { className: 'bx bx-info-circle', tagName: 'i', color: '#fff' } },
  ],
});

export const toast = {
  ok: (msg: string) => notyf.success(msg),
  erro: (msg: string) => notyf.error(msg),
  info: (msg: string) => notyf.open({ type: 'info', message: msg }),
};
