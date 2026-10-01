import type { NavigateFunction } from 'react-router-dom';

/** Permite navegar a partir de código fora de componentes (ex.: tratamento de erros). */
let navigateRef: NavigateFunction | null = null;
export const registrarNavigate = (fn: NavigateFunction) => {
  navigateRef = fn;
};
export const navegar = (to: string) => {
  if (navigateRef) navigateRef(to);
  else window.location.assign(to);
};
