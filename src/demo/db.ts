import type {
  CamposExtras,
  CategoriaDespesa,
  Cliente,
  Configuracoes,
  Expediente,
  FormaPagamento,
  Modulo,
  Papel,
  Segmento,
  Servico,
  StatusAtendimento,
  StatusAtivo,
  StatusOrcamento,
} from '@/api/types';
import { hojeISO, localParaIso, pad, somarDias } from '@/lib/dates';
import { BAIRROS, CATALOGOS, TODOS_CLIENTES } from './catalogos';
import { CHAVE_DB } from './modo';

/* ── Banco da demonstração (vive no sessionStorage desta aba) ── */

export const TZ = 'America/Sao_Paulo';

export interface ProfissionalDB {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cor: string | null;
  comissaoBps: number;
  horarioTrabalho: Expediente | null;
  status: StatusAtivo;
  usuarioId: string | null;
  servicoIds: string[];
}
export interface ItemAtendimentoDB {
  id: string;
  servicoId: string;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  totalCentavos: number;
  duracaoMinutos: number;
  comissaoCentavos: number;
}
export interface AtendimentoDB {
  id: string;
  clienteId: string;
  profissionalId: string | null;
  inicio: string;
  fim: string;
  status: StatusAtendimento;
  encaixe: boolean;
  observacoes: string | null;
  subtotalCentavos: number;
  descontoCentavos: number;
  acrescimoCentavos: number;
  totalCentavos: number;
  comissaoTotalCentavos: number;
  formaPagamento: FormaPagamento | null;
  camposExtras: CamposExtras | null;
  confirmadoEm: string | null;
  realizadoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  orcamentoId: string | null;
  criadoEm: string;
  itens: ItemAtendimentoDB[];
}
export interface OrcamentoDB {
  id: string;
  numero: number;
  clienteId: string;
  data: string;
  validade: string | null;
  observacoes: string | null;
  subtotalCentavos: number;
  descontoCentavos: number;
  acrescimoCentavos: number;
  totalCentavos: number;
  status: Exclude<StatusOrcamento, 'EXPIRADO'>;
  enviadoEm: string | null;
  aprovadoEm: string | null;
  recusadoEm: string | null;
  atendimentoId: string | null;
  itens: { id: string; servicoId: string | null; descricao: string; quantidade: number; valorUnitarioCentavos: number; totalCentavos: number }[];
}
export interface DespesaDB {
  id: string;
  categoriaId: string;
  descricao: string;
  valorCentavos: number;
  data: string;
  formaPagamento: FormaPagamento | null;
  observacao: string | null;
  status: 'PENDENTE' | 'PAGA';
}
export interface UsuarioDB {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string;
  profissionalId: string | null;
}

export interface DB {
  versao: 1;
  segmento: Segmento;
  empresa: Omit<Configuracoes, 'modulos'> & { modulos: Modulo[] };
  usuarios: UsuarioDB[];
  usuarioAtualId: string;
  servicos: Servico[];
  profissionais: ProfissionalDB[];
  clientes: Cliente[];
  atendimentos: AtendimentoDB[];
  orcamentos: OrcamentoDB[];
  proximoOrcamento: number;
  categorias: CategoriaDespesa[];
  despesas: DespesaDB[];
}

export const MODULOS_DEMO: Modulo[] = ['NUCLEO', 'ORCAMENTOS', 'FINANCEIRO', 'MULTI_PROFISSIONAL'];
export const MODULOS_PRECO: Record<Modulo, { nome: string; precoCentavos: number }> = {
  NUCLEO: { nome: 'Núcleo', precoCentavos: 0 },
  ORCAMENTOS: { nome: 'Orçamentos', precoCentavos: 1990 },
  FINANCEIRO: { nome: 'Financeiro', precoCentavos: 1990 },
  MULTI_PROFISSIONAL: { nome: 'Multi-profissional', precoCentavos: 2990 },
};

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
export const agoraISO = () => new Date().toISOString();
export const brlTexto = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);

/* ── Persistência ── */
let memoria: DB | null = null;

