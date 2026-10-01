/* Contratos da gestao-atendimentos-api (fonte da verdade: GET {API}/docs/openapi.json). */

export type StatusEmpresa = 'PENDENTE' | 'ATIVO' | 'SOMENTE_LEITURA' | 'DESATIVADO';
export type Papel = 'PROPRIETARIO' | 'RECEPCIONISTA' | 'PROFISSIONAL';
export type StatusAtendimento = 'AGENDADO' | 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO';
export type StatusOrcamento = 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'RECUSADO' | 'EXPIRADO';
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO' | 'TRANSFERENCIA' | 'OUTRO';
export type Modulo = 'NUCLEO' | 'ORCAMENTOS' | 'FINANCEIRO' | 'MULTI_PROFISSIONAL';
export type StatusAtivo = 'ATIVO' | 'INATIVO';
export type Segmento = 'SALAO_BELEZA' | 'BARBEARIA' | 'ESTETICA' | 'PETSHOP' | 'FISIOTERAPIA' | 'CONSULTORIA' | 'OUTRO';

export type Permissao =
  | 'dashboard:ver'
  | 'clientes:ler'
  | 'clientes:escrever'
  | 'servicos:ler'
  | 'servicos:escrever'
  | 'atendimentos:ler'
  | 'atendimentos:escrever'
  | 'atendimentos:todos'
  | 'agenda:ler'
  | 'configuracoes:gerenciar'
  | 'orcamentos:ler'
  | 'orcamentos:escrever'
  | 'despesas:ler'
  | 'despesas:escrever'
  | 'financeiro:ver'
  | 'profissionais:ler'
  | 'profissionais:escrever'
  | 'comissoes:ver'
  | 'usuarios:gerenciar';

/* ── Envelope ── */
export interface Paginacao {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
export interface Envelope<T, M = Paginacao | null> {
  success: true;
  message: string | null;
  data: T;
  meta: M;
  timestamp: string;
}
export interface ApiErro {
  success: false;
  message: string;
  code: string;
  errors?: { field: string; message: string }[];
  requestId?: string;
  timestamp?: string;
}
export interface Pagina<T> {
  items: T[];
  meta: Paginacao;
}

/* ── Sessão ── */
export interface Aparencia {
  corPrimaria: string;
  corSecundaria: string;
  tema: 'claro' | 'escuro';
  logoUrl: string | null;
  faviconUrl: string | null;
}
export type TipoCampo = 'texto' | 'numero' | 'data' | 'selecao' | 'booleano';
export interface DefinicaoCampo {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoes?: string[];
}
export interface Rotulos {
  cliente?: string;
  servico?: string;
  atendimento?: string;
}
export interface CamposPersonalizados {
  rotulos?: Rotulos;
  cliente?: DefinicaoCampo[];
  atendimento?: DefinicaoCampo[];
}
export type CamposExtras = Record<string, string | number | boolean | null>;

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  profissionalId: string | null;
}
export interface EmpresaSessao {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  segmento: Segmento;
  status: StatusEmpresa;
  aparencia: Aparencia | null;
  camposPersonalizados: CamposPersonalizados | null;
  fusoHorario: string;
  valorMensalCentavos: number;
  modulos: Modulo[];
}
export interface Sessao {
  usuario: Usuario;
  empresa: EmpresaSessao;
  permissoes: Permissao[];
}
export interface SessaoComToken extends Sessao {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}
export interface LinkCheckout {
  checkoutToken: string;
  checkoutApiBaseUrl: string;
  checkoutUrl: string;
}

/* ── Público ── */
export interface ModuloCatalogo {
  codigo: Modulo | string;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  obrigatorio: boolean;
}
export interface PlanoPublico {
  plano: { codigo: string; nome: string; precoBaseCentavos: number; ativo: boolean };
  modulos: ModuloCatalogo[];
}
export interface SegmentoPublico {
  codigo: Segmento;
  nome: string;
  rotulos: Rotulos;
}
export interface PrecoSimulado {
  plano: string;
  precoBaseCentavos: number;
  modulos: { codigo: string; nome: string; precoCentavos: number }[];
  totalCentavos: number;
}
export interface CadastroPayload {
  empresa: {
    nome: string;
    nomeFantasia?: string;
    documento?: string;
    email: string;
    telefone?: string;
    whatsapp?: string;
    segmento: Segmento;
  };
  proprietario: { nome: string; email: string; senha: string };
  modulos: string[];
  aceiteTermos: true;
}
export interface CadastroResposta extends LinkCheckout {
  empresa: { id: string; nome: string; status: StatusEmpresa };
  preco: PrecoSimulado;
  sessao: SessaoComToken;
}
export interface ResumoCheckout {
  empresa: { id: string; nome: string; status: StatusEmpresa };
  pago: boolean;
  valorCentavos: number;
  valor: number;
  descricao: string;
  modulos: { codigo: string; nome: string; precoCentavos: number }[];
  publicKey: string;
  metodos: ('PIX' | 'CREDIT_CARD' | 'BOLETO')[];
}

