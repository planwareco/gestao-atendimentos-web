/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Backend simulado do modo demonstração.
 * Responde às mesmas rotas da gestao-atendimentos-api, no mesmo formato (envelope, paginação e erros),
 * aplicando as regras principais: conflito de agenda e encaixe, horários livres pelo expediente,
 * transições de status, comissão, orçamentos que viram atendimento e o resultado financeiro.
 * Tudo fica nesta aba do navegador.
 */
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type {
  Aniversariante,
  Atendimento,
  CamposExtras,
  Cliente,
  ClienteInativo,
  ClienteResumo,
  Comissoes,
  Configuracoes,
  Dashboard,
  DefinicaoCampo,
  Despesa,
  EmpresaSessao,
  Expediente,
  FormaPagamento,
  Orcamento,
  Papel,
  Permissao,
  Profissional,
  ResultadoFinanceiro,
  Segmento,
  Sessao,
  SessaoComToken,
  StatusAtendimento,
  UsuarioEquipe,
} from '@/api/types';
import { hojeISO, isoParaLocal, localParaIso, partesNoFuso, somarDias } from '@/lib/dates';
import { CATALOGOS } from './catalogos';
import {
  agoraISO,
  brlTexto,
  carregarDB,
  diaDaSemana,
  hhmm,
  minutos,
  MODULOS_PRECO,
  salvarDB,
  TZ,
  uid,
  type AtendimentoDB,
  type DB,
  type ItemAtendimentoDB,
  type OrcamentoDB,
  type ProfissionalDB,
} from './db';
import { segmentoDemo } from './modo';

/* ── Erros no formato da API ── */
class Falha extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors?: { field: string; message: string }[],
  ) {
    super(message);
  }
}
const DEMO_SO_EXEMPLO = 'Na demonstração isso fica só de exemplo. Crie sua conta grátis para usar de verdade.';
const naoEncontrado = (o = 'Registro') => new Falha(404, 'NAO_ENCONTRADO', `${o} não encontrado.`);
const validacao = (field: string, message: string) => new Falha(400, 'VALIDACAO', message, [{ field: `body.${field}`, message }]);

type Q = Record<string, any>;
interface Ctx {
  db: DB;
  params: Record<string, string>;
  query: Q;
  body: Q;
}
interface Resultado {
  data: unknown;
  meta?: unknown;
  status?: number;
  salvar?: boolean;
  blob?: Blob;
}

/* ── Permissões por papel (iguais às da API) ── */
const TODAS: Permissao[] = [
  'dashboard:ver', 'clientes:ler', 'clientes:escrever', 'servicos:ler', 'servicos:escrever', 'atendimentos:ler', 'atendimentos:escrever',
  'atendimentos:todos', 'agenda:ler', 'configuracoes:gerenciar', 'orcamentos:ler', 'orcamentos:escrever', 'despesas:ler', 'despesas:escrever',
  'financeiro:ver', 'profissionais:ler', 'profissionais:escrever', 'comissoes:ver', 'usuarios:gerenciar',
];
const PERMISSOES: Record<Papel, Permissao[]> = {
  PROPRIETARIO: TODAS,
  RECEPCIONISTA: ['clientes:ler', 'clientes:escrever', 'servicos:ler', 'atendimentos:ler', 'atendimentos:escrever', 'atendimentos:todos', 'agenda:ler', 'orcamentos:ler', 'orcamentos:escrever', 'profissionais:ler'],
  PROFISSIONAL: ['clientes:ler', 'servicos:ler', 'atendimentos:ler', 'atendimentos:escrever', 'agenda:ler'],
};
const MODULO_DA_PERMISSAO: Partial<Record<Permissao, string>> = {
  'orcamentos:ler': 'ORCAMENTOS',
  'orcamentos:escrever': 'ORCAMENTOS',
  'despesas:ler': 'FINANCEIRO',
  'despesas:escrever': 'FINANCEIRO',
  'financeiro:ver': 'FINANCEIRO',
  'profissionais:ler': 'MULTI_PROFISSIONAL',
  'profissionais:escrever': 'MULTI_PROFISSIONAL',
  'comissoes:ver': 'MULTI_PROFISSIONAL',
  'usuarios:gerenciar': 'MULTI_PROFISSIONAL',
};

const usuarioAtual = (db: DB) => db.usuarios.find((u) => u.id === db.usuarioAtualId)!;
const permissoes = (db: DB): Permissao[] => PERMISSOES[usuarioAtual(db).papel].filter((p) => !MODULO_DA_PERMISSAO[p] || db.empresa.modulos.includes(MODULO_DA_PERMISSAO[p] as never));
const pode = (db: DB, p: Permissao) => permissoes(db).includes(p);
const exigir = (db: DB, p: Permissao) => {
  if (!pode(db, p)) throw new Falha(403, 'PERMISSAO_NEGADA', 'Seu perfil não tem permissão para esta ação.');
};
/** Profissional só vê e mexe na própria agenda. */
const profissionalDoUsuario = (db: DB) => (pode(db, 'atendimentos:todos') ? null : usuarioAtual(db).profissionalId);

function sessao(db: DB): Sessao {
  const u = usuarioAtual(db);
  const e = db.empresa;
  const empresa: EmpresaSessao = {
    id: e.id,
    nome: e.nome,
    nomeFantasia: e.nomeFantasia,
    segmento: e.segmento,
    status: e.status,
    aparencia: e.aparencia,
    camposPersonalizados: e.camposPersonalizados,
    fusoHorario: e.fusoHorario,
    valorMensalCentavos: e.valorMensalCentavos,
    modulos: e.modulos,
  };
  return { usuario: { id: u.id, nome: u.nome, email: u.email, papel: u.papel, profissionalId: u.profissionalId }, empresa, permissoes: permissoes(db) };
}

/* ── Views ── */
const clienteDe = (db: DB, id: string) => db.clientes.find((c) => c.id === id);
const profDe = (db: DB, id: string | null) => (id ? db.profissionais.find((p) => p.id === id) : undefined);

function atendimentoView(db: DB, a: AtendimentoDB): Atendimento {
  const c = clienteDe(db, a.clienteId);
  const p = profDe(db, a.profissionalId);
  const { clienteId: _c, profissionalId: _p, criadoEm: _cr, ...resto } = a;
  return {
    ...resto,
    cliente: { id: a.clienteId, nome: c?.nome ?? 'Cliente removido', telefone: c?.telefone ?? null, whatsapp: c?.whatsapp ?? null },
    profissional: p ? { id: p.id, nome: p.nome, cor: p.cor } : null,
  };
}
function profissionalView(db: DB, p: ProfissionalDB): Profissional {
  const { servicoIds, ...resto } = p;
  return { ...resto, servicos: servicoIds.map((id) => db.servicos.find((s) => s.id === id)).filter(Boolean).map((s) => ({ id: s!.id, nome: s!.nome })) };
}
function orcamentoStatus(o: OrcamentoDB) {
  if ((o.status === 'ENVIADO' || o.status === 'RASCUNHO') && o.validade && o.validade < hojeISO(TZ)) return 'EXPIRADO' as const;
  return o.status;
}
function orcamentoView(db: DB, o: OrcamentoDB): Orcamento {
  const c = clienteDe(db, o.clienteId);
  const at = o.atendimentoId ? db.atendimentos.find((a) => a.id === o.atendimentoId) : null;
  const { clienteId: _c, atendimentoId: _a, ...resto } = o;
  return {
    ...resto,
    status: orcamentoStatus(o),
    cliente: { id: o.clienteId, nome: c?.nome ?? 'Cliente removido', email: c?.email ?? null, telefone: c?.telefone ?? null, whatsapp: c?.whatsapp ?? null, documento: c?.documento ?? null },
    atendimento: at ? { id: at.id, inicio: at.inicio, status: at.status } : null,
  };
}
function despesaView(db: DB, d: DB['despesas'][number]): Despesa {
  const c = db.categorias.find((x) => x.id === d.categoriaId);
  const { categoriaId: _c, ...resto } = d;
  return { ...resto, categoria: { id: d.categoriaId, nome: c?.nome ?? 'Sem categoria', cor: c?.cor ?? null } };
}
function usuarioView(db: DB, u: DB['usuarios'][number]): UsuarioEquipe {
  const p = profDe(db, u.profissionalId);
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, ativo: u.ativo, ultimoLoginEm: u.ultimoLoginEm, criadoEm: u.criadoEm, profissional: p ? { id: p.id, nome: p.nome } : null };
}
function configuracoesView(db: DB): Configuracoes {
  return { ...db.empresa, modulos: db.empresa.modulos.map((m) => ({ codigo: m, nome: MODULOS_PRECO[m].nome })) };
}