export function carregarDB(segmento: Segmento): DB {
  if (memoria && memoria.segmento === segmento) return memoria;
  try {
    const bruto = sessionStorage.getItem(CHAVE_DB);
    if (bruto) {
      const db = JSON.parse(bruto) as DB;
      if (db.versao === 1 && db.segmento === segmento) {
        memoria = db;
        return db;
      }
    }
  } catch {
    /* sem armazenamento: recria */
  }
  const db = semear(segmento);
  salvarDB(db);
  return db;
}

export function salvarDB(db: DB) {
  memoria = db;
  try {
    sessionStorage.setItem(CHAVE_DB, JSON.stringify(db));
  } catch {
    /* cheio ou bloqueado: segue em memória */
  }
}

export function descartarDB() {
  memoria = null;
}

/* ── Sementes ── */

/** Gerador determinístico: a mesma empresa de exemplo a cada vez que a demo abre. */
function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXPEDIENTE_PADRAO: Expediente = {
  '1': [
    { inicio: '09:00', fim: '12:00' },
    { inicio: '13:00', fim: '18:00' },
  ],
  '2': [
    { inicio: '09:00', fim: '12:00' },
    { inicio: '13:00', fim: '18:00' },
  ],
  '3': [
    { inicio: '09:00', fim: '12:00' },
    { inicio: '13:00', fim: '18:00' },
  ],
  '4': [
    { inicio: '09:00', fim: '12:00' },
    { inicio: '13:00', fim: '18:00' },
  ],
  '5': [
    { inicio: '09:00', fim: '12:00' },
    { inicio: '13:00', fim: '18:00' },
  ],
  '6': [{ inicio: '08:00', fim: '13:00' }],
};

export const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();

function emailDe(nome: string) {
  const p = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^(dr|dra)\.\s*/, '')
    .split(' ');
  return `${p[0]}.${p[p.length - 1]}@email.com`;
}

