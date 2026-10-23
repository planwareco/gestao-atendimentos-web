import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configuracoesApi } from '@/api/endpoints/configuracoes';
import { publicoApi } from '@/api/endpoints/publico';
import type { Aparencia, CamposPersonalizados, Configuracoes as Cfg, ConfiguracoesPayload, DefinicaoCampo, Endereco, Segmento, TipoCampo } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { AlterarSenhaForm } from '@/components/AlterarSenhaModal';
import { ImagemUpload } from '@/components/ImagemUpload';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Checkbox, Input, Select } from '@/components/ui/Field';
import { MaskedInput } from '@/components/ui/MaskedInputs';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented, Tabs } from '@/components/ui/Tabs';
import { tratarErro } from '@/lib/errors';
import { FUSOS, iconeModulo, SEGMENTOS_ICONE, UFS } from '@/lib/labels';
import { maskCep, maskDocumento, maskTelefone } from '@/lib/masks';
import { ehImagemEnviada } from '@/lib/imagem';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { applyTheme, coresEfetivas, MARCA } from '@/theme/applyTheme';

/** Mesmos limites da API (caracteres do data URL). */
const LIMITE_LOGO = 350_000;
const LIMITE_FAVICON = 60_000;

type Aba = 'dados' | 'aparencia' | 'campos' | 'plano' | 'conta';

/** Configurações da empresa: dados, aparência com preview ao vivo, segmento e campos, plano e conta. */
export default function Configuracoes() {
  const [aba, setAba] = useState<Aba>('dados');
  const q = useQuery({ queryKey: ['configuracoes'], queryFn: configuracoesApi.obter });

  return (
    <div className="page">
      <PageHeader titulo="Configurações" descricao="Tudo o que muda aqui vale para toda a equipe." />
      <Tabs<Aba>
        label="Seções"
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: 'dados', label: 'Dados', icon: 'bx-buildings' },
          { valor: 'aparencia', label: 'Aparência', icon: 'bx-palette' },
          { valor: 'campos', label: 'Segmento e campos', icon: 'bx-customize' },
          { valor: 'plano', label: 'Plano', icon: 'bx-package' },
          { valor: 'conta', label: 'Minha conta', icon: 'bx-user-circle' },
        ]}
      />
      {aba === 'conta' ? (
        <section className="card card--pad" data-aos="fade-up">
          <h2 className="h-2" style={{ marginBottom: '1rem' }}>
            Alterar senha
          </h2>
          <AlterarSenhaForm />
        </section>
      ) : q.isLoading ? (
        <PageLoader />
      ) : q.error || !q.data ? (
        <ErrorState erro={q.error} onTentar={() => q.refetch()} />
      ) : aba === 'dados' ? (
        <Dados cfg={q.data} />
      ) : aba === 'aparencia' ? (
        <AparenciaTab cfg={q.data} />
      ) : aba === 'campos' ? (
        <Campos cfg={q.data} />
      ) : (
        <Plano cfg={q.data} />
      )}
    </div>
  );
}

/** Salva e recarrega a sessão (tema, rótulos e campos aplicados no app inteiro). */
function useSalvarConfig(msg: string) {
  const qc = useQueryClient();
  const { recarregar } = useSession();
  return useMutation({
    mutationFn: (b: ConfiguracoesPayload) => configuracoesApi.atualizar(b),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['configuracoes'] });
      await recarregar();
      toast.ok(msg);
    },
    onError: (e) => tratarErro(e),
  });
}

