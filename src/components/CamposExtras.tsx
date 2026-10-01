import type { CamposExtras as Valores, DefinicaoCampo } from '@/api/types';
import { Checkbox, Input, Select } from './ui/Field';

interface Props {
  defs: DefinicaoCampo[] | undefined;
  valor: Valores | null | undefined;
  onChange: (v: Valores) => void;
  erros?: Partial<Record<string, string>>;
  disabled?: boolean;
}

/** Formulário dinâmico dos campos do segmento (ex.: nome do pet, convênio, evolução da sessão). */
export function CamposExtras({ defs, valor, onChange, erros, disabled }: Props) {
  if (!defs?.length) return null;
  const v = valor ?? {};
  const set = (chave: string, x: string | number | boolean | null) => onChange({ ...v, [chave]: x });

  return (
    <div className="form-grid">
      {defs.map((c) => {
        const erro = erros?.[c.chave];
        const atual = v[c.chave];
        switch (c.tipo) {
          case 'selecao':
            return (
              <Select key={c.chave} label={c.rotulo} required={c.obrigatorio} error={erro} disabled={disabled} value={typeof atual === 'string' ? atual : ''} onChange={(e) => set(c.chave, e.target.value || null)}>
                <option value="">Selecione</option>
                {(c.opcoes ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            );
          case 'numero':
            return (
              <Input
                key={c.chave}
                type="number"
                label={c.rotulo}
                required={c.obrigatorio}
                error={erro}
                disabled={disabled}
                value={typeof atual === 'number' ? atual : ''}
                onChange={(e) => set(c.chave, e.target.value === '' ? null : Number(e.target.value))}
              />
            );
          case 'data':
            return (
              <Input key={c.chave} type="date" label={c.rotulo} required={c.obrigatorio} error={erro} disabled={disabled} value={typeof atual === 'string' ? atual : ''} onChange={(e) => set(c.chave, e.target.value || null)} />
            );
          case 'booleano':
            return (
              <div key={c.chave} className="field" style={{ justifyContent: 'flex-end', paddingBottom: '0.6rem' }}>
                <Checkbox label={c.rotulo} checked={atual === true} disabled={disabled} onChange={(e) => set(c.chave, e.target.checked)} />
              </div>
            );
          default:
            return (
              <Input key={c.chave} label={c.rotulo} required={c.obrigatorio} error={erro} disabled={disabled} maxLength={500} value={typeof atual === 'string' ? atual : ''} onChange={(e) => set(c.chave, e.target.value || null)} />
            );
        }
      })}
    </div>
  );
}

/** Valida obrigatórios no front (a API valida de novo). */
export function validarCamposExtras(defs: DefinicaoCampo[] | undefined, v: Valores | null | undefined): Record<string, string> {
  const erros: Record<string, string> = {};
  (defs ?? []).forEach((c) => {
    const x = v?.[c.chave];
    if (c.obrigatorio && (x === undefined || x === null || x === '')) erros[c.chave] = `${c.rotulo} é obrigatório.`;
  });
  return erros;
}

/** Resumo curto dos campos-chave (cards da agenda e listas). */
export function resumoCamposExtras(defs: DefinicaoCampo[] | undefined, v: Valores | null | undefined, max = 2): string {
  if (!defs?.length || !v) return '';
  return defs
    .filter((c) => v[c.chave] !== undefined && v[c.chave] !== null && v[c.chave] !== '' && c.tipo !== 'booleano')
    .slice(0, max)
    .map((c) => String(v[c.chave]))
    .join(' · ');
}
