import type { Modulo } from '@/api/types';
import { MODULOS } from '@/lib/labels';
import { linkWhatsapp } from '@/lib/masks';
import { Button } from './ui/Button';

const SUPORTE = import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined;

/** Upsell de módulo não contratado. */
export function LockedModule({ modulo, compacto }: { modulo: Modulo; compacto?: boolean }) {
  const m = MODULOS[modulo];
  const link = linkWhatsapp(SUPORTE, `Olá! Quero contratar o módulo ${m.label} no Simbora Gerir.`);
  return (
    <div className={compacto ? 'locked locked--compact' : 'locked'}>
      <span className="locked__icon" aria-hidden="true">
        <i className={`bx ${m.icone}`} />
        <i className="bx bxs-lock-alt locked__lock" />
      </span>
      <div className="grow">
        <p className="locked__title">Disponível no módulo {m.label}</p>
        <p className="locked__text">{m.resumo}. Fale com o suporte para ativar na sua conta.</p>
      </div>
      {link && (
        <Button variant="soft" size="sm" icon="bxl-whatsapp" onClick={() => window.open(link, '_blank', 'noopener')}>
          Falar com o suporte
        </Button>
      )}
    </div>
  );
}
