import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agendaApi } from '@/api/endpoints/agenda';
import { atendimentosApi } from '@/api/endpoints/atendimentos';
import { profissionaisApi } from '@/api/endpoints/profissionais';
import { servicosApi } from '@/api/endpoints/servicos';
import type { Atendimento, AtendimentoPayload, CamposExtras as Valores, FormaPagamento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { CamposExtras, validarCamposExtras } from '@/components/CamposExtras';
import { ClientePicker, type ClienteEscolhido } from '@/components/ClientePicker';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MaskedInputs';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { fmtData, fmtHora, hojeISO, isoParaLocal, localParaIso, pad } from '@/lib/dates';
import { codigoErro, tratarErro } from '@/lib/errors';
import { FORMAS_PAGAMENTO } from '@/lib/labels';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';
import { ClienteFormModal } from './ClienteFormModal';

interface ItemForm {
  servicoId: string;
  quantidade: number;
  valorUnitarioCentavos: number;
}
interface Form {
  cliente: ClienteEscolhido | null;
  profissionalId: string;
  data: string;
  hora: string;
  fimManual: boolean;
  horaFim: string;
  itens: ItemForm[];
  descontoCentavos: number;
  acrescimoCentavos: number;
  observacoes: string;
  status: 'AGENDADO' | 'CONFIRMADO' | 'REALIZADO';
  formaPagamento: FormaPagamento | '';
}

export interface InicialAtendimento {
  inicio?: string;
  cliente?: ClienteEscolhido;
  profissionalId?: string;
}

/**
 * Coloca o atendimento salvo direto nas agendas já carregadas (sem esperar a rede),
 * respeitando o período e o filtro de profissional de cada uma.
 */
export function useGravarNaAgenda() {
  const qc = useQueryClient();
  return (a: Atendimento) => {
    for (const [key, data] of qc.getQueriesData<unknown>({ queryKey: ['agenda'] })) {
      if (!Array.isArray(data)) continue; // ignora ['agenda', 'livres', ...]
      const [, inicio, fim, profissionalId, cancelados] = key as [string, string?, string?, string?, boolean?];
      const lista = data as Atendimento[];
      const semEle = lista.filter((x) => x.id !== a.id);
      const noPeriodo = (!inicio || new Date(a.fim) > new Date(inicio)) && (!fim || new Date(a.inicio) < new Date(fim));
      const doFiltro = !profissionalId || a.profissional?.id === profissionalId;
      const visivel = noPeriodo && doFiltro && (a.status !== 'CANCELADO' || Boolean(cancelados));
      const nova = visivel ? [...semEle, a].sort((x, y) => x.inicio.localeCompare(y.inicio)) : semEle;
      qc.setQueryData(key, nova);
    }
  };
}

/** Invalida tudo que depende de atendimentos. */
export function useInvalidarAtendimentos() {
  const qc = useQueryClient();
  // Marca tudo como desatualizado e já busca de novo o que está na tela (inclusive a agenda).
  return () =>
    Promise.all(['atendimentos', 'agenda', 'dashboard', 'clientes', 'financeiro'].map((k) => qc.invalidateQueries({ queryKey: [k], refetchType: 'active' })));
}

/** Criar/editar atendimento com N serviços, horários livres e tratamento de conflito de agenda. */
export function AtendimentoFormModal({
  aberto,
  onFechar,
  atendimento,
  inicial,
  onSalvo,
}: {
  aberto: boolean;
  onFechar: () => void;
  atendimento?: Atendimento | null;
  inicial?: InicialAtendimento;
  onSalvo?: (a: Atendimento) => void;
}) {
  const r = useRotulos();
  const { sessao } = useSession();
  const { pode, temModulo } = usePermissao();
  const invalidar = useInvalidarAtendimentos();
  const gravarNaAgenda = useGravarNaAgenda();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const defsExtras = sessao?.empresa.camposPersonalizados?.atendimento;
  const escolheProfissional = temModulo('MULTI_PROFISSIONAL') && pode('atendimentos:todos');
  const editando = Boolean(atendimento);

  const [extras, setExtras] = useState<Valores>({});
  const [errosExtras, setErrosExtras] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Partial<Record<'cliente' | 'data' | 'hora' | 'itens' | 'formaPagamento' | 'descontoCentavos' | 'horaFim', string>>>({});
  const [conflito, setConflito] = useState<string | null>(null);
  const [verLivres, setVerLivres] = useState(false);
  const [novoCliente, setNovoCliente] = useState(false);

  const servicos = useQuery({ queryKey: ['servicos', 'ativos'], queryFn: () => servicosApi.listar({ status: 'ATIVO', perPage: 100 }), enabled: aberto, staleTime: 60_000 });
  const profissionais = useQuery({
    queryKey: ['profissionais', 'ativos'],
    queryFn: () => profissionaisApi.listar({ status: 'ATIVO', perPage: 100 }),
    enabled: aberto && escolheProfissional,
    staleTime: 60_000,
  });
  const mapaServicos = useMemo(() => new Map((servicos.data?.items ?? []).map((s) => [s.id, s])), [servicos.data]);

  const { control, register, handleSubmit, reset, setValue, getValues } = useForm<Form>({
    defaultValues: { cliente: null, profissionalId: '', data: hojeISO(tz), hora: '09:00', fimManual: false, horaFim: '', itens: [{ servicoId: '', quantidade: 1, valorUnitarioCentavos: 0 }], descontoCentavos: 0, acrescimoCentavos: 0, observacoes: '', status: 'AGENDADO', formaPagamento: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });
  const v = useWatch({ control });

  // Preenche só quando o modal abre (edição ou valores iniciais da agenda)
  const inicialRef = useRef(inicial);
  inicialRef.current = inicial;
  useEffect(() => {
    if (!aberto) return;
    const inicial = inicialRef.current;
    setErros({});
    setErrosExtras({});
    setConflito(null);
    setVerLivres(false);
    if (atendimento) {
      const ini = isoParaLocal(atendimento.inicio, tz);
      const fim = isoParaLocal(atendimento.fim, tz);
      reset({
        cliente: { id: atendimento.cliente.id, nome: atendimento.cliente.nome },
        profissionalId: atendimento.profissional?.id ?? '',
        data: ini.data,
        hora: ini.hora,
        fimManual: false,
        horaFim: fim.hora,
        itens: atendimento.itens.map((i) => ({ servicoId: i.servicoId, quantidade: i.quantidade, valorUnitarioCentavos: i.valorUnitarioCentavos })),
        descontoCentavos: atendimento.descontoCentavos,
        acrescimoCentavos: atendimento.acrescimoCentavos,
        observacoes: atendimento.observacoes ?? '',
        status: 'AGENDADO',
        formaPagamento: '',
      });
      setExtras(atendimento.camposExtras ?? {});
    } else {
      const ini = inicial?.inicio ? isoParaLocal(inicial.inicio, tz) : { data: hojeISO(tz), hora: proximaMeiaHora(tz) };
      reset({
        cliente: inicial?.cliente ?? null,
        profissionalId: inicial?.profissionalId ?? '',
        data: ini.data,
        hora: ini.hora,
        fimManual: false,
        horaFim: '',
        itens: [{ servicoId: '', quantidade: 1, valorUnitarioCentavos: 0 }],
        descontoCentavos: 0,
        acrescimoCentavos: 0,
        observacoes: '',
        status: 'AGENDADO',
        formaPagamento: '',
      });
      setExtras({});
    }
  }, [aberto, atendimento, reset, tz]);

  // Prévia (quem calcula de verdade é a API)
  const itens = v.itens ?? [];
  const subtotal = itens.reduce((a, i) => a + (i?.valorUnitarioCentavos ?? 0) * (i?.quantidade ?? 1), 0);
  const total = Math.max(0, subtotal - (v.descontoCentavos ?? 0) + (v.acrescimoCentavos ?? 0));
  const duracao = itens.reduce((a, i) => a + (mapaServicos.get(i?.servicoId ?? '')?.duracaoMinutos ?? 0) * (i?.quantidade ?? 1), 0);
  const terminaAs = v.hora && duracao ? somarMinutos(v.hora, duracao) : null;
  const servicoIds = itens.map((i) => i?.servicoId).filter((x): x is string => Boolean(x));

  const livres = useQuery({
    queryKey: ['agenda', 'livres', v.data, servicoIds.join(','), v.profissionalId],
    queryFn: () => agendaApi.horariosLivres({ data: v.data!, servicoIds, profissionalId: v.profissionalId || undefined }),
    enabled: aberto && verLivres && Boolean(v.data) && servicoIds.length > 0,
  });

  const salvar = useMutation({
    mutationFn: (p: { body: AtendimentoPayload }) => (atendimento ? atendimentosApi.atualizar(atendimento.id, p.body) : atendimentosApi.criar(p.body)),
    onSuccess: (a) => {
      gravarNaAgenda(a);
      void invalidar();
      toast.ok(editando ? `${r.atendimento} atualizado.` : `${r.atendimento} marcado para ${fmtData(isoParaLocal(a.inicio, tz).data)} às ${fmtHora(a.inicio, tz)}.`);
      onSalvo?.(a);
      onFechar();
    },
    onError: (err) => {
      if (codigoErro(err) === 'AGENDA_CONFLITO') {
        setConflito(tratarErro(err, { silencioso: true })?.message ?? 'Já existe um atendimento neste horário.');
        return;
      }
      tratarErro(err, {
        on: {
          CAMPOS_EXTRAS_INVALIDOS: (b) => {
            const m: Record<string, string> = {};
            b.errors?.forEach((x) => (m[x.field.replace(/^(body\.)?camposExtras\./, '')] = x.message));
            setErrosExtras(m);
          },
          DESCONTO_INVALIDO: (b) => setErros((x) => ({ ...x, descontoCentavos: b.message })),
          TRANSICAO_INVALIDA: () => void invalidar(),
        },
      });
    },
  });

  const montar = (f: Form, encaixe = false): AtendimentoPayload | null => {
    const e: typeof erros = {};
    if (!f.cliente) e.cliente = `Escolha o ${r.cliente.toLowerCase()}.`;
    if (!f.data) e.data = 'Informe a data.';
    if (!/^\d{2}:\d{2}$/.test(f.hora)) e.hora = 'Informe a hora.';
    if (!f.itens.length || f.itens.some((i) => !i.servicoId)) e.itens = `Escolha ao menos um ${r.servico.toLowerCase()} em cada linha.`;
    if (!editando && f.status === 'REALIZADO' && !f.formaPagamento) e.formaPagamento = 'Informe como o cliente pagou.';
    if (f.fimManual && (!/^\d{2}:\d{2}$/.test(f.horaFim) || f.horaFim <= f.hora)) e.horaFim = 'O término precisa ser depois do início.';
    if (f.descontoCentavos > subtotal) e.descontoCentavos = 'O desconto não pode ser maior que o subtotal.';
    const ex = validarCamposExtras(defsExtras, extras);
    setErros(e);
    setErrosExtras(ex);
    if (Object.keys(e).length || Object.keys(ex).length) return null;

    const body: AtendimentoPayload = {
      clienteId: f.cliente!.id,
      inicio: localParaIso(f.data, f.hora, tz),
      itens: f.itens.map((i) => {
        const s = mapaServicos.get(i.servicoId);
        return { servicoId: i.servicoId, quantidade: i.quantidade || 1, ...(s && s.valorCentavos !== i.valorUnitarioCentavos ? { valorUnitarioCentavos: i.valorUnitarioCentavos } : {}) };
      }),
      descontoCentavos: f.descontoCentavos,
      acrescimoCentavos: f.acrescimoCentavos,
      observacoes: f.observacoes.trim() || null,
      camposExtras: extras,
    };
    if (f.fimManual) body.fim = localParaIso(f.data, f.horaFim, tz);
    if (escolheProfissional) body.profissionalId = f.profissionalId || null;
    if (encaixe) body.encaixe = true;
    if (!editando) {
      body.status = f.status;
      if (f.status === 'REALIZADO') body.formaPagamento = f.formaPagamento as FormaPagamento;
    }
    return body;
  };

  const enviar = handleSubmit((f) => {
    const body = montar(f);
    if (body) salvar.mutate({ body });
  });

  const marcarEncaixe = () => {
    const body = montar(getValues(), true);
    setConflito(null);
    if (body) salvar.mutate({ body });
  };

  const titulo = editando ? `Editar ${r.atendimento.toLowerCase()}` : r.novo(r.atendimento);

  return (
    <>
      <Modal
        aberto={aberto}
        onFechar={onFechar}
        tamanho="lg"
        titulo={titulo}
        subtitulo={editando ? 'Mudanças de data e hora conferem conflitos de agenda de novo.' : `Escolha o ${r.cliente.toLowerCase()}, os ${r.servicos.toLowerCase()} e o horário.`}
        onSubmit={enviar}
        bloquearFechar={salvar.isPending}
        rodape={
          <>
            <div className="form-total grow">
              <span>Total</span>
              <strong className="num">{brl(total)}</strong>
              {terminaAs && !v.fimManual && <small>termina às {terminaAs}</small>}
            </div>
            <Button variant="ghost" onClick={onFechar} disabled={salvar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" icon="bx-check" loading={salvar.isPending}>
              {editando ? 'Salvar' : 'Marcar'}
            </Button>
          </>
        }
      >
        <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
          <div className="form-grid">
            <div className="span-2">
              <Controller
                control={control}
                name="cliente"
                render={({ field }) => <ClientePicker valor={field.value} onChange={field.onChange} error={erros.cliente} onNovo={() => setNovoCliente(true)} disabled={editando} />}
              />
            </div>
            {escolheProfissional && (
              <Select label="Profissional" {...register('profissionalId')} hint="Vazio usa a agenda geral da empresa.">
                <option value="">Sem profissional</option>
                {(profissionais.data?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            )}
            <div className={cn('form-grid form-grid--tight', !escolheProfissional && 'span-2')}>
              <Input label="Data" type="date" required error={erros.data} {...register('data')} />
              <Input label="Hora" type="time" required step={300} error={erros.hora} {...register('hora')} />
            </div>
          </div>

          <div className="livres">
            <button type="button" className="btn btn--soft btn--sm" onClick={() => setVerLivres((x) => !x)} disabled={!servicoIds.length} aria-expanded={verLivres}>
              <i className="bx bx-search-alt" aria-hidden="true" /> Horários livres neste dia
            </button>
            {!servicoIds.length && <span className="text-xs muted">Escolha um {r.servico.toLowerCase()} para ver os horários livres.</span>}
            {verLivres && servicoIds.length > 0 && (
              <div className="livres__chips" aria-live="polite">
                {livres.isLoading && <span className="text-sm muted">Calculando...</span>}
                {livres.data?.horarios.length === 0 && <span className="text-sm muted">Nenhum horário livre neste dia.</span>}
                {livres.data?.horarios.slice(0, 24).map((h) => {
                  const hh = isoParaLocal(h.inicio, tz).hora;
                  return (
                    <button key={h.inicio} type="button" className="chip" aria-pressed={v.hora === hh} onClick={() => setValue('hora', hh)}>
                      {hh}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-section">
            <span className="form-section__title">
              <i className="bx bx-purchase-tag-alt" aria-hidden="true" /> {r.servicos}
            </span>
            <div className="itens">
              {fields.map((f, idx) => (
                <div key={f.id} className="itens__linha">
                  <Controller
                    control={control}
                    name={`itens.${idx}.servicoId`}
                    render={({ field }) => (
                      <Select
                        label={idx === 0 ? r.servico : undefined}
                        aria-label={r.servico}
                        value={field.value}
                        fieldClassName="itens__servico"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          const s = mapaServicos.get(e.target.value);
                          if (s) setValue(`itens.${idx}.valorUnitarioCentavos`, s.valorCentavos);
                        }}
                      >
                        <option value="">{servicos.isLoading ? 'Carregando...' : 'Selecione'}</option>
                        {(servicos.data?.items ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome} · {s.duracaoMinutos} min
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                  <Input label={idx === 0 ? 'Qtd.' : undefined} aria-label="Quantidade" type="number" min={1} max={100} fieldClassName="itens__qtd" {...register(`itens.${idx}.quantidade`, { valueAsNumber: true })} />
                  <Controller
                    control={control}
                    name={`itens.${idx}.valorUnitarioCentavos`}
                    render={({ field }) => <MoneyInput label={idx === 0 ? 'Valor' : undefined} value={field.value} onChange={field.onChange} fieldClassName="itens__valor" />}
                  />
                  <Button variant="ghost" size="sm" iconOnly icon="bx-trash" aria-label="Remover item" disabled={fields.length === 1} onClick={() => remove(idx)} className="itens__rm" />
                </div>
              ))}
              {erros.itens && (
                <span className="field__error" role="alert">
                  <i className="bx bx-error-circle" aria-hidden="true" />
                  {erros.itens}
                </span>
              )}
              <div>
                <Button variant="soft" size="sm" icon="bx-plus" onClick={() => append({ servicoId: '', quantidade: 1, valorUnitarioCentavos: 0 })}>
                  Adicionar {r.servico.toLowerCase()}
                </Button>
              </div>
            </div>
            <div className="form-grid form-grid--3">
              <Controller control={control} name="descontoCentavos" render={({ field }) => <MoneyInput label="Desconto" value={field.value} onChange={field.onChange} error={erros.descontoCentavos} />} />
              <Controller control={control} name="acrescimoCentavos" render={({ field }) => <MoneyInput label="Acréscimo" value={field.value} onChange={field.onChange} />} />
              <div className="field">
                <span className="field__label">Subtotal</span>
                <span className="form-subtotal num">{brl(subtotal)}</span>
              </div>
            </div>
          </div>

          {defsExtras && defsExtras.length > 0 && (
            <div className="form-section">
              <span className="form-section__title">
                <i className="bx bx-customize" aria-hidden="true" /> Informações do {r.atendimento.toLowerCase()}
              </span>
              <CamposExtras defs={defsExtras} valor={extras} onChange={setExtras} erros={errosExtras} />
            </div>
          )}

          <div className="form-section">
            {!editando && (
              <div className="field">
                <span className="field__label">Situação</span>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Segmented
                      label="Situação inicial"
                      valor={field.value}
                      onChange={field.onChange}
                      opcoes={[
                        { valor: 'AGENDADO', label: 'Agendado' },
                        { valor: 'CONFIRMADO', label: 'Confirmado' },
                        { valor: 'REALIZADO', label: 'Já realizado' },
                      ]}
                    />
                  )}
                />
              </div>
            )}
            {!editando && v.status === 'REALIZADO' && (
              <Select label="Forma de pagamento" required error={erros.formaPagamento} {...register('formaPagamento')}>
                <option value="">Selecione</option>
                {Object.entries(FORMAS_PAGAMENTO).map(([k, f]) => (
                  <option key={k} value={k}>
                    {f.label}
                  </option>
                ))}
              </Select>
            )}
            <label className="check">
              <input type="checkbox" {...register('fimManual')} />
              <span>Definir o término manualmente</span>
            </label>
            {v.fimManual && <Input label="Termina às" type="time" step={300} error={erros.horaFim} {...register('horaFim')} fieldClassName="field--narrow" />}
            <Textarea label="Observações" rows={2} maxLength={2000} {...register('observacoes')} />
          </div>
        </div>
      </Modal>

      <Modal
        aberto={Boolean(conflito)}
        onFechar={() => setConflito(null)}
        tamanho="sm"
        titulo="Horário ocupado"
        rodape={
          <>
            <Button
              variant="ghost"
              icon="bx-search-alt"
              onClick={() => {
                setConflito(null);
                setVerLivres(true);
              }}
            >
              Ver horários livres
            </Button>
            <Button icon="bx-layer-plus" onClick={marcarEncaixe} loading={salvar.isPending}>
              Marcar como encaixe
            </Button>
          </>
        }
      >
        <div className="conflito">
          <span className="conflito__icone" aria-hidden="true">
            <i className="bx bx-calendar-x" />
          </span>
          <p>{conflito}</p>
          <p className="muted text-sm">O encaixe permite sobrepor de propósito outro horário.</p>
        </div>
      </Modal>

      <ClienteFormModal aberto={novoCliente} onFechar={() => setNovoCliente(false)} onSalvo={(c) => setValue('cliente', { id: c.id, nome: c.nome })} />
    </>
  );
}

function somarMinutos(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (h * 60 + m + min) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

function proximaMeiaHora(tz: string): string {
  const { hora } = isoParaLocal(new Date(Date.now() + 30 * 60_000).toISOString(), tz);
  const [h, m] = hora.split(':').map(Number);
  return m < 30 ? `${pad(h)}:30` : `${pad((h + 1) % 24)}:00`;
}