/* ── Domínio ── */
export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  documento: string | null;
  dataNascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  status: StatusAtivo;
  camposExtras: CamposExtras | null;
  criadoEm: string;
  atualizadoEm: string;
}
export type ClientePayload = Partial<Omit<Cliente, 'id' | 'criadoEm' | 'atualizadoEm'>>;

export type SituacaoRetorno = 'EM_DIA' | 'PROVAVEL_RETORNO' | 'ATRASADO';
export interface ClienteResumo {
  cliente: { id: string; nome: string; status: string };
  totalGastoCentavos: number;
  atendimentosRealizados: number;
  atendimentosCancelados: number;
  ticketMedioCentavos: number;
  ultimoAtendimento: string | null;
  diasDesdeUltimo: number | null;
  frequenciaMediaDias: number | null;
  situacaoRetorno: SituacaoRetorno | null;
  proximoAtendimento: { id: string; inicio: string; status: StatusAtendimento } | null;
}
export interface Aniversariante {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  dataNascimento: string;
}
export interface ClienteInativo {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  ultimoAtendimento: string;
  totalAtendimentos: number;
  frequenciaMediaDias: number | null;
}

export interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  valorCentavos: number;
  duracaoMinutos: number;
  status: StatusAtivo;
}
export type ServicoPayload = Partial<Omit<Servico, 'id'>>;

export type DiaSemana = '0' | '1' | '2' | '3' | '4' | '5' | '6';
export interface Intervalo {
  inicio: string;
  fim: string;
}
export type Expediente = Partial<Record<DiaSemana, Intervalo[]>>;
export interface Profissional {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cor: string | null;
  comissaoBps: number;
  horarioTrabalho: Expediente | null;
  status: StatusAtivo;
  usuarioId: string | null;
  servicos: { id: string; nome: string }[];
}
export interface ProfissionalPayload {
  nome?: string;
  email?: string | null;
  telefone?: string | null;
  cor?: string | null;
  comissaoBps?: number;
  horarioTrabalho?: Expediente;
  status?: StatusAtivo;
  usuarioId?: string | null;
  servicoIds?: string[];
}

export interface ItemAtendimento {
  id: string;
  servicoId: string;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  totalCentavos: number;
  duracaoMinutos: number;
  comissaoCentavos: number;
}
export interface Atendimento {
  id: string;
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
  cliente: { id: string; nome: string; telefone: string | null; whatsapp: string | null };
  profissional: { id: string; nome: string; cor: string | null } | null;
  itens: ItemAtendimento[];
}
export interface ItemNovoAtendimento {
  servicoId: string;
  quantidade?: number;
  valorUnitarioCentavos?: number;
}
export interface AtendimentoPayload {
  clienteId?: string;
  profissionalId?: string | null;
  inicio?: string;
  fim?: string;
  itens?: ItemNovoAtendimento[];
  descontoCentavos?: number;
  acrescimoCentavos?: number;
  observacoes?: string | null;
  encaixe?: boolean;
  status?: 'AGENDADO' | 'CONFIRMADO' | 'REALIZADO';
  formaPagamento?: FormaPagamento | null;
  camposExtras?: CamposExtras;
}
export interface MudancaStatusAtendimento {
  status: StatusAtendimento;
  motivo?: string;
  formaPagamento?: FormaPagamento;
}
export interface HorariosLivres {
  data: string;
  profissionalId: string | null;
  duracaoMinutos: number;
  horarios: { inicio: string; fim: string }[];
}

export interface ItemOrcamento {
  id: string;
  servicoId: string | null;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  totalCentavos: number;
}
export interface Orcamento {
  id: string;
  numero: number;
  data: string;
  validade: string | null;
  observacoes: string | null;
  subtotalCentavos: number;
  descontoCentavos: number;
  acrescimoCentavos: number;
  totalCentavos: number;
  status: StatusOrcamento;
  enviadoEm: string | null;
  aprovadoEm: string | null;
  recusadoEm: string | null;
  cliente: { id: string; nome: string; email: string | null; telefone: string | null; whatsapp: string | null; documento: string | null };
  itens: ItemOrcamento[];
  atendimento: { id: string; inicio: string; status: StatusAtendimento } | null;
}
export interface ItemOrcamentoPayload {
  servicoId?: string;
  descricao?: string;
  quantidade?: number;
  valorUnitarioCentavos?: number;
}
export interface OrcamentoPayload {
  clienteId?: string;
  data?: string;
  validade?: string | null;
  observacoes?: string | null;
  descontoCentavos?: number;
  acrescimoCentavos?: number;
  itens?: ItemOrcamentoPayload[];
}

export interface CategoriaDespesa {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
}
export interface Despesa {
  id: string;
  descricao: string;
  valorCentavos: number;
  data: string;
  formaPagamento: FormaPagamento | null;
  observacao: string | null;
  status: 'PENDENTE' | 'PAGA';
  categoria: { id: string; nome: string; cor: string | null };
}
export interface DespesaPayload {
  categoriaId?: string;
  descricao?: string;
  valorCentavos?: number;
  data?: string;
  formaPagamento?: FormaPagamento | null;
  observacao?: string | null;
  status?: 'PENDENTE' | 'PAGA';
}