function Dados({ cfg }: { cfg: Cfg }) {
  const salvar = useSalvarConfig('Dados da empresa salvos.');
  const [d, setD] = useState({
    nome: cfg.nome,
    nomeFantasia: cfg.nomeFantasia ?? '',
    documento: cfg.documento ?? '',
    email: cfg.email,
    telefone: cfg.telefone ?? '',
    whatsapp: cfg.whatsapp ?? '',
    fusoHorario: cfg.fusoHorario,
  });
  const [end, setEnd] = useState<Endereco>(cfg.endereco ?? {});
  const [erros, setErros] = useState<Record<string, string>>({});
  const set = (k: keyof typeof d, v: string) => setD((x) => ({ ...x, [k]: v }));

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (d.nome.trim().length < 2) e.nome = 'Informe o nome.';
    if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = 'E-mail inválido.';
    if (d.documento && ![11, 14].includes(d.documento.length)) e.documento = 'CPF (11) ou CNPJ (14 dígitos).';
    const temEnd = Object.values(end).some((x) => x);
    if (temEnd && (!end.cep || end.cep.length !== 8 || !end.logradouro || !end.numero || !end.bairro || !end.cidade || !end.estado)) e.endereco = 'Preencha CEP, logradouro, número, bairro, cidade e UF.';
    setErros(e);
    if (Object.keys(e).length) return;

    const b: ConfiguracoesPayload = {};
    if (d.nome !== cfg.nome) b.nome = d.nome.trim();
    if (d.nomeFantasia !== (cfg.nomeFantasia ?? '')) b.nomeFantasia = d.nomeFantasia.trim() || null;
    if (d.documento !== (cfg.documento ?? '')) b.documento = d.documento || null;
    if (d.email !== cfg.email) b.email = d.email.trim().toLowerCase();
    if (d.telefone !== (cfg.telefone ?? '')) b.telefone = d.telefone || null;
    if (d.whatsapp !== (cfg.whatsapp ?? '')) b.whatsapp = d.whatsapp || null;
    if (d.fusoHorario !== cfg.fusoHorario) b.fusoHorario = d.fusoHorario;
    if (JSON.stringify(end) !== JSON.stringify(cfg.endereco ?? {})) b.endereco = temEnd ? { ...end, complemento: end.complemento || null } : null;
    if (!Object.keys(b).length) return toast.info('Nada mudou.');
    salvar.mutate(b);
  };

  return (
    <form className="card card--pad stack" onSubmit={enviar} noValidate data-aos="fade-up" style={{ ['--gap' as string]: '1.4rem' }}>
      <div className="form-grid form-grid--3">
        <Input label="Razão social / nome" required value={d.nome} onChange={(e) => set('nome', e.target.value)} error={erros.nome} />
        <Input label="Nome fantasia" value={d.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} hint="Aparece no menu e no PDF." />
        <MaskedInput label="CPF ou CNPJ" mask={maskDocumento} value={d.documento} onChange={(v) => set('documento', v)} error={erros.documento} />
        <Input label="E-mail" type="email" required value={d.email} onChange={(e) => set('email', e.target.value)} error={erros.email} />
        <MaskedInput label="Telefone" inputMode="tel" mask={maskTelefone} value={d.telefone} onChange={(v) => set('telefone', v)} />
        <MaskedInput label="WhatsApp" inputMode="tel" icon="bxl-whatsapp" mask={maskTelefone} value={d.whatsapp} onChange={(v) => set('whatsapp', v)} />
        <Select label="Fuso horário" value={d.fusoHorario} onChange={(e) => set('fusoHorario', e.target.value)} hint="Define o que é hoje, o mês e o expediente.">
          {[...new Set([d.fusoHorario, ...FUSOS])].map((f) => (
            <option key={f} value={f}>
              {f.replace('America/', '').replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>
      <div className="form-section">
        <span className="form-section__title">
          <i className="bx bx-map" aria-hidden="true" /> Endereço
        </span>
        <div className="form-grid form-grid--3">
          <MaskedInput label="CEP" mask={maskCep} value={end.cep ?? ''} onChange={(v) => setEnd({ ...end, cep: v })} />
          <Input label="Logradouro" value={end.logradouro ?? ''} onChange={(e) => setEnd({ ...end, logradouro: e.target.value })} fieldClassName="span-2" />
          <Input label="Número" value={end.numero ?? ''} onChange={(e) => setEnd({ ...end, numero: e.target.value })} />
          <Input label="Complemento" value={end.complemento ?? ''} onChange={(e) => setEnd({ ...end, complemento: e.target.value })} />
          <Input label="Bairro" value={end.bairro ?? ''} onChange={(e) => setEnd({ ...end, bairro: e.target.value })} />
          <Input label="Cidade" value={end.cidade ?? ''} onChange={(e) => setEnd({ ...end, cidade: e.target.value })} fieldClassName="span-2" />
          <Select label="UF" value={end.estado ?? ''} onChange={(e) => setEnd({ ...end, estado: e.target.value })}>
            <option value="">-</option>
            {UFS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
        </div>
        {erros.endereco && (
          <span className="field__error" role="alert">
            <i className="bx bx-error-circle" aria-hidden="true" />
            {erros.endereco}
          </span>
        )}
      </div>
      <div>
        <Button type="submit" icon="bx-check" loading={salvar.isPending}>
          Salvar dados
        </Button>
      </div>
    </form>
  );
}

const SUGESTOES = ['#0F2557', '#1E3A8A', '#2F6BFF', '#0E7490', '#047857', '#7C2D12', '#9D174D', '#312E81', '#111827'];

function AparenciaTab({ cfg }: { cfg: Cfg }) {
  const { sessao } = useSession();
  const salvar = useSalvarConfig('Aparência aplicada para toda a equipe.');
  const inicial = useMemo(() => {
    const c = coresEfetivas(cfg.aparencia);
    return { corPrimaria: c.primaria, corSecundaria: c.secundaria, tema: cfg.aparencia?.tema ?? 'claro', logoUrl: cfg.aparencia?.logoUrl ?? '', faviconUrl: cfg.aparencia?.faviconUrl ?? '' };
  }, [cfg.aparencia]);
  const [a, setA] = useState(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Preview ao vivo; ao sair sem salvar, volta ao tema da sessão
  useEffect(() => {
    applyTheme({ ...a, logoUrl: a.logoUrl || null, faviconUrl: a.faviconUrl || null } as Aparencia);
  }, [a]);
  useEffect(() => () => applyTheme(sessao?.empresa.aparencia), [sessao?.empresa.aparencia]);

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const imagemValida = (v: string) => /^https:\/\/.+/i.test(v) || ehImagemEnviada(v);
    if (a.logoUrl && !imagemValida(a.logoUrl)) e.logo = 'Envie uma imagem ou use um link https://';
    if (a.faviconUrl && !imagemValida(a.faviconUrl)) e.favicon = 'Envie uma imagem ou use um link https://';
    setErros(e);
    if (Object.keys(e).length) return;
    salvar.mutate({ aparencia: { corPrimaria: a.corPrimaria, corSecundaria: a.corSecundaria, tema: a.tema as 'claro' | 'escuro', logoUrl: a.logoUrl || null, faviconUrl: a.faviconUrl || null } });
  };

  return (
    <form className="aparencia" onSubmit={enviar} noValidate data-aos="fade-up">
      <div className="card card--pad stack" style={{ ['--gap' as string]: '1.4rem' }}>
        <div className="field">
          <span className="field__label">Cor principal</span>
          <div className="cores" role="radiogroup" aria-label="Cor principal">
            {SUGESTOES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={a.corPrimaria.toUpperCase() === c} aria-label={c} className="cores__op" style={{ background: c }} onClick={() => setA({ ...a, corPrimaria: c })} />
            ))}
            <input type="color" className="input" value={a.corPrimaria} onChange={(e) => setA({ ...a, corPrimaria: e.target.value })} aria-label="Escolher outra cor principal" />
          </div>
          <span className="field__hint">Menu lateral, botões e destaques.</span>
        </div>
        <div className="field">
          <span className="field__label">Cor de destaque</span>
          <div className="cores" role="radiogroup" aria-label="Cor de destaque">
            {['#2F6BFF', '#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'].map((c) => (
              <button key={c} type="button" role="radio" aria-checked={a.corSecundaria.toUpperCase() === c} aria-label={c} className="cores__op" style={{ background: c }} onClick={() => setA({ ...a, corSecundaria: c })} />
            ))}
            <input type="color" className="input" value={a.corSecundaria} onChange={(e) => setA({ ...a, corSecundaria: e.target.value })} aria-label="Escolher outra cor de destaque" />
          </div>
          <span className="field__hint">Gráficos, links, foco e chips.</span>
        </div>
        <div className="field">
          <span className="field__label">Tema</span>
          <Segmented
            label="Tema"
            valor={a.tema}
            onChange={(t) => setA({ ...a, tema: t })}
            opcoes={[
              { valor: 'claro', label: 'Claro', icon: 'bx-sun' },
              { valor: 'escuro', label: 'Escuro', icon: 'bx-moon' },
            ]}
          />
        </div>
        <div className="form-grid upload-grid">
          <ImagemUpload
            label="Logo"
            formato="largo"
            maxLargura={600}
            maxAltura={240}
            limite={LIMITE_LOGO}
            valor={a.logoUrl}
            onChange={(v) => setA({ ...a, logoUrl: v })}
            error={erros.logo}
            hint="Aparece no menu e no PDF dos orçamentos. Prefira fundo transparente."
          />
          <ImagemUpload
            label="Favicon"
            formato="icone"
            maxLargura={128}
            maxAltura={128}
            limite={LIMITE_FAVICON}
            valor={a.faviconUrl}
            onChange={(v) => setA({ ...a, faviconUrl: v })}
            error={erros.favicon}
            hint="Ícone da aba do navegador. Use uma imagem quadrada."
          />
        </div>
        <div className="row">
          <Button type="submit" icon="bx-check" loading={salvar.isPending}>
            Aplicar para todos
          </Button>
          <Button variant="ghost" icon="bx-reset" onClick={() => setA({ ...a, corPrimaria: MARCA.primaria, corSecundaria: MARCA.secundaria, tema: 'claro' })}>
            Cores originais
          </Button>
        </div>
      </div>

      <aside className="preview-tema card" aria-label="Pré-visualização">
        <span className="text-xs muted">Pré-visualização</span>
        <div className="preview-tema__app">
          <div className="preview-tema__side">
            {a.logoUrl ? <img src={a.logoUrl} alt="" /> : <span className="preview-tema__logo" />}
            <span className="is-on" />
            <span />
            <span />
          </div>
          <div className="preview-tema__main">
            <span className="preview-tema__titulo" />
            <div className="preview-tema__cards">
              <span />
              <span />
            </div>
            <span className="btn btn--primary btn--sm" aria-hidden="true">
              Botão
            </span>
            <span className="chip" aria-pressed="true" aria-hidden="true">
              Destaque
            </span>
          </div>
        </div>
      </aside>
    </form>
  );
}

const TIPOS: { valor: TipoCampo; label: string }[] = [
  { valor: 'texto', label: 'Texto' },
  { valor: 'numero', label: 'Número' },
  { valor: 'data', label: 'Data' },
  { valor: 'selecao', label: 'Seleção' },
  { valor: 'booleano', label: 'Sim/Não' },
];

/** Gera uma chave válida (letra inicial, até 40 caracteres) a partir do rótulo. */
const chaveDe = (rotulo: string) => {
  const base = rotulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join('');
  return (/^[a-zA-Z]/.test(base) ? base : `campo${base}`).slice(0, 40) || 'campo';
};

function Campos({ cfg }: { cfg: Cfg }) {
  const salvar = useSalvarConfig('Segmento e campos atualizados.');
  const segs = useQuery({ queryKey: ['public', 'segmentos'], queryFn: publicoApi.segmentos, staleTime: 3_600_000 });
  const cp: CamposPersonalizados = cfg.camposPersonalizados ?? {};
  const [segmento, setSegmento] = useState<Segmento>(cfg.segmento);
  const [rot, setRot] = useState({ cliente: cp.rotulos?.cliente ?? 'Cliente', servico: cp.rotulos?.servico ?? 'Serviço', atendimento: cp.rotulos?.atendimento ?? 'Atendimento' });
  const [listas, setListas] = useState<{ cliente: DefinicaoCampo[]; atendimento: DefinicaoCampo[] }>({ cliente: cp.cliente ?? [], atendimento: cp.atendimento ?? [] });
  const [opcoesTxt, setOpcoesTxt] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState(false);
  const [erro, setErro] = useState<string>();

  const atualizar = (alvo: 'cliente' | 'atendimento', i: number, p: Partial<DefinicaoCampo>) =>
    setListas((l) => ({ ...l, [alvo]: l[alvo].map((c, j) => (j === i ? { ...c, ...p } : c)) }));

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const montar = (alvo: 'cliente' | 'atendimento') =>
      listas[alvo].map((c, i) => {
        const def: DefinicaoCampo = { chave: c.chave || chaveDe(c.rotulo), rotulo: c.rotulo.trim(), tipo: c.tipo, obrigatorio: c.obrigatorio };
        if (c.tipo === 'selecao') {
          const txt = opcoesTxt[`${alvo}${i}`];
          def.opcoes = (txt !== undefined ? txt.split(',') : (c.opcoes ?? [])).map((o) => o.trim()).filter(Boolean);
        }
        return def;
      });
    const cliente = montar('cliente');
    const atendimento = montar('atendimento');
    const todos = [...cliente, ...atendimento];
    if (todos.some((c) => !c.rotulo)) return setErro('Todo campo precisa de um rótulo.');
    if (todos.some((c) => c.tipo === 'selecao' && !c.opcoes?.length)) return setErro('Campos de seleção precisam de opções separadas por vírgula.');
    for (const l of [cliente, atendimento]) if (new Set(l.map((c) => c.chave)).size !== l.length) return setErro('Há dois campos com o mesmo nome na mesma lista.');
    setErro(undefined);
    salvar.mutate({
      ...(segmento !== cfg.segmento ? { segmento } : {}),
      camposPersonalizados: { rotulos: { cliente: rot.cliente.trim() || 'Cliente', servico: rot.servico.trim() || 'Serviço', atendimento: rot.atendimento.trim() || 'Atendimento' }, cliente, atendimento },
    });
  };

  const bloco = (alvo: 'cliente' | 'atendimento', titulo: string) => (
    <div className="form-section">
      <span className="form-section__title">
        <i className={`bx ${alvo === 'cliente' ? 'bx-user' : 'bx-calendar'}`} aria-hidden="true" /> {titulo}
      </span>
      {!listas[alvo].length && <p className="text-sm muted">Nenhum campo extra.</p>}
      <ul className="campos-lista">
        {listas[alvo].map((c, i) => (
          <li key={i} className="campo-def">
            <Input label="Rótulo" value={c.rotulo} maxLength={60} onChange={(e) => atualizar(alvo, i, { rotulo: e.target.value, ...(c.chave && cfg.camposPersonalizados?.[alvo]?.some((x) => x.chave === c.chave) ? {} : { chave: chaveDe(e.target.value) }) })} />
            <Select label="Tipo" value={c.tipo} onChange={(e) => atualizar(alvo, i, { tipo: e.target.value as TipoCampo })}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </Select>
            {c.tipo === 'selecao' && (
              <Input
                label="Opções"
                hint="Separe por vírgula"
                value={opcoesTxt[`${alvo}${i}`] ?? (c.opcoes ?? []).join(', ')}
                onChange={(e) => setOpcoesTxt((o) => ({ ...o, [`${alvo}${i}`]: e.target.value }))}
                fieldClassName="campo-def__opcoes"
              />
            )}
            <Checkbox label="Obrigatório" checked={c.obrigatorio} onChange={(e) => atualizar(alvo, i, { obrigatorio: e.target.checked })} />
            <Button variant="ghost" size="sm" iconOnly icon="bx-trash" aria-label={`Remover ${c.rotulo || 'campo'}`} onClick={() => setListas((l) => ({ ...l, [alvo]: l[alvo].filter((_, j) => j !== i) }))} />
          </li>
        ))}
      </ul>
      {listas[alvo].length < 30 && (
        <div>
          <Button size="sm" variant="soft" icon="bx-plus" onClick={() => setListas((l) => ({ ...l, [alvo]: [...l[alvo], { chave: '', rotulo: '', tipo: 'texto', obrigatorio: false }] }))}>
            Adicionar campo
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <form className="card card--pad stack" onSubmit={enviar} noValidate data-aos="fade-up" style={{ ['--gap' as string]: '1.4rem' }}>
      <div className="field">
        <span className="field__label">Segmento</span>
        <div className="seg-grid">
          {(segs.data ?? []).map((s) => (
            <label key={s.codigo} className={`seg-opcao${segmento === s.codigo ? ' is-on' : ''}`}>
              <input type="radio" name="segmento" value={s.codigo} checked={segmento === s.codigo} onChange={() => setSegmento(s.codigo)} />
              <i className={`bx ${SEGMENTOS_ICONE[s.codigo]}`} aria-hidden="true" />
              <span>{s.nome}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="form-section">
        <span className="form-section__title">
          <i className="bx bx-text" aria-hidden="true" /> Como vocês chamam
        </span>
        <div className="form-grid form-grid--3">
          <Input label="Cliente" value={rot.cliente} maxLength={30} onChange={(e) => setRot({ ...rot, cliente: e.target.value })} hint="Ex.: Tutor, Paciente" />
          <Input label="Serviço" value={rot.servico} maxLength={30} onChange={(e) => setRot({ ...rot, servico: e.target.value })} hint="Ex.: Procedimento" />
          <Input label="Atendimento" value={rot.atendimento} maxLength={30} onChange={(e) => setRot({ ...rot, atendimento: e.target.value })} hint="Ex.: Sessão, Reunião" />
        </div>
      </div>
      {bloco('cliente', `Campos do ${rot.cliente.toLowerCase() || 'cliente'}`)}
      {bloco('atendimento', `Campos do ${rot.atendimento.toLowerCase() || 'atendimento'}`)}
      {erro && (
        <div className="callout callout--warning" role="alert">
          <i className="bx bx-error" aria-hidden="true" />
          <span>{erro}</span>
        </div>
      )}
      <div className="row">
        <Button type="submit" icon="bx-check" loading={salvar.isPending}>
          Salvar campos
        </Button>
        <Button variant="ghost" icon="bx-reset" onClick={() => setPreset(true)}>
          Restaurar padrão do segmento
        </Button>
      </div>
      <ConfirmDialog
        aberto={preset}
        onFechar={() => setPreset(false)}
        carregando={salvar.isPending}
        titulo="Restaurar padrão do segmento?"
        confirmar="Restaurar"
        mensagem="Rótulos e campos voltam ao modelo do segmento escolhido. Valores já preenchidos em clientes e atendimentos não são apagados."
        onConfirmar={() =>
          salvar.mutate(
            { segmento, aplicarPresetSegmento: true },
            {
              onSuccess: () => {
                setPreset(false);
                window.setTimeout(() => window.location.reload(), 400);
              },
            },
          )
        }
      />
    </form>
  );
}

function Plano({ cfg }: { cfg: Cfg }) {
  const todos = useQuery({ queryKey: ['public', 'plano'], queryFn: publicoApi.plano, staleTime: 300_000 });
  const contratados = new Set(cfg.modulos.map((m) => m.codigo));
  return (
    <section className="plano card card--pad" data-aos="fade-up">
      <div className="plano__topo">
        <div>
          <span className="text-xs muted">Mensalidade contratada</span>
          <strong className="plano__valor num">{brl(cfg.valorMensalCentavos)}</strong>
        </div>
        <Badge tom={cfg.status === 'ATIVO' ? 'success' : 'warning'}>{cfg.status === 'ATIVO' ? 'Assinatura ativa' : cfg.status.replace('_', ' ').toLowerCase()}</Badge>
      </div>
      <ul className="plano__modulos">
        {(todos.data?.modulos ?? cfg.modulos.map((m) => ({ codigo: m.codigo, nome: m.nome, descricao: null, precoCentavos: 0, obrigatorio: false }))).map((m) => (
          <li key={m.codigo} className={contratados.has(m.codigo as never) ? 'is-on' : ''}>
            <i className={`bx ${iconeModulo(m.codigo)}`} aria-hidden="true" />
            <span className="grow">
              <strong>{m.nome}</strong>
              {m.descricao && <small>{m.descricao}</small>}
            </span>
            {contratados.has(m.codigo as never) ? <Badge tom="success" icon="bx-check">Contratado</Badge> : <Badge>Disponível</Badge>}
          </li>
        ))}
      </ul>
      <p className="text-sm muted">Para adicionar ou remover módulos, fale com o suporte. O preço de quem já contratou fica congelado.</p>
    </section>
  );
}
