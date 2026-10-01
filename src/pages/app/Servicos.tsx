import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicosApi } from '@/api/endpoints/servicos';
import type { Servico, ServicoPayload, StatusAtivo } from '@/api/types';
import { usePermissao } from '@/auth/usePermissao';
import { AtivoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MaskedInputs';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { codigoErro, tratarErro } from '@/lib/errors';
import { useDebounce } from '@/lib/hooks';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';

const DURACOES = [15, 30, 45, 60, 90, 120];

/** Catálogo de serviços em cards (preço, duração, categoria). */
export default function Servicos() {
  const r = useRotulos();
  const qc = useQueryClient();
  const { podeEscrever } = usePermissao();
  const escrever = podeEscrever('servicos:escrever');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusAtivo | 'TODOS'>('ATIVO');
  const [categoria, setCategoria] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ aberto: boolean; servico?: Servico }>({ aberto: false });
  const [excluir, setExcluir] = useState<Servico | null>(null);
  const [inativar, setInativar] = useState<Servico | null>(null);
  const termo = useDebounce(busca.trim(), 300);

  const filtros = { busca: termo || undefined, status: status === 'TODOS' ? undefined : status, categoria: categoria || undefined, page, perPage: 24 };
  const q = useQuery({ queryKey: ['servicos', 'lista', filtros], queryFn: () => servicosApi.listar(filtros), placeholderData: keepPreviousData });
  const cats = useQuery({ queryKey: ['servicos', 'categorias'], queryFn: servicosApi.categorias, staleTime: 60_000 });

  const remover = useMutation({
    mutationFn: (s: Servico) => servicosApi.remover(s.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos'] });
      toast.ok(`${r.servico} excluído.`);
      setExcluir(null);
    },
    onError: (err, s) => {
      setExcluir(null);
      if (codigoErro(err) === 'SERVICO_EM_USO') setInativar(s);
      else tratarErro(err);
    },
  });
  const desativar = useMutation({
    mutationFn: (s: Servico) => servicosApi.atualizar(s.id, { status: 'INATIVO' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos'] });
      toast.ok(`${r.servico} inativado.`);
      setInativar(null);
    },
    onError: (e) => tratarErro(e),
  });

  return (
    <div className="page">
      <PageHeader
        titulo={r.servicos}
        descricao={`Preço e duração de cada ${r.servico.toLowerCase()} alimentam a agenda e os orçamentos.`}
        acoes={
          escrever && (
            <Button icon="bx-plus" onClick={() => setForm({ aberto: true })}>
              {r.novo(r.servico)}
            </Button>
          )
        }
      />

      <div className="toolbar" data-aos="fade-up">
        <Input aria-label="Buscar" placeholder={`Buscar ${r.servicos.toLowerCase()}`} icon="bx-search" value={busca} onChange={(e) => (setBusca(e.target.value), setPage(1))} fieldClassName="toolbar__busca" />
        <Select aria-label="Categoria" value={categoria} onChange={(e) => (setCategoria(e.target.value), setPage(1))} fieldClassName="field--inline">
          <option value="">Todas as categorias</option>
          {(cats.data ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Segmented
          label="Situação"
          valor={status}
          onChange={(v) => (setStatus(v), setPage(1))}
          opcoes={[
            { valor: 'ATIVO', label: 'Ativos' },
            { valor: 'INATIVO', label: 'Inativos' },
            { valor: 'TODOS', label: 'Todos' },
          ]}
        />
      </div>

      {q.error ? (
        <ErrorState erro={q.error} onTentar={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="servicos-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="servico-card">
              <Skeleton w="35%" h={18} r={9} />
              <Skeleton w="70%" h={20} />
              <Skeleton w="45%" h={30} />
            </div>
          ))}
        </div>
      ) : !q.data?.items.length ? (
        <div className="card">
          <EmptyState
            icon="bx-purchase-tag-alt"
            titulo={termo || categoria ? 'Nenhum resultado' : `Nenhum ${r.servico.toLowerCase()} cadastrado`}
            texto={`Cadastre o que você oferece, com preço e duração, para montar a agenda.`}
            acao={
              escrever && (
                <Button icon="bx-plus" onClick={() => setForm({ aberto: true })}>
                  {r.novo(r.servico)}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <ul className="servicos-grid">
            {q.data.items.map((s, i) => (
              <ServicoCard key={s.id} s={s} delay={(i % 6) * 50} escrever={escrever} onEditar={() => setForm({ aberto: true, servico: s })} onExcluir={() => setExcluir(s)} />
            ))}
          </ul>
          <Pagination meta={q.data.meta} onPage={setPage} />
        </>
      )}

      <ServicoFormModal aberto={form.aberto} servico={form.servico} categorias={cats.data ?? []} onFechar={() => setForm({ aberto: false })} />
      <ConfirmDialog
        aberto={Boolean(excluir)}
        onFechar={() => setExcluir(null)}
        onConfirmar={() => excluir && remover.mutate(excluir)}
        carregando={remover.isPending}
        perigo
        titulo={`Excluir ${excluir?.nome ?? ''}`}
        confirmar="Excluir"
        mensagem={`Só é possível excluir ${r.servicos.toLowerCase()} que nunca foram usados.`}
      />
      <ConfirmDialog
        aberto={Boolean(inativar)}
        onFechar={() => setInativar(null)}
        onConfirmar={() => inativar && desativar.mutate(inativar)}
        carregando={desativar.isPending}
        titulo="Inativar em vez de excluir?"
        confirmar="Inativar"
        mensagem={`${inativar?.nome ?? ''} já foi usado em ${r.atendimentos.toLowerCase()} ou orçamentos. Inativando, ele sai das opções e o histórico fica intacto.`}
      />
    </div>
  );
}

/** Card premium: brilho segue o cursor (variável CSS, sem re-render), anel de duração. */
function ServicoCard({ s, delay, escrever, onEditar, onExcluir }: { s: Servico; delay: number; escrever: boolean; onEditar: () => void; onExcluir: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const mover = (e: MouseEvent<HTMLLIElement>) => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - b.left}px`);
    el.style.setProperty('--my', `${e.clientY - b.top}px`);
  };
  const pct = Math.min(1, s.duracaoMinutos / 120);
  return (
    <li ref={ref} className={cn('servico-card', s.status === 'INATIVO' && 'is-inativo')} onMouseMove={mover} data-aos="fade-up" data-aos-delay={delay}>
      <div className="servico-card__topo">
        <span className="servico-card__cat">{s.categoria ?? 'Sem categoria'}</span>
        {s.status === 'INATIVO' && <AtivoBadge status="INATIVO" />}
      </div>
      <h3 className="servico-card__nome">{s.nome}</h3>
      {s.descricao && <p className="servico-card__desc">{s.descricao}</p>}
      <div className="servico-card__base">
        <span className="servico-card__preco num">{brl(s.valorCentavos)}</span>
        <span className="servico-card__dur" style={{ '--p': pct } as CSSProperties} aria-label={`${s.duracaoMinutos} minutos`}>
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="15" className="trilho" />
            <circle cx="18" cy="18" r="15" className="valor" />
          </svg>
          <span className="num">{s.duracaoMinutos}′</span>
        </span>
      </div>
      {escrever && (
        <div className="servico-card__acoes">
          <Button size="sm" variant="soft" icon="bx-edit-alt" onClick={onEditar}>
            Editar
          </Button>
          <Button size="sm" variant="ghost" iconOnly icon="bx-trash" aria-label={`Excluir ${s.nome}`} onClick={onExcluir} />
        </div>
      )}
    </li>
  );
}

const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(120),
  categoria: z.string().trim().max(80).optional(),
  valorCentavos: z.number().int().min(0),
  duracaoMinutos: z.number({ message: 'Informe a duração.' }).int().min(5, 'Mínimo de 5 minutos.').max(1440, 'Máximo de 24 horas.'),
  descricao: z.string().trim().max(500).optional(),
  status: z.enum(['ATIVO', 'INATIVO']),
});
type Form = z.infer<typeof schema>;

function ServicoFormModal({ aberto, servico, categorias, onFechar }: { aberto: boolean; servico?: Servico; categorias: string[]; onFechar: () => void }) {
  const r = useRotulos();
  const qc = useQueryClient();
  const [livre, setLivre] = useState(false);
  const { register, control, handleSubmit, reset, setError, setValue, watch, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', categoria: '', valorCentavos: 0, duracaoMinutos: 30, descricao: '', status: 'ATIVO' },
  });
  const dur = watch('duracaoMinutos');

  useEffect(() => {
    if (!aberto) return;
    const d = servico?.duracaoMinutos ?? 30;
    setLivre(!DURACOES.includes(d));
    reset(
      servico
        ? { nome: servico.nome, categoria: servico.categoria ?? '', valorCentavos: servico.valorCentavos, duracaoMinutos: d, descricao: servico.descricao ?? '', status: servico.status }
        : { nome: '', categoria: '', valorCentavos: 0, duracaoMinutos: 30, descricao: '', status: 'ATIVO' },
    );
  }, [aberto, servico, reset]);

  const salvar = useMutation({
    mutationFn: (b: ServicoPayload) => (servico ? servicosApi.atualizar(servico.id, b) : servicosApi.criar(b)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos'] });
      toast.ok(servico ? `${r.servico} atualizado.` : `${r.servico} cadastrado.`);
      onFechar();
    },
    onError: (e) => tratarErro<Form>(e, { setError }),
  });

  const enviar = handleSubmit((v) =>
    salvar.mutate({ nome: v.nome, categoria: v.categoria || null, valorCentavos: v.valorCentavos, duracaoMinutos: v.duracaoMinutos, descricao: v.descricao || null, status: v.status }),
  );

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={servico ? `Editar ${r.servico.toLowerCase()}` : r.novo(r.servico)}
      onSubmit={enviar}
      bloquearFechar={salvar.isPending}
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" icon="bx-check" loading={salvar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Input label="Nome" required error={formState.errors.nome?.message} {...register('nome')} fieldClassName="span-2" data-autofocus />
        <Input label="Categoria" list="categorias-servico" hint="Ex.: Cabelo, Banho e tosa, Avaliação" error={formState.errors.categoria?.message} {...register('categoria')} />
        <datalist id="categorias-servico">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Controller control={control} name="valorCentavos" render={({ field }) => <MoneyInput label="Preço" required value={field.value} onChange={field.onChange} error={formState.errors.valorCentavos?.message} />} />
        <div className="field span-2">
          <span className="field__label">
            Duração<span className="req">*</span>
          </span>
          <div className="row" role="group" aria-label="Duração em minutos">
            {DURACOES.map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={!livre && dur === d}
                onClick={() => {
                  setLivre(false);
                  setValue('duracaoMinutos', d, { shouldValidate: true });
                }}
              >
                {d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? ` ${d % 60}` : ''}`}
              </button>
            ))}
            <button type="button" className="chip" aria-pressed={livre} onClick={() => setLivre(true)}>
              Outra
            </button>
          </div>
          {livre && <Input aria-label="Duração em minutos" type="number" min={5} max={1440} suffix={<span className="text-sm muted" style={{ paddingRight: 8 }}>min</span>} {...register('duracaoMinutos', { valueAsNumber: true })} />}
          {formState.errors.duracaoMinutos && (
            <span className="field__error" role="alert">
              <i className="bx bx-error-circle" aria-hidden="true" />
              {formState.errors.duracaoMinutos.message}
            </span>
          )}
        </div>
        <Textarea label="Descrição" rows={2} maxLength={500} {...register('descricao')} fieldClassName="span-2" />
        {servico && (
          <Select label="Situação" {...register('status')}>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </Select>
        )}
      </div>
    </Modal>
  );
}