/* ── Utilidades ── */
function paginar<T>(lista: T[], q: Q, padrao = 20) {
  const page = Math.max(1, Number(q.page) || 1);
  const perPage = Math.min(200, Math.max(1, Number(q.perPage) || padrao));
  return { data: lista.slice((page - 1) * perPage, page * perPage), meta: { total: lista.length, page, perPage, totalPages: Math.max(1, Math.ceil(lista.length / perPage)) } };
}
const bool = (v: unknown) => (v === undefined || v === '' ? undefined : v === true || v === 'true');
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const contem = (alvo: string | null | undefined, termo: string) => Boolean(alvo) && norm(alvo!).includes(norm(termo));
const digitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const dataLocal = (iso: string) => isoParaLocal(iso, TZ).data;
const realizados = (db: DB) => db.atendimentos.filter((a) => a.status === 'REALIZADO');
const noPeriodo = (iso: string, inicio: string, fim: string) => {
  const d = dataLocal(iso);
  return d >= inicio && d <= fim;
};
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Campos personalizados obrigatórios e opções válidas. */
function conferirExtras(defs: DefinicaoCampo[] | undefined, extras: CamposExtras | undefined | null) {
  const erros: { field: string; message: string }[] = [];
  for (const d of defs ?? []) {
    const v = extras?.[d.chave];
    if (d.obrigatorio && (v === undefined || v === null || v === '')) erros.push({ field: `body.camposExtras.${d.chave}`, message: `${d.rotulo} é obrigatório.` });
    if (d.tipo === 'selecao' && v && d.opcoes && !d.opcoes.includes(String(v))) erros.push({ field: `body.camposExtras.${d.chave}`, message: `${d.rotulo}: escolha uma das opções.` });
  }
  if (erros.length) throw new Falha(422, 'CAMPOS_EXTRAS_INVALIDOS', 'Confira os campos personalizados.', erros);
}

/* ── Agenda: conflito e horários livres ── */
const sobrepoe = (a: { inicio: string; fim: string }, inicio: string, fim: string) => a.inicio < fim && a.fim > inicio;
function conflitos(db: DB, inicio: string, fim: string, profissionalId: string | null, ignorarId?: string) {
  return db.atendimentos.filter(
    (a) =>
      a.id !== ignorarId &&
      (a.status === 'AGENDADO' || a.status === 'CONFIRMADO') &&
      !a.encaixe &&
      (profissionalId ? a.profissionalId === profissionalId : true) &&
      sobrepoe(a, inicio, fim),
  );
}
function conferirConflito(db: DB, inicio: string, fim: string, profissionalId: string | null, encaixe: boolean, ignorarId?: string) {
  if (encaixe) return;
  const c = conflitos(db, inicio, fim, profissionalId, ignorarId)[0];
  if (c) {
    const cli = clienteDe(db, c.clienteId)?.nome ?? 'outro cliente';
    const ini = isoParaLocal(c.inicio, TZ).hora;
    const f = isoParaLocal(c.fim, TZ).hora;
    throw new Falha(409, 'AGENDA_CONFLITO', `Este horário bate com ${cli} (${ini} às ${f}). Escolha outro horário ou marque como encaixe.`);
  }
}

/** Monta os itens a partir dos serviços (preço e duração do cadastro, comissão do profissional). */
function montarItens(db: DB, itens: { servicoId: string; quantidade?: number; valorUnitarioCentavos?: number }[], prof: ProfissionalDB | undefined): ItemAtendimentoDB[] {
  if (!Array.isArray(itens) || !itens.length) throw validacao('itens', 'Escolha ao menos um serviço.');
  return itens.map((i) => {
    const s = db.servicos.find((x) => x.id === i.servicoId);
    if (!s) throw new Falha(422, 'SERVICO_INVALIDO', 'Um dos serviços não existe mais.');
    const qtd = Math.max(1, Number(i.quantidade) || 1);
    const unit = i.valorUnitarioCentavos != null ? Math.max(0, Math.round(Number(i.valorUnitarioCentavos))) : s.valorCentavos;
    const total = unit * qtd;
    return {
      id: uid(),
      servicoId: s.id,
      descricao: s.nome,
      quantidade: qtd,
      valorUnitarioCentavos: unit,
      totalCentavos: total,
      duracaoMinutos: s.duracaoMinutos * qtd,
      comissaoCentavos: prof ? Math.round((total * prof.comissaoBps) / 10000) : 0,
    };
  });
}

function totais(a: Pick<AtendimentoDB, 'itens' | 'descontoCentavos' | 'acrescimoCentavos'>) {
  const subtotal = a.itens.reduce((s, i) => s + i.totalCentavos, 0);
  if (a.descontoCentavos > subtotal) throw new Falha(422, 'DESCONTO_INVALIDO', 'O desconto não pode ser maior que o valor dos serviços.');
  return { subtotalCentavos: subtotal, totalCentavos: subtotal - a.descontoCentavos + a.acrescimoCentavos, comissaoTotalCentavos: a.itens.reduce((s, i) => s + i.comissaoCentavos, 0) };
}

const TRANSICOES: Record<StatusAtendimento, StatusAtendimento[]> = {
  AGENDADO: ['CONFIRMADO', 'REALIZADO', 'CANCELADO'],
  CONFIRMADO: ['AGENDADO', 'REALIZADO', 'CANCELADO'],
  REALIZADO: [],
  CANCELADO: ['AGENDADO'],
};

