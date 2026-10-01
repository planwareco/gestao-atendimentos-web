import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientesApi } from '@/api/endpoints/clientes';
import { useClickFora, useDebounce } from '@/lib/hooks';
import { maskTelefone } from '@/lib/masks';
import { useRotulos } from '@/lib/rotulos';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Field } from './ui/Field';

export interface ClienteEscolhido {
  id: string;
  nome: string;
}

/** Autocomplete de clientes (GET /clientes?busca=) com debounce e atalho para cadastrar. */
export function ClientePicker({
  valor,
  onChange,
  error,
  onNovo,
  disabled,
  label,
}: {
  valor: ClienteEscolhido | null;
  onChange: (c: ClienteEscolhido | null) => void;
  error?: string;
  onNovo?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const r = useRotulos();
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const termo = useDebounce(busca.trim(), 300);
  const listaId = useId();
  const ref = useClickFora<HTMLDivElement>(aberto, () => setAberto(false));

  const { data, isFetching } = useQuery({
    queryKey: ['clientes', 'picker', termo],
    queryFn: () => clientesApi.listar({ busca: termo || undefined, status: 'ATIVO', perPage: 8 }),
    enabled: aberto,
    staleTime: 30_000,
  });
  const itens = data?.items ?? [];

  const escolher = (i: number) => {
    const c = itens[i];
    if (!c) return;
    onChange({ id: c.id, nome: c.nome });
    setBusca('');
    setAberto(false);
  };

  if (valor) {
    return (
      <Field label={label ?? r.cliente} required error={error}>
        {() => (
          <div className="picked">
            <Avatar nome={valor.nome} size={30} />
            <span className="grow" style={{ fontWeight: 650 }}>
              {valor.nome}
            </span>
            {!disabled && (
              <Button size="sm" variant="ghost" icon="bx-transfer-alt" onClick={() => onChange(null)}>
                Trocar
              </Button>
            )}
          </div>
        )}
      </Field>
    );
  }

  return (
    <div className="combo" ref={ref}>
      <Field label={label ?? r.cliente} required error={error} icon="bx-search">
        {(f) => (
          <input
            id={f.id}
            className="input"
            role="combobox"
            aria-expanded={aberto}
            aria-controls={listaId}
            aria-autocomplete="list"
            aria-invalid={f.invalid || undefined}
            aria-describedby={f.describedBy}
            placeholder={`Buscar por nome, telefone ou e-mail`}
            value={busca}
            disabled={disabled}
            autoComplete="off"
            onFocus={() => setAberto(true)}
            onChange={(e) => {
              setBusca(e.target.value);
              setAberto(true);
              setAtivo(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setAtivo((a) => Math.min(a + 1, itens.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setAtivo((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && aberto && itens.length) {
                e.preventDefault();
                escolher(ativo);
              }
            }}
          />
        )}
      </Field>
      {aberto && (
        <div className="combo__list" id={listaId} role="listbox">
          {isFetching && !itens.length && <p className="muted text-sm" style={{ padding: '0.6rem' }}>Buscando...</p>}
          {!isFetching && !itens.length && <p className="muted text-sm" style={{ padding: '0.6rem' }}>Nenhum resultado.</p>}
          {itens.map((c, i) => (
            <button key={c.id} type="button" role="option" aria-selected={i === ativo} className="combo__opt" onMouseEnter={() => setAtivo(i)} onClick={() => escolher(i)}>
              <Avatar nome={c.nome} size={28} />
              <span>
                {c.nome}
                <small>{maskTelefone(c.whatsapp ?? c.telefone) || c.email || 'Sem contato'}</small>
              </span>
            </button>
          ))}
          {onNovo && (
            <button
              type="button"
              className="combo__opt"
              style={{ color: 'var(--secondary)', fontWeight: 650 }}
              onClick={() => {
                setAberto(false);
                onNovo();
              }}
            >
              <i className="bx bx-plus-circle" aria-hidden="true" style={{ fontSize: '1.3rem' }} />
              Cadastrar {r.cliente.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
