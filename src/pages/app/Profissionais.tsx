import { useEffect, useState, type CSSProperties } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profissionaisApi } from '@/api/endpoints/profissionais';
import { servicosApi } from '@/api/endpoints/servicos';
import type { DiaSemana, Expediente, Intervalo, Profissional, ProfissionalPayload, StatusAtivo } from '@/api/types';
import { usePermissao } from '@/auth/usePermissao';
import { Avatar } from '@/components/ui/Avatar';
import { AtivoBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { MaskedInput } from '@/components/ui/MaskedInputs';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented } from '@/components/ui/Tabs';
import { PALETA_CATEGORIAS } from '@/lib/chartTheme';
import { cn } from '@/lib/cn';
import { DIAS_SEMANA } from '@/lib/dates';
import { codigoErro, tratarErro } from '@/lib/errors';
import { maskTelefone } from '@/lib/masks';
import { bpsParaPct, pctParaBps } from '@/lib/money';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';

const DIAS: DiaSemana[] = ['1', '2', '3', '4', '5', '6', '0'];

/** Resumo legível do expediente (ex.: "Seg a Sex, 08:00-18:00"). */
function resumoExpediente(e: Expediente | null): string {
  if (!e || !Object.keys(e).length) return 'Expediente padrão da empresa';
  const dias = DIAS.filter((d) => e[d]?.length);
  if (!dias.length) return 'Sem dias configurados';
  return `${dias.map((d) => DIAS_SEMANA[Number(d)].slice(0, 3)).join(', ')}`;
}