/* ── PDF simples do orçamento (gerado no navegador) ── */
function pdfSimples(linhas: string[]): Blob {
  const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const corpo = linhas
    .map((l, i) => {
      const [tam, texto] = l.startsWith('#') ? [18, l.slice(1)] : l.startsWith('*') ? [12, l.slice(1)] : [10, l];
      return `BT /F1 ${tam} Tf 50 ${790 - i * 18} Td (${esc(texto)}) Tj ET`;
    })
    .join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${corpo.length} >>\nstream\n${corpo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = Math.min(255, pdf.charCodeAt(i));
  return new Blob([bytes], { type: 'application/pdf' });
}

/* ── Rotas ── */
type Handler = (c: Ctx) => Resultado;
const rotas: [string, RegExp, Handler][] = [];
const rota = (metodo: string, caminho: string, h: Handler) => {
  const re = new RegExp(`^${caminho.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`);
  rotas.push([metodo, re, h]);
};
const ok = (data: unknown, extra: Omit<Resultado, 'data'> = {}): Resultado => ({ data, ...extra });
const mudou = (data: unknown, extra: Omit<Resultado, 'data'> = {}): Resultado => ({ data, salvar: true, ...extra });

// Sessão
rota('POST', '/auth/refresh', ({ db }) => ok({ ...sessao(db), accessToken: 'demo', tokenType: 'Bearer', expiresIn: '1h' } satisfies SessaoComToken));
rota('GET', '/auth/me', ({ db }) => ok(sessao(db)));
rota('POST', '/auth/logout', () => ok({ message: 'ok' }));
rota('POST', '/auth/login', () => {
  throw new Falha(400, 'DEMO', 'Você está na demonstração. Saia dela para entrar na sua conta.');
});
for (const [m, c] of [
  ['PUT', '/auth/senha'],
  ['POST', '/auth/checkout-link'],
] as const)
  rota(m, c, () => {
    throw new Falha(403, 'DEMO', DEMO_SO_EXEMPLO);
  });

// Público (usado dentro do sistema: segmentos e plano)
const NOMES_SEGMENTO: Record<Segmento, string> = {
  SALAO_BELEZA: 'Salão de beleza', BARBEARIA: 'Barbearia', ESTETICA: 'Estética', PETSHOP: 'Pet shop', FISIOTERAPIA: 'Fisioterapia', CONSULTORIA: 'Consultoria', OUTRO: 'Outro',
};
rota('GET', '/public/segmentos', () => ok((Object.keys(CATALOGOS) as Segmento[]).map((s) => ({ codigo: s, nome: NOMES_SEGMENTO[s], rotulos: CATALOGOS[s].camposPersonalizados.rotulos ?? {} }))));
const planoPublico = () => ({
  plano: { codigo: 'START', nome: 'Start', precoBaseCentavos: 4990, ativo: true },
  modulos: (Object.keys(MODULOS_PRECO) as (keyof typeof MODULOS_PRECO)[]).map((c) => ({ codigo: c, nome: MODULOS_PRECO[c].nome, descricao: null, precoCentavos: MODULOS_PRECO[c].precoCentavos, obrigatorio: c === 'NUCLEO' })),
});
rota('GET', '/public/plano', () => ok(planoPublico()));
rota('POST', '/public/plano/preco', ({ body }) => {
  const mods = (Object.keys(MODULOS_PRECO) as (keyof typeof MODULOS_PRECO)[]).filter((c) => c === 'NUCLEO' || lista(body.modulos).includes(c));
  const modulos = mods.map((c) => ({ codigo: c, nome: MODULOS_PRECO[c].nome, precoCentavos: MODULOS_PRECO[c].precoCentavos }));
  return ok({ plano: 'Start', precoBaseCentavos: 4990, modulos, totalCentavos: 4990 + modulos.reduce((a, m) => a + m.precoCentavos, 0) });
});

// Configurações
rota('GET', '/configuracoes', ({ db }) => {
  exigir(db, 'configuracoes:gerenciar');
  return ok(configuracoesView(db));
});
rota('PUT', '/configuracoes', ({ db, body: b }) => {
  exigir(db, 'configuracoes:gerenciar');
  const e = db.empresa;
  for (const k of ['nome', 'nomeFantasia', 'documento', 'email', 'telefone', 'whatsapp', 'fusoHorario', 'endereco'] as const) {
    if (b[k] !== undefined) (e as any)[k] = b[k];
  }
  if (b.nome !== undefined && String(b.nome).trim().length < 2) throw validacao('nome', 'Informe o nome da empresa.');
  if (b.aparencia) e.aparencia = { corPrimaria: '#0F2557', corSecundaria: '#2F6BFF', tema: 'claro', logoUrl: null, faviconUrl: null, ...(e.aparencia ?? {}), ...b.aparencia };
  if (b.camposPersonalizados) e.camposPersonalizados = { ...(e.camposPersonalizados ?? {}), ...b.camposPersonalizados };
  if (b.segmento) {
    e.segmento = b.segmento as Segmento;
    if (b.aplicarPresetSegmento) e.camposPersonalizados = CATALOGOS[e.segmento].camposPersonalizados;
  }
  return mudou(configuracoesView(db));
});

// Serviços
rota('GET', '/servicos/categorias', ({ db }) => ok([...new Set(db.servicos.map((s) => s.categoria).filter(Boolean))].sort()));
rota('GET', '/servicos', ({ db, query: q }) => {
  const l = db.servicos
    .filter((s) => !q.status || s.status === q.status)
    .filter((s) => !q.categoria || s.categoria === q.categoria)
    .filter((s) => !q.busca || contem(s.nome, String(q.busca)) || contem(s.categoria, String(q.busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const { data, meta } = paginar(l, q);
  return ok(data, { meta });
});
const servico = (db: DB, id: string) => db.servicos.find((s) => s.id === id) ?? (() => { throw naoEncontrado('Serviço'); })();
function validarServico(b: Q, parcial: boolean) {
  if ((!parcial || b.nome !== undefined) && String(b.nome ?? '').trim().length < 2) throw validacao('nome', 'Informe o nome.');
  if ((!parcial || b.valorCentavos !== undefined) && !(Number(b.valorCentavos) >= 0)) throw validacao('valorCentavos', 'Informe o valor.');
  if ((!parcial || b.duracaoMinutos !== undefined) && !(Number(b.duracaoMinutos) >= 5)) throw validacao('duracaoMinutos', 'A duração mínima é de 5 minutos.');
}
rota('GET', '/servicos/:id', ({ db, params }) => ok(servico(db, params.id)));
rota('POST', '/servicos', ({ db, body: b }) => {
  exigir(db, 'servicos:escrever');
  validarServico(b, false);
  const s = { id: uid(), nome: String(b.nome).trim(), descricao: b.descricao ?? null, categoria: b.categoria || null, valorCentavos: Number(b.valorCentavos), duracaoMinutos: Number(b.duracaoMinutos), status: b.status ?? 'ATIVO' };
  db.servicos.push(s);
  return mudou(s, { status: 201 });
});
rota('PUT', '/servicos/:id', ({ db, params, body: b }) => {
  exigir(db, 'servicos:escrever');
  validarServico(b, true);
  const s = servico(db, params.id);
  Object.assign(s, Object.fromEntries(Object.entries(b).filter(([k]) => ['nome', 'descricao', 'categoria', 'valorCentavos', 'duracaoMinutos', 'status'].includes(k))));
  return mudou(s);
});
rota('DELETE', '/servicos/:id', ({ db, params }) => {
  exigir(db, 'servicos:escrever');
  const s = servico(db, params.id);
  if (db.atendimentos.some((a) => a.itens.some((i) => i.servicoId === s.id))) throw new Falha(409, 'SERVICO_EM_USO', 'Este serviço já foi usado em atendimentos. Desative em vez de excluir.');
  db.servicos = db.servicos.filter((x) => x.id !== s.id);
  return mudou(null, { status: 204 });
});

// Profissionais
rota('GET', '/profissionais', ({ db, query: q }) => {
  exigir(db, 'profissionais:ler');
  const l = db.profissionais
    .filter((p) => !q.status || p.status === q.status)
    .filter((p) => !q.servicoId || p.servicoIds.includes(String(q.servicoId)))
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((p) => profissionalView(db, p));
  const { data, meta } = paginar(l, q);
  return ok(data, { meta });
});
const profissional = (db: DB, id: string) => db.profissionais.find((p) => p.id === id) ?? (() => { throw naoEncontrado('Profissional'); })();
rota('GET', '/profissionais/:id', ({ db, params }) => ok(profissionalView(db, profissional(db, params.id))));
function aplicarProfissional(p: ProfissionalDB, b: Q) {
  if (b.nome !== undefined) {
    if (String(b.nome).trim().length < 2) throw validacao('nome', 'Informe o nome.');
    p.nome = String(b.nome).trim();
  }
  for (const k of ['email', 'telefone', 'cor', 'status', 'usuarioId'] as const) if (b[k] !== undefined) (p as any)[k] = b[k];
  if (b.comissaoBps !== undefined) {
    const v = Number(b.comissaoBps);
    if (!(v >= 0 && v <= 10000)) throw validacao('comissaoBps', 'A comissão vai de 0% a 100%.');
    p.comissaoBps = v;
  }
  if (b.horarioTrabalho !== undefined) p.horarioTrabalho = b.horarioTrabalho as Expediente;
  if (b.servicoIds !== undefined) p.servicoIds = lista(b.servicoIds);
}
rota('POST', '/profissionais', ({ db, body: b }) => {
  exigir(db, 'profissionais:escrever');
  if (String(b.nome ?? '').trim().length < 2) throw validacao('nome', 'Informe o nome.');
  const p: ProfissionalDB = { id: uid(), nome: '', email: null, telefone: null, cor: null, comissaoBps: 0, horarioTrabalho: null, status: 'ATIVO', usuarioId: null, servicoIds: [] };
  aplicarProfissional(p, b);
  db.profissionais.push(p);
  return mudou(profissionalView(db, p), { status: 201 });
});
rota('PUT', '/profissionais/:id', ({ db, params, body: b }) => {
  exigir(db, 'profissionais:escrever');
  const p = profissional(db, params.id);
  aplicarProfissional(p, b);
  return mudou(profissionalView(db, p));
});
rota('DELETE', '/profissionais/:id', ({ db, params }) => {
  exigir(db, 'profissionais:escrever');
  const p = profissional(db, params.id);
  if (db.atendimentos.some((a) => a.profissionalId === p.id)) throw new Falha(409, 'PROFISSIONAL_COM_HISTORICO', 'Este profissional tem atendimentos no histórico. Desative em vez de excluir.');
  db.profissionais = db.profissionais.filter((x) => x.id !== p.id);
  return mudou(null, { status: 204 });
});

// Clientes
const cliente = (db: DB, id: string) => clienteDe(db, id) ?? (() => { throw naoEncontrado('Cliente'); })();
rota('GET', '/clientes/aniversariantes', ({ db, query }) => {
  const dias = Number(query.dias) || 7;
  const hoje = hojeISO(TZ);
  const janela = Array.from({ length: dias + 1 }, (_, i) => somarDias(hoje, i).slice(5));
  const l: Aniversariante[] = db.clientes
    .filter((c) => c.status === 'ATIVO' && c.dataNascimento && janela.includes(c.dataNascimento.slice(5)))
    .sort((a, b) => janela.indexOf(a.dataNascimento!.slice(5)) - janela.indexOf(b.dataNascimento!.slice(5)))
    .map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone, whatsapp: c.whatsapp, email: c.email, dataNascimento: c.dataNascimento! }));
  return ok(l);
});
rota('GET', '/clientes/inativos', ({ db, query }) => {
  const dias = Number(query.dias) || 60;
  const corte = somarDias(hojeISO(TZ), -dias);
  const l: ClienteInativo[] = [];
  for (const c of db.clientes.filter((x) => x.status === 'ATIVO')) {
    const feitos = realizados(db).filter((a) => a.clienteId === c.id);
    const futuros = db.atendimentos.some((a) => a.clienteId === c.id && (a.status === 'AGENDADO' || a.status === 'CONFIRMADO'));
    if (!feitos.length || futuros) continue;
    const ultimo = feitos[feitos.length - 1].inicio;
    if (dataLocal(ultimo) >= corte) continue;
    l.push({ id: c.id, nome: c.nome, telefone: c.telefone, whatsapp: c.whatsapp, ultimoAtendimento: ultimo, totalAtendimentos: feitos.length, frequenciaMediaDias: frequencia(feitos) });
  }
  return ok(l.sort((a, b) => b.ultimoAtendimento.localeCompare(a.ultimoAtendimento)));
});
function frequencia(feitos: AtendimentoDB[]) {
  if (feitos.length < 2) return null;
  const dias = (Date.parse(feitos[feitos.length - 1].inicio) - Date.parse(feitos[0].inicio)) / 86_400_000;
  return Math.round(dias / (feitos.length - 1));
}
rota('GET', '/clientes', ({ db, query: q }) => {
  exigir(db, 'clientes:ler');
  const termo = String(q.busca ?? '').trim();
  const d = digitos(termo);
  const l = db.clientes
    .filter((c) => !q.status || c.status === q.status)
    .filter((c) => !termo || contem(c.nome, termo) || contem(c.email, termo) || (d.length >= 3 && (digitos(c.whatsapp).includes(d) || digitos(c.telefone).includes(d))) || Object.values(c.camposExtras ?? {}).some((v) => contem(String(v ?? ''), termo)))
    .sort((a, b) => (q.ordenar === 'recentes' ? b.criadoEm.localeCompare(a.criadoEm) : a.nome.localeCompare(b.nome)));
  const { data, meta } = paginar(l, q);
  return ok(data, { meta });
});
rota('GET', '/clientes/:id', ({ db, params }) => ok(cliente(db, params.id)));
const CAMPOS_CLIENTE = ['nome', 'telefone', 'whatsapp', 'email', 'documento', 'dataNascimento', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'observacoes', 'status', 'camposExtras'] as const;
function aplicarCliente(db: DB, c: Cliente, b: Q, novo: boolean) {
  if ((novo || b.nome !== undefined) && String(b.nome ?? '').trim().length < 2) throw validacao('nome', 'Informe o nome.');
  if (b.email && !/^\S+@\S+\.\S+$/.test(String(b.email))) throw validacao('email', 'E-mail inválido.');
  if (novo || b.camposExtras !== undefined) conferirExtras(db.empresa.camposPersonalizados?.cliente, b.camposExtras ?? c.camposExtras);
  for (const k of CAMPOS_CLIENTE) if (b[k] !== undefined) (c as any)[k] = typeof b[k] === 'string' ? String(b[k]).trim() || null : b[k];
  if (c.nome) c.nome = c.nome.trim();
  c.atualizadoEm = agoraISO();
}
rota('POST', '/clientes', ({ db, body: b }) => {
  exigir(db, 'clientes:escrever');
  const agora = agoraISO();
  const c: Cliente = {
    id: uid(), nome: '', telefone: null, whatsapp: null, email: null, documento: null, dataNascimento: null, cep: null, logradouro: null, numero: null,
    complemento: null, bairro: null, cidade: null, estado: null, observacoes: null, status: 'ATIVO', camposExtras: null, criadoEm: agora, atualizadoEm: agora,
  };
  aplicarCliente(db, c, b, true);
  db.clientes.push(c);
  return mudou(c, { status: 201 });
});
rota('PUT', '/clientes/:id', ({ db, params, body: b }) => {
  exigir(db, 'clientes:escrever');
  const c = cliente(db, params.id);
  aplicarCliente(db, c, b, false);
  return mudou(c);
});
rota('DELETE', '/clientes/:id', ({ db, params }) => {
  exigir(db, 'clientes:escrever');
  const c = cliente(db, params.id);
  if (db.atendimentos.some((a) => a.clienteId === c.id) || db.orcamentos.some((o) => o.clienteId === c.id)) {
    throw new Falha(409, 'CLIENTE_COM_HISTORICO', 'Este cliente tem histórico. Desative em vez de excluir.');
  }
  db.clientes = db.clientes.filter((x) => x.id !== c.id);
  return mudou(null, { status: 204 });
});
rota('GET', '/clientes/:id/resumo', ({ db, params }) => {
  const c = cliente(db, params.id);
  const todos = db.atendimentos.filter((a) => a.clienteId === c.id);
  const feitos = todos.filter((a) => a.status === 'REALIZADO');
  const gasto = feitos.reduce((s, a) => s + a.totalCentavos, 0);
  const ultimo = feitos.length ? feitos[feitos.length - 1].inicio : null;
  const diasDesde = ultimo ? Math.floor((Date.now() - Date.parse(ultimo)) / 86_400_000) : null;
  const freq = frequencia(feitos);
  const prox = todos.filter((a) => (a.status === 'AGENDADO' || a.status === 'CONFIRMADO') && a.inicio > agoraISO()).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const r: ClienteResumo = {
    cliente: { id: c.id, nome: c.nome, status: c.status },
    totalGastoCentavos: gasto,
    atendimentosRealizados: feitos.length,
    atendimentosCancelados: todos.filter((a) => a.status === 'CANCELADO').length,
    ticketMedioCentavos: feitos.length ? Math.round(gasto / feitos.length) : 0,
    ultimoAtendimento: ultimo,
    diasDesdeUltimo: diasDesde,
    frequenciaMediaDias: freq,
    situacaoRetorno: diasDesde == null || freq == null ? null : diasDesde <= freq ? 'EM_DIA' : diasDesde <= freq * 1.5 ? 'PROVAVEL_RETORNO' : 'ATRASADO',
    proximoAtendimento: prox ? { id: prox.id, inicio: prox.inicio, status: prox.status } : null,
  };
  return ok(r);
});
rota('GET', '/clientes/:id/historico', ({ db, params, query: q }) => {
  const c = cliente(db, params.id);
  const prof = profissionalDoUsuario(db);
  const l = db.atendimentos
    .filter((a) => a.clienteId === c.id && (!q.status || a.status === q.status) && (!prof || a.profissionalId === prof))
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .map((a) => atendimentoView(db, a));
  const { data, meta } = paginar(l, q, 10);
  return ok(data, { meta });
});

// Agenda e atendimentos
function filtrarAtendimentos(db: DB, q: Q) {
  const prof = profissionalDoUsuario(db);
  const status = lista(q.status);
  return db.atendimentos.filter(
    (a) =>
      (!q.inicio || a.fim > String(q.inicio)) &&
      (!q.fim || a.inicio < String(q.fim)) &&
      (!status.length || status.includes(a.status)) &&
      (!q.clienteId || a.clienteId === q.clienteId) &&
      (!q.profissionalId || a.profissionalId === q.profissionalId) &&
      (!prof || a.profissionalId === prof),
  );
}
rota('GET', '/agenda', ({ db, query: q }) => {
  exigir(db, 'agenda:ler');
  const incluir = bool(q.incluirCancelados);
  const l = filtrarAtendimentos(db, q)
    .filter((a) => incluir || a.status !== 'CANCELADO')
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((a) => atendimentoView(db, a));
  return ok(l);
});
rota('GET', '/agenda/horarios-livres', ({ db, query: q }) => {
  const data = String(q.data);
  const servicoIds = lista(q.servicoIds);
  const duracao = Number(q.duracaoMinutos) || servicoIds.reduce((s, id) => s + (db.servicos.find((x) => x.id === id)?.duracaoMinutos ?? 0), 0) || 30;
  const passo = Number(q.passoMinutos) || 15;
  const profId = profissionalDoUsuario(db) ?? (q.profissionalId ? String(q.profissionalId) : null);
  const dow = String(diaDaSemana(data)) as keyof Expediente;
  const turnos = (profId ? profDe(db, profId)?.horarioTrabalho : null)?.[dow] ?? (profId ? [] : [
    { inicio: '08:00', fim: '12:00' },
    { inicio: '13:00', fim: '19:00' },
  ]);
  const horarios: { inicio: string; fim: string }[] = [];
  const agora = agoraISO();
  for (const t of turnos) {
    for (let m = minutos(t.inicio); m + duracao <= minutos(t.fim); m += passo) {
      const inicio = localParaIso(data, hhmm(m), TZ);
      const fim = localParaIso(data, hhmm(m + duracao), TZ);
      if (inicio < agora) continue;
      const ocupado = profId
        ? conflitos(db, inicio, fim, profId).length > 0
        : db.profissionais.filter((p) => p.status === 'ATIVO').every((p) => conflitos(db, inicio, fim, p.id).length > 0);
      if (!ocupado) horarios.push({ inicio, fim });
    }
  }
  return ok({ data, profissionalId: profId, duracaoMinutos: duracao, horarios });
});
rota('GET', '/atendimentos', ({ db, query: q }) => {
  exigir(db, 'atendimentos:ler');
  const l = filtrarAtendimentos(db, q)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .map((a) => atendimentoView(db, a));
  const { data, meta } = paginar(l, q);
  return ok(data, { meta });
});
const atendimento = (db: DB, id: string) => {
  const a = db.atendimentos.find((x) => x.id === id);
  const prof = profissionalDoUsuario(db);
  if (!a || (prof && a.profissionalId !== prof)) throw naoEncontrado('Atendimento');
  return a;
};
rota('GET', '/atendimentos/:id', ({ db, params }) => ok(atendimentoView(db, atendimento(db, params.id))));

function salvarAtendimento(db: DB, a: AtendimentoDB | null, b: Q): AtendimentoDB {
  const novo = !a;
  const forcado = profissionalDoUsuario(db);
  const clienteId = b.clienteId ?? a?.clienteId;
  if (!clienteId || !clienteDe(db, clienteId)) throw validacao('clienteId', 'Escolha o cliente.');
  let profissionalId: string | null = forcado ?? (b.profissionalId !== undefined ? b.profissionalId || null : (a?.profissionalId ?? null));
  if (!profissionalId && db.empresa.modulos.includes('MULTI_PROFISSIONAL') === false) profissionalId = null;
  const prof = profDe(db, profissionalId);
  if (profissionalId && !prof) throw validacao('profissionalId', 'Profissional não encontrado.');
  const inicio = b.inicio ?? a?.inicio;
  if (!inicio) throw validacao('inicio', 'Informe a data e a hora.');
  const itens = b.itens ? montarItens(db, b.itens, prof) : a!.itens.map((i) => ({ ...i, comissaoCentavos: prof ? Math.round((i.totalCentavos * prof.comissaoBps) / 10000) : 0 }));
  const duracao = itens.reduce((s, i) => s + i.duracaoMinutos, 0);
  // Remarcar sem informar o fim mantém a duração atual
  const duracaoAtual = a ? Date.parse(a.fim) - Date.parse(a.inicio) : duracao * 60_000;
  const fim = b.fim ?? (b.itens ? new Date(Date.parse(inicio) + duracao * 60_000).toISOString() : new Date(Date.parse(inicio) + duracaoAtual).toISOString());
  if (fim <= inicio) throw validacao('fim', 'O término precisa ser depois do início.');
  const encaixe = b.encaixe ?? a?.encaixe ?? false;
  const status: StatusAtendimento = novo ? (b.status ?? 'AGENDADO') : a!.status;
  if (!novo && (status === 'REALIZADO' || status === 'CANCELADO') && (b.inicio || b.fim)) throw new Falha(409, 'TRANSICAO_INVALIDA', 'Atendimento realizado ou cancelado não pode ser remarcado.');
  if (status !== 'REALIZADO') conferirConflito(db, inicio, fim, profissionalId, Boolean(encaixe), a?.id);
  if (b.camposExtras !== undefined || novo) conferirExtras(db.empresa.camposPersonalizados?.atendimento, b.camposExtras ?? a?.camposExtras);
  if (novo && status === 'REALIZADO' && !b.formaPagamento) throw validacao('formaPagamento', 'Informe como o cliente pagou.');

  const base: AtendimentoDB = a ?? {
    id: uid(), clienteId, profissionalId, inicio, fim, status, encaixe: false, observacoes: null, subtotalCentavos: 0, descontoCentavos: 0, acrescimoCentavos: 0,
    totalCentavos: 0, comissaoTotalCentavos: 0, formaPagamento: null, camposExtras: null, confirmadoEm: null, realizadoEm: null, canceladoEm: null,
    motivoCancelamento: null, orcamentoId: null, criadoEm: agoraISO(), itens: [],
  };
  Object.assign(base, {
    clienteId,
    profissionalId,
    inicio,
    fim,
    encaixe: Boolean(encaixe),
    itens,
    descontoCentavos: b.descontoCentavos !== undefined ? Math.max(0, Number(b.descontoCentavos) || 0) : base.descontoCentavos,
    acrescimoCentavos: b.acrescimoCentavos !== undefined ? Math.max(0, Number(b.acrescimoCentavos) || 0) : base.acrescimoCentavos,
    observacoes: b.observacoes !== undefined ? b.observacoes || null : base.observacoes,
    camposExtras: b.camposExtras !== undefined ? b.camposExtras : base.camposExtras,
    formaPagamento: b.formaPagamento !== undefined ? b.formaPagamento : base.formaPagamento,
  });
  Object.assign(base, totais(base));
  if (novo) {
    if (status === 'CONFIRMADO') base.confirmadoEm = agoraISO();
    if (status === 'REALIZADO') base.realizadoEm = agoraISO();
    db.atendimentos.push(base);
  }
  return base;
}
rota('POST', '/atendimentos', ({ db, body }) => {
  exigir(db, 'atendimentos:escrever');
  return mudou(atendimentoView(db, salvarAtendimento(db, null, body)), { status: 201 });
});
rota('PUT', '/atendimentos/:id', ({ db, params, body }) => {
  exigir(db, 'atendimentos:escrever');
  return mudou(atendimentoView(db, salvarAtendimento(db, atendimento(db, params.id), body)));
});
rota('PATCH', '/atendimentos/:id/status', ({ db, params, body: b }) => {
  exigir(db, 'atendimentos:escrever');
  const a = atendimento(db, params.id);
  const para = b.status as StatusAtendimento;
  if (!TRANSICOES[a.status].includes(para)) throw new Falha(409, 'TRANSICAO_INVALIDA', 'Esse atendimento já mudou de situação. Atualizamos a tela.');
  if (para === 'REALIZADO' && !b.formaPagamento && !a.formaPagamento) throw validacao('formaPagamento', 'Informe como o cliente pagou.');
  if (para === 'AGENDADO' && a.status === 'CANCELADO') conferirConflito(db, a.inicio, a.fim, a.profissionalId, a.encaixe, a.id);
  a.status = para;
  const agora = agoraISO();
  if (para === 'CONFIRMADO') a.confirmadoEm = agora;
  if (para === 'REALIZADO') {
    a.realizadoEm = agora;
    a.formaPagamento = (b.formaPagamento as FormaPagamento) ?? a.formaPagamento;
  }
  if (para === 'CANCELADO') {
    a.canceladoEm = agora;
    a.motivoCancelamento = b.motivo ? String(b.motivo).trim() : null;
  }
  if (para === 'AGENDADO') {
    a.canceladoEm = null;
    a.motivoCancelamento = null;
  }
  return mudou(atendimentoView(db, a));
});

// Orçamentos
const orcamento = (db: DB, id: string) => db.orcamentos.find((o) => o.id === id) ?? (() => { throw naoEncontrado('Orçamento'); })();
rota('GET', '/orcamentos', ({ db, query: q }) => {
  exigir(db, 'orcamentos:ler');
  const l = db.orcamentos
    .filter((o) => (!q.status || orcamentoStatus(o) === q.status) && (!q.clienteId || o.clienteId === q.clienteId) && (!q.numero || o.numero === Number(q.numero)))
    .sort((a, b) => b.numero - a.numero)
    .map((o) => orcamentoView(db, o));
  const { data, meta } = paginar(l, q);
  return ok(data, { meta });
});
rota('GET', '/orcamentos/:id', ({ db, params }) => ok(orcamentoView(db, orcamento(db, params.id))));
function aplicarOrcamento(db: DB, o: OrcamentoDB, b: Q) {
  if (b.clienteId !== undefined) {
    if (!clienteDe(db, b.clienteId)) throw validacao('clienteId', 'Escolha o cliente.');
    o.clienteId = b.clienteId;
  }
  if (b.data !== undefined) o.data = String(b.data).slice(0, 10);
  if (b.validade !== undefined) o.validade = b.validade || null;
  if (b.observacoes !== undefined) o.observacoes = b.observacoes || null;
  if (b.descontoCentavos !== undefined) o.descontoCentavos = Math.max(0, Number(b.descontoCentavos) || 0);
  if (b.acrescimoCentavos !== undefined) o.acrescimoCentavos = Math.max(0, Number(b.acrescimoCentavos) || 0);
  if (b.itens !== undefined) {
    if (!Array.isArray(b.itens) || !b.itens.length) throw validacao('itens', 'Adicione ao menos um item.');
    o.itens = b.itens.map((i: Q) => {
      const s = i.servicoId ? db.servicos.find((x) => x.id === i.servicoId) : undefined;
      const descricao = String(i.descricao ?? s?.nome ?? '').trim();
      if (!descricao) throw validacao('itens', 'Cada item precisa de uma descrição.');
      const qtd = Math.max(1, Number(i.quantidade) || 1);
      const unit = i.valorUnitarioCentavos != null ? Math.max(0, Number(i.valorUnitarioCentavos)) : (s?.valorCentavos ?? 0);
      return { id: uid(), servicoId: s?.id ?? null, descricao, quantidade: qtd, valorUnitarioCentavos: unit, totalCentavos: unit * qtd };
    });
  }
  o.subtotalCentavos = o.itens.reduce((s, i) => s + i.totalCentavos, 0);
  if (o.descontoCentavos > o.subtotalCentavos) throw new Falha(422, 'DESCONTO_INVALIDO', 'O desconto não pode ser maior que o subtotal.');
  o.totalCentavos = o.subtotalCentavos - o.descontoCentavos + o.acrescimoCentavos;
}
rota('POST', '/orcamentos', ({ db, body }) => {
  exigir(db, 'orcamentos:escrever');
  const hoje = hojeISO(TZ);
  const o: OrcamentoDB = {
    id: uid(), numero: db.proximoOrcamento++, clienteId: '', data: hoje, validade: somarDias(hoje, 15), observacoes: null, subtotalCentavos: 0,
    descontoCentavos: 0, acrescimoCentavos: 0, totalCentavos: 0, status: 'RASCUNHO', enviadoEm: null, aprovadoEm: null, recusadoEm: null, atendimentoId: null, itens: [],
  };
  if (!body.clienteId) throw validacao('clienteId', 'Escolha o cliente.');
  aplicarOrcamento(db, o, { itens: [], ...body });
  db.orcamentos.push(o);
  return mudou(orcamentoView(db, o), { status: 201 });
});
rota('PUT', '/orcamentos/:id', ({ db, params, body }) => {
  exigir(db, 'orcamentos:escrever');
  const o = orcamento(db, params.id);
  if (o.status === 'APROVADO' || o.status === 'RECUSADO') throw new Falha(409, 'ORCAMENTO_NAO_EDITAVEL', 'Orçamento aprovado ou recusado não pode ser editado.');
  aplicarOrcamento(db, o, body);
  return mudou(orcamentoView(db, o));
});
rota('PATCH', '/orcamentos/:id/status', ({ db, params, body }) => {
  exigir(db, 'orcamentos:escrever');
  const o = orcamento(db, params.id);
  const agora = agoraISO();
  o.status = body.status;
  if (body.status === 'ENVIADO') o.enviadoEm = agora;
  if (body.status === 'APROVADO') o.aprovadoEm = agora;
  if (body.status === 'RECUSADO') o.recusadoEm = agora;
  if (body.status === 'RASCUNHO') {
    o.enviadoEm = null;
    o.aprovadoEm = null;
    o.recusadoEm = null;
  }
  return mudou(orcamentoView(db, o));
});
rota('DELETE', '/orcamentos/:id', ({ db, params }) => {
  exigir(db, 'orcamentos:escrever');
  const o = orcamento(db, params.id);
  if (o.atendimentoId) throw new Falha(409, 'ORCAMENTO_JA_CONVERTIDO', 'Este orçamento já virou atendimento.');
  db.orcamentos = db.orcamentos.filter((x) => x.id !== o.id);
  return mudou(null, { status: 204 });
});
rota('POST', '/orcamentos/:id/converter', ({ db, params, body: b }) => {
  exigir(db, 'atendimentos:escrever');
  const o = orcamento(db, params.id);
  if (o.atendimentoId) throw new Falha(409, 'ORCAMENTO_JA_CONVERTIDO', 'Este orçamento já virou atendimento.');
  if (o.itens.some((i) => !i.servicoId)) throw new Falha(422, 'ORCAMENTO_ITEM_SEM_SERVICO', 'Há itens sem serviço vinculado.');
  const a = salvarAtendimento(db, null, {
    clienteId: o.clienteId,
    profissionalId: b.profissionalId,
    inicio: b.inicio,
    encaixe: b.encaixe,
    observacoes: b.observacoes ?? `Do orçamento #${o.numero}`,
    itens: o.itens.map((i) => ({ servicoId: i.servicoId, quantidade: i.quantidade, valorUnitarioCentavos: i.valorUnitarioCentavos })),
    descontoCentavos: o.descontoCentavos,
    acrescimoCentavos: o.acrescimoCentavos,
  });
  a.orcamentoId = o.id;
  o.atendimentoId = a.id;
  if (o.status !== 'APROVADO') {
    o.status = 'APROVADO';
    o.aprovadoEm = agoraISO();
  }
  return mudou(atendimentoView(db, a), { status: 201 });
});
rota('GET', '/orcamentos/:id/pdf', ({ db, params }) => {
  const o = orcamentoView(db, orcamento(db, params.id));
  const e = db.empresa;
  const linhas = [
    `#${e.nomeFantasia ?? e.nome}`,
    `*Orçamento nº ${o.numero}`,
    `Data: ${o.data.split('-').reverse().join('/')}${o.validade ? `   Válido até: ${o.validade.split('-').reverse().join('/')}` : ''}`,
    `${CATALOGOS[e.segmento].camposPersonalizados.rotulos?.cliente ?? 'Cliente'}: ${o.cliente.nome}`,
    '',
    '*Itens',
    ...o.itens.map((i) => `${i.quantidade} x ${i.descricao}  -  ${brlTexto(i.totalCentavos)}`),
    '',
    `Subtotal: ${brlTexto(o.subtotalCentavos)}`,
    ...(o.descontoCentavos ? [`Desconto: -${brlTexto(o.descontoCentavos)}`] : []),
    `*Total: ${brlTexto(o.totalCentavos)}`,
    '',
    ...(o.observacoes ? [`Observações: ${o.observacoes}`] : []),
    '',
    'Documento de exemplo gerado na demonstração do Simbora Gerir.',
  ];
  return { data: null, blob: pdfSimples(linhas) };
});

// Despesas
rota('GET', '/despesas/categorias', ({ db, query }) => ok(db.categorias.filter((c) => bool(query.incluirInativas) || c.ativo).sort((a, b) => a.nome.localeCompare(b.nome))));
rota('POST', '/despesas/categorias', ({ db, body }) => {
  exigir(db, 'despesas:escrever');
  if (String(body.nome ?? '').trim().length < 2) throw validacao('nome', 'Informe o nome.');
  if (db.categorias.some((c) => norm(c.nome) === norm(String(body.nome)))) throw new Falha(409, 'CATEGORIA_DUPLICADA', 'Já existe uma categoria com esse nome.');
  const c = { id: uid(), nome: String(body.nome).trim(), cor: body.cor ?? null, ativo: true };
  db.categorias.push(c);
  return mudou(c, { status: 201 });
});
rota('PUT', '/despesas/categorias/:id', ({ db, params, body }) => {
  exigir(db, 'despesas:escrever');
  const c = db.categorias.find((x) => x.id === params.id);
  if (!c) throw naoEncontrado('Categoria');
  Object.assign(c, Object.fromEntries(Object.entries(body).filter(([k]) => ['nome', 'cor', 'ativo'].includes(k))));
  return mudou(c);
});
rota('DELETE', '/despesas/categorias/:id', ({ db, params }) => {
  exigir(db, 'despesas:escrever');
  if (db.despesas.some((d) => d.categoriaId === params.id)) throw new Falha(409, 'CATEGORIA_EM_USO', 'Esta categoria tem despesas.');
  db.categorias = db.categorias.filter((x) => x.id !== params.id);
  return mudou(null, { status: 204 });
});
rota('GET', '/despesas', ({ db, query: q }) => {
  exigir(db, 'despesas:ler');
  const l = db.despesas
    .filter((d) => (!q.inicio || d.data >= q.inicio) && (!q.fim || d.data <= q.fim) && (!q.categoriaId || d.categoriaId === q.categoriaId) && (!q.status || d.status === q.status) && (!q.busca || contem(d.descricao, String(q.busca))))
    .sort((a, b) => b.data.localeCompare(a.data));
  const { data, meta } = paginar(l, q);
  return ok(data.map((d) => despesaView(db, d)), { meta: { ...meta, totalValorCentavos: l.reduce((s, d) => s + d.valorCentavos, 0) } });
});
const despesa = (db: DB, id: string) => db.despesas.find((d) => d.id === id) ?? (() => { throw naoEncontrado('Despesa'); })();
rota('GET', '/despesas/:id', ({ db, params }) => ok(despesaView(db, despesa(db, params.id))));
function aplicarDespesa(db: DB, d: DB['despesas'][number], b: Q, novo: boolean) {
  if ((novo || b.categoriaId !== undefined) && !db.categorias.some((c) => c.id === b.categoriaId)) throw validacao('categoriaId', 'Escolha a categoria.');
  if ((novo || b.descricao !== undefined) && String(b.descricao ?? '').trim().length < 2) throw validacao('descricao', 'Informe a descrição.');
  if ((novo || b.valorCentavos !== undefined) && !(Number(b.valorCentavos) > 0)) throw validacao('valorCentavos', 'Informe o valor.');
  for (const k of ['categoriaId', 'descricao', 'valorCentavos', 'data', 'formaPagamento', 'observacao', 'status'] as const) if (b[k] !== undefined) (d as any)[k] = b[k] === '' ? null : b[k];
}
rota('POST', '/despesas', ({ db, body }) => {
  exigir(db, 'despesas:escrever');
  const d = { id: uid(), categoriaId: '', descricao: '', valorCentavos: 0, data: hojeISO(TZ), formaPagamento: null, observacao: null, status: 'PAGA' as const };
  aplicarDespesa(db, d, body, true);
  db.despesas.push(d);
  return mudou(despesaView(db, d), { status: 201 });
});
rota('PUT', '/despesas/:id', ({ db, params, body }) => {
  exigir(db, 'despesas:escrever');
  const d = despesa(db, params.id);
  aplicarDespesa(db, d, body, false);
  return mudou(despesaView(db, d));
});
rota('DELETE', '/despesas/:id', ({ db, params }) => {
  exigir(db, 'despesas:escrever');
  despesa(db, params.id);
  db.despesas = db.despesas.filter((x) => x.id !== params.id);
  return mudou(null, { status: 204 });
});

// Dashboard e financeiro
function porCategoria(db: DB, inicio: string, fim: string) {
  const m = new Map<string, { categoriaId: string; nome: string; cor: string | null; totalCentavos: number; quantidade: number }>();
  for (const d of db.despesas.filter((x) => x.status === 'PAGA' && x.data >= inicio && x.data <= fim)) {
    const c = db.categorias.find((x) => x.id === d.categoriaId);
    const v = m.get(d.categoriaId) ?? { categoriaId: d.categoriaId, nome: c?.nome ?? 'Sem categoria', cor: c?.cor ?? null, totalCentavos: 0, quantidade: 0 };
    v.totalCentavos += d.valorCentavos;
    v.quantidade += 1;
    m.set(d.categoriaId, v);
  }
  return [...m.values()].sort((a, b) => b.totalCentavos - a.totalCentavos);
}
rota('GET', '/dashboard', ({ db, query }) => {
  exigir(db, 'dashboard:ver');
  const agora = partesNoFuso(new Date(), TZ);
  const ano = Number(query.ano) || agora.ano;
  const mes = query.mes ? Number(query.mes) : null;
  const mesInd = mes ?? (ano === agora.ano ? agora.mes : 12);
  const fin = pode(db, 'financeiro:ver');
  const lim = (m: number) => ({ inicio: `${ano}-${String(m).padStart(2, '0')}-01`, fim: `${ano}-${String(m).padStart(2, '0')}-${ultimoDia(ano, m)}` });
  const doMes = (m: number) => {
    const { inicio, fim } = lim(m);
    const ats = db.atendimentos.filter((a) => noPeriodo(a.inicio, inicio, fim));
    const feitos = ats.filter((a) => a.status === 'REALIZADO');
    const entradas = feitos.reduce((s, a) => s + a.totalCentavos, 0);
    const comissoes = feitos.reduce((s, a) => s + a.comissaoTotalCentavos, 0);
    const despesas = db.despesas.filter((d) => d.status === 'PAGA' && d.data >= inicio && d.data <= fim).reduce((s, d) => s + d.valorCentavos, 0);
    return { ats, feitos, entradas, comissoes, despesas };
  };
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);
  let acumulado = 0;
  const serie = meses.map((m) => ({ m, ...doMes(m) }));
  const ind = serie[mesInd - 1];
  const periodo = mes ? lim(mes) : { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
  const feitosPeriodo = mes ? ind.feitos : serie.flatMap((s) => s.feitos);
  const porServico = new Map<string, { servicoId: string; nome: string; quantidade: number; receitaCentavos: number }>();
  for (const a of feitosPeriodo)
    for (const i of a.itens) {
      const v = porServico.get(i.servicoId) ?? { servicoId: i.servicoId, nome: i.descricao, quantidade: 0, receitaCentavos: 0 };
      v.quantidade += i.quantidade;
      v.receitaCentavos += i.totalCentavos;
      porServico.set(i.servicoId, v);
    }
  const d: Dashboard = {
    periodo: { ano, mes, mesIndicadores: mesInd, fusoHorario: TZ },
    indicadores: {
      entradasCentavos: ind.entradas,
      despesasCentavos: fin ? ind.despesas : 0,
      comissoesCentavos: ind.comissoes,
      saldoCentavos: ind.entradas - (fin ? ind.despesas : 0) - ind.comissoes,
      atendimentosRealizados: ind.feitos.length,
      atendimentosAgendados: ind.ats.filter((a) => a.status === 'AGENDADO' || a.status === 'CONFIRMADO').length,
      atendimentosCancelados: ind.ats.filter((a) => a.status === 'CANCELADO').length,
      ticketMedioCentavos: ind.feitos.length ? Math.round(ind.entradas / ind.feitos.length) : 0,
      totalClientes: db.clientes.filter((c) => c.status === 'ATIVO').length,
    },
    graficos: {
      entradasSaidasPorMes: serie.map((s) => ({
        mes: s.m,
        entradasCentavos: s.entradas,
        saidasCentavos: (fin ? s.despesas : 0) + s.comissoes,
        saldoCentavos: s.entradas - (fin ? s.despesas : 0) - s.comissoes,
        atendimentosRealizados: s.feitos.length,
        atendimentosCancelados: s.ats.filter((a) => a.status === 'CANCELADO').length,
      })),
      despesasPorCategoria: fin ? porCategoria(db, periodo.inicio, periodo.fim) : [],
      receitaPorServico: [...porServico.values()].sort((a, b) => b.receitaCentavos - a.receitaCentavos),
      evolucaoFaturamento: serie.map((s) => ({ mes: s.m, acumuladoCentavos: (acumulado += s.entradas) })),
    },
    financeiroDisponivel: fin,
  };
  return ok(d);
});
rota('GET', '/financeiro/resultado', ({ db, query }) => {
  exigir(db, 'financeiro:ver');
  const inicio = String(query.inicio);
  const fim = String(query.fim);
  const feitos = realizados(db).filter((a) => noPeriodo(a.inicio, inicio, fim));
  const bruto = feitos.reduce((s, a) => s + a.totalCentavos, 0);
  const comissoes = feitos.reduce((s, a) => s + a.comissaoTotalCentavos, 0);
  const cats = porCategoria(db, inicio, fim);
  const despesas = cats.reduce((s, c) => s + c.totalCentavos, 0);
  const formas = new Map<string, { formaPagamento: string; totalCentavos: number; quantidade: number }>();
  for (const a of feitos) {
    const k = a.formaPagamento ?? 'NAO_INFORMADO';
    const v = formas.get(k) ?? { formaPagamento: k, totalCentavos: 0, quantidade: 0 };
    v.totalCentavos += a.totalCentavos;
    v.quantidade += 1;
    formas.set(k, v);
  }
  const r: ResultadoFinanceiro = {
    periodo: { inicio, fim },
    faturamentoBrutoCentavos: bruto,
    despesasCentavos: despesas,
    comissoesCentavos: comissoes,
    resultadoCentavos: bruto - despesas - comissoes,
    atendimentosRealizados: feitos.length,
    receitaPorFormaPagamento: [...formas.values()].sort((a, b) => b.totalCentavos - a.totalCentavos),
    despesasPorCategoria: cats,
  };
  return ok(r);
});
rota('GET', '/financeiro/comissoes', ({ db, query }) => {
  exigir(db, 'comissoes:ver');
  const inicio = String(query.inicio);
  const fim = String(query.fim);
  const feitos = realizados(db).filter((a) => noPeriodo(a.inicio, inicio, fim) && (!query.profissionalId || a.profissionalId === query.profissionalId));
  const profs = db.profissionais
    .map((p) => {
      const meus = feitos.filter((a) => a.profissionalId === p.id);
      return {
        profissionalId: p.id,
        nome: p.nome,
        comissaoBps: p.comissaoBps,
        atendimentos: meus.length,
        faturamentoCentavos: meus.reduce((s, a) => s + a.totalCentavos, 0),
        comissaoCentavos: meus.reduce((s, a) => s + a.comissaoTotalCentavos, 0),
      };
    })
    .filter((p) => p.atendimentos > 0)
    .sort((a, b) => b.comissaoCentavos - a.comissaoCentavos);
  const r: Comissoes = { periodo: { inicio, fim }, totalComissoesCentavos: profs.reduce((s, p) => s + p.comissaoCentavos, 0), profissionais: profs };
  return ok(r);
});

// Equipe (usuários)
rota('GET', '/usuarios', ({ db, query: q }) => {
  exigir(db, 'usuarios:gerenciar');
  const l = db.usuarios
    .filter((u) => (!q.papel || u.papel === q.papel) && (bool(q.ativo) === undefined || u.ativo === bool(q.ativo)))
    .map((u) => usuarioView(db, u));
  const { data, meta } = paginar(l, q);
  return ok(data, { meta });
});
rota('GET', '/usuarios/:id', ({ db, params }) => {
  const u = db.usuarios.find((x) => x.id === params.id);
  if (!u) throw naoEncontrado('Usuário');
  return ok(usuarioView(db, u));
});
rota('POST', '/usuarios', ({ db, body: b }) => {
  exigir(db, 'usuarios:gerenciar');
  if (String(b.nome ?? '').trim().length < 2) throw validacao('nome', 'Informe o nome.');
  if (!/^\S+@\S+\.\S+$/.test(String(b.email ?? ''))) throw validacao('email', 'E-mail inválido.');
  if (db.usuarios.some((u) => u.email.toLowerCase() === String(b.email).toLowerCase())) throw new Falha(409, 'EMAIL_EM_USO', 'Este e-mail já tem acesso ao sistema.');
  if (String(b.senha ?? '').length < 8) throw validacao('senha', 'A senha precisa de pelo menos 8 caracteres.');
  const u = { id: uid(), nome: String(b.nome).trim(), email: String(b.email).toLowerCase(), papel: b.papel as Papel, ativo: true, ultimoLoginEm: null, criadoEm: agoraISO(), profissionalId: b.profissionalId ?? null };
  if (u.profissionalId) {
    const p = profDe(db, u.profissionalId);
    if (p) p.usuarioId = u.id;
  }
  db.usuarios.push(u);
  return mudou(usuarioView(db, u), { status: 201 });
});
rota('PATCH', '/usuarios/:id', ({ db, params, body: b }) => {
  exigir(db, 'usuarios:gerenciar');
  const u = db.usuarios.find((x) => x.id === params.id);
  if (!u) throw naoEncontrado('Usuário');
  if (u.id === db.usuarioAtualId && (b.papel !== undefined || b.ativo === false)) throw new Falha(422, 'ALTERACAO_PROPRIA_PROIBIDA', 'Você não pode mudar o próprio papel nem se desativar.');
  const donos = db.usuarios.filter((x) => x.papel === 'PROPRIETARIO' && x.ativo && x.id !== u.id).length;
  if (u.papel === 'PROPRIETARIO' && !donos && ((b.papel && b.papel !== 'PROPRIETARIO') || b.ativo === false)) throw new Falha(422, 'ULTIMO_PROPRIETARIO', 'A empresa precisa de pelo menos um proprietário ativo.');
  if (b.nome !== undefined) u.nome = String(b.nome).trim();
  if (b.papel !== undefined) u.papel = b.papel;
  if (b.ativo !== undefined) u.ativo = Boolean(b.ativo);
  return mudou(usuarioView(db, u));
});

/* ── Adapter do axios ── */
const espera = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 160));