export interface Dashboard {
  periodo: { ano: number; mes: number | null; mesIndicadores: number; fusoHorario: string };
  indicadores: {
    entradasCentavos: number;
    despesasCentavos: number;
    comissoesCentavos: number;
    saldoCentavos: number;
    atendimentosRealizados: number;
    atendimentosAgendados: number;
    atendimentosCancelados: number;
    ticketMedioCentavos: number;
    totalClientes: number;
  };
  graficos: {
    entradasSaidasPorMes: {
      mes: number;
      entradasCentavos: number;
      saidasCentavos: number;
      saldoCentavos: number;
      atendimentosRealizados: number;
      atendimentosCancelados: number;
    }[];
    despesasPorCategoria: { categoriaId: string; nome: string; cor: string | null; totalCentavos: number; quantidade: number }[];
    receitaPorServico: { servicoId: string; nome: string; quantidade: number; receitaCentavos: number }[];
    evolucaoFaturamento: { mes: number; acumuladoCentavos: number }[];
  };
  financeiroDisponivel: boolean;
}
export interface ResultadoFinanceiro {
  periodo: { inicio: string; fim: string };
  faturamentoBrutoCentavos: number;
  despesasCentavos: number;
  comissoesCentavos: number;
  resultadoCentavos: number;
  atendimentosRealizados: number;
  receitaPorFormaPagamento: { formaPagamento: string; totalCentavos: number; quantidade: number }[];
  despesasPorCategoria: { categoriaId: string; nome: string; cor: string | null; totalCentavos: number; quantidade: number }[];
}
export interface Comissoes {
  periodo: { inicio: string; fim: string };
  totalComissoesCentavos: number;
  profissionais: { profissionalId: string; nome: string; comissaoBps: number; atendimentos: number; faturamentoCentavos: number; comissaoCentavos: number }[];
}

export interface UsuarioEquipe {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string;
  profissional: { id: string; nome: string } | null;
}

export interface Endereco {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string | null;
  bairro?: string;
  cidade?: string;
  estado?: string;
}
export interface Configuracoes {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  documento: string | null;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  segmento: Segmento;
  endereco: Endereco | null;
  aparencia: Aparencia | null;
  camposPersonalizados: CamposPersonalizados | null;
  fusoHorario: string;
  status: StatusEmpresa;
  valorMensalCentavos: number;
  modulos: { codigo: Modulo; nome: string }[];
}
export interface ConfiguracoesPayload {
  nome?: string;
  nomeFantasia?: string | null;
  documento?: string | null;
  email?: string;
  telefone?: string | null;
  whatsapp?: string | null;
  segmento?: Segmento;
  fusoHorario?: string;
  endereco?: Endereco | null;
  aparencia?: Partial<Aparencia>;
  camposPersonalizados?: CamposPersonalizados;
  aplicarPresetSegmento?: boolean;
}

/* ── Admin ── */
export interface AdminPerfil {
  id: string;
  nome: string;
  email: string;
  totpAtivo: boolean;
}
export interface AdminSessao {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  admin: AdminPerfil;
  mfaConfiguracaoObrigatoria: boolean;
}
export interface AdminLoginMfa {
  mfaObrigatorio: true;
  mfaToken: string;
}
export type AdminLoginResposta = AdminSessao | AdminLoginMfa;

export interface AdminMetricas {
  empresasPorStatus: Partial<Record<StatusEmpresa, number>>;
  receitaMensalContratadaCentavos: number;
  cadastrosUltimos30Dias: number;
}
export interface AdminEmpresaLista {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  email: string;
  documento: string | null;
  telefone: string | null;
  segmento: Segmento;
  status: StatusEmpresa;
  motivoStatus: string | null;
  valorMensalCentavos: number;
  ativadoEm: string | null;
  criadoEm: string;
  modulos: string[];
  totais: { usuarios: number; clientes: number };
}
export interface AdminEmpresaDetalhe extends Omit<AdminEmpresaLista, 'modulos' | 'totais'> {
  whatsapp: string | null;
  fusoHorario: string;
  modulos: { moduloCodigo: string; ativo: boolean; precoCentavos: number }[];
  usuarios: { id: string; nome: string; email: string; papel: Papel; ativo: boolean; ultimoLoginEm: string | null }[];
  pagamentosAssinatura: {
    id: string;
    gatewayPaymentId: string;
    metodo: string | null;
    status: string;
    valorCentavos: number;
    aprovadoEm: string | null;
    criadoEm: string;
  }[];
  totais: { usuarios: number; clientes: number; atendimentos: number; orcamentos: number };
}
export interface AdminCatalogo {
  plano: { id: string; codigo: string; nome: string; precoBaseCentavos: number; ativo: boolean } | null;
  modulos: { codigo: string; nome: string; descricao: string | null; precoCentavos: number; obrigatorio: boolean; ativo: boolean; ordem: number }[];
}
export interface LogAuditoria {
  id: string;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  empresaId: string | null;
  adminId: string | null;
  usuarioId: string | null;
  dados: Record<string, unknown> | null;
  ip: string | null;
  criadoEm: string;
}