/** Equipe de atendimento: cor na agenda, comissão, serviços e expediente. */
export default function Profissionais() {
  const qc = useQueryClient();
  const { podeEscrever } = usePermissao();
  const escrever = podeEscrever('profissionais:escrever');
  const [status, setStatus] = useState<StatusAtivo | 'TODOS'>('ATIVO');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ aberto: boolean; p?: Profissional }>({ aberto: false });
  const [excluir, setExcluir] = useState<Profissional | null>(null);
  const [inativar, setInativar] = useState<Profissional | null>(null);

  const filtros = { status: status === 'TODOS' ? undefined : status, page, perPage: 24 };
  const q = useQuery({ queryKey: ['profissionais', 'lista', filtros], queryFn: () => profissionaisApi.listar(filtros), placeholderData: keepPreviousData });

  const invalidar = () => ['profissionais', 'agenda'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const remover = useMutation({
    mutationFn: (p: Profissional) => profissionaisApi.remover(p.id),
    onSuccess: () => {
      invalidar();
      toast.ok('Profissional excluído.');
      setExcluir(null);
    },
    onError: (e, p) => {
      setExcluir(null);
      if (codigoErro(e) === 'PROFISSIONAL_COM_HISTORICO') setInativar(p);
      else tratarErro(e);
    },
  });
  const desativar = useMutation({
    mutationFn: (p: Profissional) => profissionaisApi.atualizar(p.id, { status: 'INATIVO' }),
    onSuccess: () => {
      invalidar();
      toast.ok('Profissional inativado.');
      setInativar(null);
    },
    onError: (e) => tratarErro(e),
  });

  return (
    <div className="page">
      <PageHeader
        titulo="Profissionais"
        descricao="A cor identifica cada pessoa na agenda. A comissão é calculada quando o atendimento é realizado."
        acoes={
          escrever && (
            <Button icon="bx-plus" onClick={() => setForm({ aberto: true })} data-tour="profissional-novo">
              Novo profissional
            </Button>
          )
        }
      />
      <div className="toolbar" data-aos="fade-up">
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
        <div className="prof-grid">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="prof-card">
              <Skeleton w={48} h={48} r={24} />
              <Skeleton w="60%" h={16} />
              <Skeleton h={40} />
            </div>
          ))}
        </div>
      ) : !q.data?.items.length ? (
        <div className="card">
          <EmptyState icon="bx-id-card" titulo="Nenhum profissional" texto="Cadastre quem atende para ter agendas separadas e comissões." acao={escrever && <Button icon="bx-plus" onClick={() => setForm({ aberto: true })}>Novo profissional</Button>} />
        </div>
      ) : (
        <>
          <ul className="prof-grid" data-tour="profissionais-lista">
            {q.data.items.map((p, i) => (
              <li key={p.id} className={cn('prof-card', p.status === 'INATIVO' && 'is-inativo')} style={{ '--cor': p.cor ?? 'var(--secondary)' } as CSSProperties} data-aos="fade-up" data-aos-delay={(i % 6) * 50}>
                <div className="prof-card__topo">
                  <Avatar nome={p.nome} size={48} cor={p.cor} />
                  <div className="grow">
                    <strong>{p.nome}</strong>
                    <small>{maskTelefone(p.telefone) || p.email || 'Sem contato'}</small>
                  </div>
                  <span className="prof-card__pct num">{bpsParaPct(p.comissaoBps).toLocaleString('pt-BR')}%</span>
                </div>
                <div className="prof-card__meta">
                  <span>
                    <i className="bx bx-time" aria-hidden="true" /> {resumoExpediente(p.horarioTrabalho)}
                  </span>
                  <span>
                    <i className="bx bx-purchase-tag-alt" aria-hidden="true" /> {p.servicos.length ? `${p.servicos.length} serviço(s)` : 'Todos os serviços'}
                  </span>
                </div>
                <div className="row" style={{ ['--gap' as string]: '0.4rem' }}>
                  <AtivoBadge status={p.status} />
                  {p.usuarioId ? <Badge tom="info" icon="bx-user-check">Tem login</Badge> : <Badge>Sem login</Badge>}
                </div>
                {escrever && (
                  <div className="prof-card__acoes">
                    <Button size="sm" variant="soft" icon="bx-edit-alt" onClick={() => setForm({ aberto: true, p })}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" iconOnly icon="bx-trash" aria-label={`Excluir ${p.nome}`} onClick={() => setExcluir(p)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={q.data.meta} onPage={setPage} />
        </>
      )}

      <ProfissionalFormModal aberto={form.aberto} profissional={form.p} onFechar={() => setForm({ aberto: false })} />
      <ConfirmDialog aberto={Boolean(excluir)} onFechar={() => setExcluir(null)} onConfirmar={() => excluir && remover.mutate(excluir)} carregando={remover.isPending} perigo titulo={`Excluir ${excluir?.nome ?? ''}`} confirmar="Excluir" mensagem="Só é possível excluir quem não tem atendimentos registrados." />
      <ConfirmDialog
        aberto={Boolean(inativar)}
        onFechar={() => setInativar(null)}
        onConfirmar={() => inativar && desativar.mutate(inativar)}
        carregando={desativar.isPending}
        titulo="Inativar em vez de excluir?"
        confirmar="Inativar"
        mensagem={`${inativar?.nome ?? ''} tem histórico de atendimentos. Inativando, sai da agenda e as comissões antigas continuam nos relatórios.`}
      />
    </div>
  );
}

type ModoDia = 'padrao' | 'folga' | 'horarios';

function ProfissionalFormModal({ aberto, profissional, onFechar }: { aberto: boolean; profissional?: Profissional; onFechar: () => void }) {
  const r = useRotulos();
  const qc = useQueryClient();
  const servicos = useQuery({ queryKey: ['servicos', 'ativos'], queryFn: () => servicosApi.listar({ status: 'ATIVO', perPage: 100 }), enabled: aberto });
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cor, setCor] = useState(PALETA_CATEGORIAS[0]);
  const [pct, setPct] = useState('0');
  const [servicoIds, setServicoIds] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusAtivo>('ATIVO');
  const [exp, setExp] = useState<Expediente>({});
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!aberto) return;
    const p = profissional;
    setNome(p?.nome ?? '');
    setEmail(p?.email ?? '');
    setTelefone(p?.telefone ?? '');
    setCor(p?.cor ?? PALETA_CATEGORIAS[Math.floor(Math.random() * 6)]);
    setPct(String(p ? bpsParaPct(p.comissaoBps) : 40));
    setServicoIds(p?.servicos.map((s) => s.id) ?? []);
    setStatus(p?.status ?? 'ATIVO');
    setExp(p?.horarioTrabalho ?? {});
    setErros({});
  }, [aberto, profissional]);

  const modo = (d: DiaSemana): ModoDia => (exp[d] === undefined ? 'padrao' : exp[d]!.length ? 'horarios' : 'folga');
  const setModo = (d: DiaSemana, m: ModoDia) =>
    setExp((e) => {
      const n = { ...e };
      if (m === 'padrao') delete n[d];
      else if (m === 'folga') n[d] = [];
      else n[d] = e[d]?.length ? e[d] : [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }];
      return n;
    });
  const setIntervalo = (d: DiaSemana, i: number, campo: keyof Intervalo, v: string) => setExp((e) => ({ ...e, [d]: (e[d] ?? []).map((x, j) => (j === i ? { ...x, [campo]: v } : x)) }));
  const copiarParaUteis = (d: DiaSemana) => setExp((e) => ({ ...e, '1': e[d], '2': e[d], '3': e[d], '4': e[d], '5': e[d] }));

  const salvar = useMutation({
    mutationFn: (b: ProfissionalPayload) => (profissional ? profissionaisApi.atualizar(profissional.id, b) : profissionaisApi.criar(b)),
    onSuccess: () => {
      ['profissionais', 'agenda'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.ok(profissional ? 'Profissional atualizado.' : 'Profissional cadastrado.');
      onFechar();
    },
    onError: (e) => tratarErro(e),
  });

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (nome.trim().length < 2) e.nome = 'Informe o nome.';
    const n = Number(pct.replace(',', '.'));
    if (Number.isNaN(n) || n < 0 || n > 100) e.pct = 'Entre 0 e 100%.';
    if (telefone && (telefone.length < 10 || telefone.length > 13)) e.telefone = 'Telefone com DDD.';
    for (const d of DIAS) for (const i of exp[d] ?? []) if (!(i.inicio < i.fim)) e.exp = `Em ${DIAS_SEMANA[Number(d)]}, o início precisa ser antes do fim.`;
    setErros(e);
    if (Object.keys(e).length) return;
    salvar.mutate({ nome: nome.trim(), email: email.trim() || null, telefone: telefone || null, cor, comissaoBps: pctParaBps(n), servicoIds, horarioTrabalho: exp, status });
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      tamanho="lg"
      titulo={profissional ? `Editar ${profissional.nome}` : 'Novo profissional'}
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
      <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
        <div className="form-grid">
          <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} error={erros.nome} fieldClassName="span-2" data-autofocus />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <MaskedInput label="Telefone" inputMode="tel" mask={maskTelefone} value={telefone} onChange={setTelefone} error={erros.telefone} />
          <Input label="Comissão (%)" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.,]/g, ''))} error={erros.pct} hint="Sobre o valor de cada item realizado." />
          {profissional && (
            <Select label="Situação" value={status} onChange={(e) => setStatus(e.target.value as StatusAtivo)}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </Select>
          )}
          <div className="field span-2">
            <span className="field__label">Cor na agenda</span>
            <div className="cores" role="radiogroup" aria-label="Cor na agenda">
              {PALETA_CATEGORIAS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cor === c} aria-label={c} className="cores__op" style={{ background: c }} onClick={() => setCor(c)} />
              ))}
              <input type="color" className="input" value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Outra cor" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <span className="form-section__title">
            <i className="bx bx-purchase-tag-alt" aria-hidden="true" /> {r.servicos} que executa
          </span>
          <p className="text-xs muted">Nenhum marcado = pode executar todos.</p>
          <div className="row" style={{ ['--gap' as string]: '0.4rem' }}>
            {(servicos.data?.items ?? []).map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={servicoIds.includes(s.id)} onClick={() => setServicoIds((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))}>
                {s.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <span className="form-section__title">
            <i className="bx bx-time-five" aria-hidden="true" /> Expediente
          </span>
          <div className="expediente">
            {DIAS.map((d) => (
              <div key={d} className="expediente__dia">
                <span className="expediente__nome">{DIAS_SEMANA[Number(d)]}</span>
                <Segmented<ModoDia>
                  label={`Expediente de ${DIAS_SEMANA[Number(d)]}`}
                  valor={modo(d)}
                  onChange={(m) => setModo(d, m)}
                  opcoes={[
                    { valor: 'padrao', label: 'Padrão' },
                    { valor: 'horarios', label: 'Horários' },
                    { valor: 'folga', label: 'Folga' },
                  ]}
                />
                {modo(d) === 'horarios' && (
                  <div className="expediente__intervalos">
                    {(exp[d] ?? []).map((i, idx) => (
                      <div key={idx} className="expediente__intervalo">
                        <input className="input" type="time" aria-label="Início" value={i.inicio} onChange={(e) => setIntervalo(d, idx, 'inicio', e.target.value)} />
                        <span aria-hidden="true">até</span>
                        <input className="input" type="time" aria-label="Fim" value={i.fim} onChange={(e) => setIntervalo(d, idx, 'fim', e.target.value)} />
                        <Button size="sm" variant="ghost" iconOnly icon="bx-x" aria-label="Remover intervalo" onClick={() => setExp((e) => ({ ...e, [d]: (e[d] ?? []).filter((_, j) => j !== idx) }))} />
                      </div>
                    ))}
                    <div className="row" style={{ ['--gap' as string]: '0.4rem' }}>
                      {(exp[d]?.length ?? 0) < 6 && (
                        <Button size="sm" variant="soft" icon="bx-plus" onClick={() => setExp((e) => ({ ...e, [d]: [...(e[d] ?? []), { inicio: '14:00', fim: '18:00' }] }))}>
                          Intervalo
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon="bx-copy" onClick={() => copiarParaUteis(d)}>
                        Copiar para seg-sex
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {erros.exp && (
            <span className="field__error" role="alert">
              <i className="bx bx-error-circle" aria-hidden="true" />
              {erros.exp}
            </span>
          )}
          <p className="text-xs muted">"Padrão" usa o horário geral (08:00 às 18:00). Os horários livres da agenda seguem este expediente.</p>
        </div>
      </div>
    </Modal>
  );
}