function caminhoDe(config: InternalAxiosRequestConfig): string {
  const base = config.baseURL ?? '';
  const url = config.url ?? '';
  const completo = /^https?:/.test(url) ? url : `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  const semOrigem = completo.replace(/^https?:\/\/[^/]+/, '');
  return semOrigem.replace(/^.*?\/v1(?=\/)/, '').split('?')[0];
}

export async function adapterDemo(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await espera();
  const metodo = (config.method ?? 'get').toUpperCase();
  const caminho = caminhoDe(config);
  const segmento = segmentoDemo() ?? 'SALAO_BELEZA';
  // Escritas trabalham numa cópia: se a regra recusar no meio, nada fica pela metade
  const db = metodo === 'GET' ? carregarDB(segmento) : structuredClone(carregarDB(segmento));
  let body: Q = {};
  try {
    body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {});
  } catch {
    body = {};
  }
  const responder = (status: number, data: unknown): AxiosResponse => ({ data, status, statusText: status < 300 ? 'OK' : 'Erro', headers: {}, config });

  try {
    for (const [m, re, h] of rotas) {
      if (m !== metodo) continue;
      const casou = re.exec(caminho);
      if (!casou) continue;
      const r = h({ db, params: (casou.groups ?? {}) as Record<string, string>, query: (config.params ?? {}) as Q, body });
      if (r.salvar) salvarDB(db);
      if (r.blob) return responder(200, r.blob);
      const status = r.status ?? 200;
      return responder(status, status === 204 ? '' : { success: true, message: null, data: r.data, meta: r.meta ?? null, timestamp: agoraISO() });
    }
    throw new Falha(404, 'ROTA_NAO_ENCONTRADA', 'Essa parte não está disponível na demonstração.');
  } catch (e) {
    const f = e instanceof Falha ? e : new Falha(500, 'ERRO_DEMO', 'Algo saiu do esperado na demonstração. Recarregue a página.');
    if (!(e instanceof Falha)) console.error('[demo]', e);
    const resp = responder(f.status, { success: false, code: f.code, message: f.message, ...(f.errors ? { errors: f.errors } : {}), timestamp: agoraISO() });
    throw new AxiosError(f.message, f.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, null, resp);
  }
}

/** Troca o usuário da demonstração (ver o sistema como recepção ou profissional). */
export function entrarComo(papel: Papel) {
  const db = carregarDB(segmentoDemo() ?? 'SALAO_BELEZA');
  const u = db.usuarios.find((x) => x.papel === papel && x.ativo);
  if (u) {
    db.usuarioAtualId = u.id;
    salvarDB(db);
  }
}