export function semear(segmento: Segmento): DB {
  const cat = CATALOGOS[segmento];
  const rnd = aleatorio(segmento.length * 7919 + 17);
  const escolher = <T,>(l: T[]) => l[Math.floor(rnd() * l.length)];
  const hoje = hojeISO(TZ);
  const agora = Date.now();
  const criadoBase = localParaIso(somarDias(hoje, -150), '09:00', TZ);

  // Serviços
  const servicos: Servico[] = cat.servicos.map((s) => ({
    id: uid(),
    nome: s.nome,
    descricao: s.descricao ?? null,
    categoria: s.categoria,
    valorCentavos: s.valorCentavos,
    duracaoMinutos: s.duracaoMinutos,
    status: 'ATIVO',
  }));

  // Usuários e profissionais
  const dono: UsuarioDB = { id: uid(), nome: 'Marina Costa', email: 'marina@exemplo.com.br', papel: 'PROPRIETARIO', ativo: true, ultimoLoginEm: agoraISO(), criadoEm: criadoBase, profissionalId: null };
  const recepcao: UsuarioDB = { id: uid(), nome: 'Lívia Santos', email: 'livia@exemplo.com.br', papel: 'RECEPCIONISTA', ativo: true, ultimoLoginEm: localParaIso(somarDias(hoje, -1), '18:02', TZ), criadoEm: criadoBase, profissionalId: null };
  const profissionais: ProfissionalDB[] = cat.profissionais.map((p, i) => ({
    id: uid(),
    nome: p.nome,
    email: emailDe(p.nome).replace('@email.com', '@exemplo.com.br'),
    telefone: `8199${String(8100000 + i * 7311).slice(0, 7)}`,
    cor: p.cor,
    comissaoBps: p.comissaoBps,
    horarioTrabalho: EXPEDIENTE_PADRAO,
    status: 'ATIVO',
    usuarioId: null,
    servicoIds: (p.servicos ?? servicos.map((_, k) => k)).map((k) => servicos[k].id),
  }));
  const usuarioProf: UsuarioDB = {
    id: uid(),
    nome: profissionais[0].nome,
    email: profissionais[0].email!,
    papel: 'PROFISSIONAL',
    ativo: true,
    ultimoLoginEm: localParaIso(hoje, '08:47', TZ),
    criadoEm: criadoBase,
    profissionalId: profissionais[0].id,
  };
  profissionais[0].usuarioId = usuarioProf.id;

  // Clientes (os 8 últimos sumiram há mais de 60 dias, 3 fazem aniversário nesta semana)
  const clientes: Cliente[] = TODOS_CLIENTES.map((nome, i) => {
    const whatsapp = `8198${String(7000000 + i * 13579).slice(0, 7)}`;
    const nasc = i < 3 ? `${1985 + i * 4}-${somarDias(hoje, i * 2 + 1).slice(5)}` : `${1970 + ((i * 7) % 35)}-${pad((i % 12) + 1)}-${pad((i % 27) + 1)}`;
    const criado = localParaIso(somarDias(hoje, -150 + (i % 72)), '10:00', TZ);
    return {
      id: uid(),
      nome,
      telefone: null,
      whatsapp,
      email: i % 3 === 0 ? emailDe(nome) : null,
      documento: null,
      dataNascimento: nasc,
      cep: i % 2 ? '52011000' : null,
      logradouro: i % 2 ? 'Rua da Aurora' : null,
      numero: i % 2 ? String(100 + i) : null,
      complemento: null,
      bairro: i % 2 ? BAIRROS[i % BAIRROS.length] : null,
      cidade: i % 2 ? 'Recife' : null,
      estado: i % 2 ? 'PE' : null,
      observacoes: i % 4 === 0 ? cat.observacoes[i % cat.observacoes.length] : null,
      status: 'ATIVO',
      camposExtras: cat.extrasCliente ? cat.extrasCliente(i) : null,
      criadoEm: criado,
      atualizadoEm: criado,
    };
  });
  const sumidos = clientes.slice(-8);
  const frequentes = clientes.slice(0, 14);

  // Atendimentos: ~4 meses para trás e 2 semanas para frente
  const atendimentos: AtendimentoDB[] = [];
  const formas: FormaPagamento[] = ['PIX', 'PIX', 'PIX', 'CARTAO_CREDITO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'];
  for (let d = -120; d <= 14; d++) {
    const data = somarDias(hoje, d);
    const dow = String(diaDaSemana(data)) as keyof Expediente;
    for (const prof of profissionais) {
      const turnos = prof.horarioTrabalho?.[dow];
      if (!turnos) continue;
      const chance = d < 0 ? 0.4 : d === 0 ? 0.55 : d <= 3 ? 0.42 : 0.22;
      for (const t of turnos) {
        let cursor = minutos(t.inicio);
        while (cursor < minutos(t.fim)) {
          const sid = escolher(prof.servicoIds);
          const s = servicos.find((x) => x.id === sid)!;
          if (cursor + s.duracaoMinutos > minutos(t.fim)) break;
          if (rnd() < chance) {
            const inicio = localParaIso(data, hhmm(cursor), TZ);
            const fim = localParaIso(data, hhmm(cursor + s.duracaoMinutos), TZ);
            const passado = Date.parse(fim) < agora;
            const pool = d < -60 ? clientes : rnd() < 0.3 ? frequentes : clientes.slice(0, -8);
            const cli = d < -75 && rnd() < 0.3 ? escolher(sumidos) : escolher(pool);
            let status: StatusAtendimento;
            if (passado) status = rnd() < 0.09 ? 'CANCELADO' : 'REALIZADO';
            else status = d <= 1 && rnd() < 0.6 ? 'CONFIRMADO' : rnd() < 0.3 ? 'CONFIRMADO' : 'AGENDADO';
            const desconto = status === 'REALIZADO' && rnd() < 0.08 ? Math.round(s.valorCentavos * 0.1) : 0;
            const total = s.valorCentavos - desconto;
            const comissao = Math.round((s.valorCentavos * prof.comissaoBps) / 10000);
            atendimentos.push({
              id: uid(),
              clienteId: cli.id,
              profissionalId: prof.id,
              inicio,
              fim,
              status,
              encaixe: false,
              observacoes: rnd() < 0.08 ? 'Pediu para confirmar pelo WhatsApp.' : null,
              subtotalCentavos: s.valorCentavos,
              descontoCentavos: desconto,
              acrescimoCentavos: 0,
              totalCentavos: total,
              comissaoTotalCentavos: comissao,
              formaPagamento: status === 'REALIZADO' ? escolher(formas) : null,
              camposExtras: segmento === 'PETSHOP' ? { porte: escolher(['Pequeno', 'Pequeno', 'Médio', 'Grande']) } : null,
              confirmadoEm: status === 'CONFIRMADO' || (status === 'REALIZADO' && rnd() < 0.5) ? localParaIso(somarDias(data, -1), '17:30', TZ) : null,
              realizadoEm: status === 'REALIZADO' ? fim : null,
              canceladoEm: status === 'CANCELADO' ? localParaIso(somarDias(data, -1), '19:10', TZ) : null,
              motivoCancelamento: status === 'CANCELADO' && rnd() < 0.75 ? escolher(['Imprevisto no trabalho', 'Ficou doente', 'Remarcou para outro dia']) : null,
              orcamentoId: null,
              criadoEm: localParaIso(somarDias(data, -Math.ceil(rnd() * 6)), '10:15', TZ),
              itens: [
                {
                  id: uid(),
                  servicoId: s.id,
                  descricao: s.nome,
                  quantidade: 1,
                  valorUnitarioCentavos: s.valorCentavos,
                  totalCentavos: s.valorCentavos,
                  duracaoMinutos: s.duracaoMinutos,
                  comissaoCentavos: comissao,
                },
              ],
            });
            cursor += s.duracaoMinutos + (rnd() < 0.5 ? 0 : 15);
          } else {
            cursor += 30;
          }
        }
      }
    }
  }

  // Orçamentos
  const orcamentos: OrcamentoDB[] = [];
  const statusOrc: OrcamentoDB['status'][] = ['APROVADO', 'ENVIADO', 'RASCUNHO', 'APROVADO', 'RECUSADO', 'ENVIADO', 'APROVADO', 'ENVIADO', 'RASCUNHO', 'APROVADO'];
  statusOrc.forEach((st, i) => {
    const data = somarDias(hoje, -55 + i * 6);
    const cli = clientes[(i * 5) % 30];
    const itensServ = [servicos[i % servicos.length], servicos[(i + 2) % servicos.length]];
    const itens = itensServ.map((s, k) => ({
      id: uid(),
      servicoId: s.id,
      descricao: s.nome,
      quantidade: k === 0 && i % 3 === 0 ? 4 : 1,
      valorUnitarioCentavos: s.valorCentavos,
      totalCentavos: s.valorCentavos * (k === 0 && i % 3 === 0 ? 4 : 1),
    }));
    const subtotal = itens.reduce((a, x) => a + x.totalCentavos, 0);
    const desconto = i % 2 ? Math.round(subtotal * 0.1) : 0;
    orcamentos.push({
      id: uid(),
      numero: i + 1,
      clienteId: cli.id,
      data,
      validade: somarDias(data, 15),
      observacoes: i % 3 === 0 ? 'Pacote com 10% de desconto pagando à vista.' : null,
      subtotalCentavos: subtotal,
      descontoCentavos: desconto,
      acrescimoCentavos: 0,
      totalCentavos: subtotal - desconto,
      status: st,
      enviadoEm: st !== 'RASCUNHO' ? localParaIso(data, '11:00', TZ) : null,
      aprovadoEm: st === 'APROVADO' ? localParaIso(somarDias(data, 2), '15:20', TZ) : null,
      recusadoEm: st === 'RECUSADO' ? localParaIso(somarDias(data, 3), '09:40', TZ) : null,
      atendimentoId: null,
      itens,
    });
  });
  // Um aprovado já virou atendimento
  const conv = orcamentos[0];
  const atConv = atendimentos.find((a) => a.status === 'REALIZADO' && a.inicio.slice(0, 10) > conv.data && a.clienteId !== conv.clienteId);
  if (atConv) {
    atConv.clienteId = conv.clienteId;
    atConv.orcamentoId = conv.id;
    conv.atendimentoId = atConv.id;
  }

  // Despesas
  const nomesCat: [string, string][] = [
    ['Aluguel', '#0F2557'],
    ['Produtos e materiais', '#2F6BFF'],
    ['Energia e água', '#D97706'],
    ['Internet e telefone', '#0E9F9A'],
    ['Marketing', '#E0457B'],
    ['Manutenção', '#7C3AED'],
    ['Impostos', '#64748B'],
  ];
  const categorias: CategoriaDespesa[] = nomesCat.map(([nome, cor]) => ({ id: uid(), nome, cor, ativo: true }));
  const despesas: DespesaDB[] = [];
  const mesAtual = hoje.slice(0, 7);
  const valorBase = segmento === 'CONSULTORIA' ? 2.4 : segmento === 'BARBEARIA' ? 0.8 : 1;
  for (let m = 4; m >= 0; m--) {
    const [y, mm] = hoje.split('-').map(Number);
    const dt = new Date(Date.UTC(y, mm - 1 - m, 1));
    const ym = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
    const atual = ym === mesAtual;
    const dia = (n: number) => `${ym}-${pad(n)}`;
    const pago = (n: number) => !atual || dia(n) <= hoje;
    const fixas: [number, string, number, number, FormaPagamento][] = [
      [0, 'Aluguel da sala', Math.round(280000 * valorBase), 5, 'TRANSFERENCIA'],
      [2, 'Conta de energia', Math.round((38000 + rnd() * 9000) * valorBase), 10, 'PIX'],
      [2, 'Conta de água', 9800 + Math.round(rnd() * 3000), 12, 'PIX'],
      [3, 'Internet fibra', 12990, 15, 'CARTAO_CREDITO'],
      [6, 'DAS do Simples Nacional', Math.round((52000 + rnd() * 15000) * valorBase), 20, 'BOLETO'],
    ];
    fixas.forEach(([c, descricao, valor, d, forma]) =>
      despesas.push({ id: uid(), categoriaId: categorias[c].id, descricao, valorCentavos: valor, data: dia(d), formaPagamento: pago(d) ? forma : null, observacao: null, status: pago(d) ? 'PAGA' : 'PENDENTE' }),
    );
    for (let k = 0; k < 3; k++) {
      const d = 3 + k * 8 + Math.floor(rnd() * 4);
      despesas.push({
        id: uid(),
        categoriaId: categorias[1].id,
        descricao: escolher(['Compra de produtos', 'Reposição de materiais', 'Fornecedor (boleto)', 'Itens descartáveis']),
        valorCentavos: Math.round((18000 + rnd() * 42000) * valorBase),
        data: dia(d),
        formaPagamento: pago(d) ? 'PIX' : null,
        observacao: null,
        status: pago(d) ? 'PAGA' : 'PENDENTE',
      });
    }
    if (m % 2 === 0) despesas.push({ id: uid(), categoriaId: categorias[4].id, descricao: 'Impulsionamento no Instagram', valorCentavos: 15000, data: dia(18), formaPagamento: pago(18) ? 'CARTAO_CREDITO' : null, observacao: null, status: pago(18) ? 'PAGA' : 'PENDENTE' });
    if (m === 2) despesas.push({ id: uid(), categoriaId: categorias[5].id, descricao: 'Conserto do ar-condicionado', valorCentavos: 45000, data: dia(22), formaPagamento: 'PIX', observacao: 'Técnico indicado pelo vizinho.', status: 'PAGA' });
  }

  const empresa: DB['empresa'] = {
    id: uid(),
    nome: `${cat.empresa} Ltda`,
    nomeFantasia: cat.empresa,
    documento: '12345678000190',
    email: 'contato@exemplo.com.br',
    telefone: '8133334444',
    whatsapp: '81999990000',
    segmento,
    endereco: { cep: '52011000', logradouro: 'Rua da Aurora', numero: '325', complemento: 'Sala 4', bairro: 'Boa Vista', cidade: 'Recife', estado: 'PE' },
    aparencia: null,
    camposPersonalizados: cat.camposPersonalizados,
    fusoHorario: TZ,
    status: 'ATIVO',
    valorMensalCentavos: 4990 + MODULOS_DEMO.reduce((a, m) => a + MODULOS_PRECO[m].precoCentavos, 0),
    modulos: [...MODULOS_DEMO],
  };

  return {
    versao: 1,
    segmento,
    empresa,
    usuarios: [dono, recepcao, usuarioProf],
    usuarioAtualId: dono.id,
    servicos,
    profissionais,
    clientes,
    atendimentos: atendimentos.sort((a, b) => a.inicio.localeCompare(b.inicio)),
    orcamentos,
    proximoOrcamento: orcamentos.length + 1,
    categorias,
    despesas,
  };
}
