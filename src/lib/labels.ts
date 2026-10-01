import type { FormaPagamento, Modulo, Papel, Segmento, StatusAtendimento, StatusEmpresa, StatusOrcamento, SituacaoRetorno } from '@/api/types';

type Tom = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

export const STATUS_ATENDIMENTO: Record<StatusAtendimento, { label: string; tom: Tom; icone: string }> = {
  AGENDADO: { label: 'Agendado', tom: 'info', icone: 'bx-time-five' },
  CONFIRMADO: { label: 'Confirmado', tom: 'primary', icone: 'bx-check' },
  REALIZADO: { label: 'Realizado', tom: 'success', icone: 'bx-check-double' },
  CANCELADO: { label: 'Cancelado', tom: 'danger', icone: 'bx-x' },
};

export const STATUS_ORCAMENTO: Record<StatusOrcamento, { label: string; tom: Tom; icone: string }> = {
  RASCUNHO: { label: 'Rascunho', tom: 'neutral', icone: 'bx-edit-alt' },
  ENVIADO: { label: 'Enviado', tom: 'info', icone: 'bx-send' },
  APROVADO: { label: 'Aprovado', tom: 'success', icone: 'bx-like' },
  RECUSADO: { label: 'Recusado', tom: 'danger', icone: 'bx-dislike' },
  EXPIRADO: { label: 'Expirado', tom: 'warning', icone: 'bx-hourglass' },
};

export const STATUS_EMPRESA: Record<StatusEmpresa, { label: string; tom: Tom; icone: string }> = {
  PENDENTE: { label: 'Pendente', tom: 'warning', icone: 'bx-time' },
  ATIVO: { label: 'Ativa', tom: 'success', icone: 'bx-check-circle' },
  SOMENTE_LEITURA: { label: 'Somente leitura', tom: 'info', icone: 'bx-lock-alt' },
  DESATIVADO: { label: 'Desativada', tom: 'danger', icone: 'bx-block' },
};

export const SITUACAO_RETORNO: Record<SituacaoRetorno, { label: string; tom: Tom }> = {
  EM_DIA: { label: 'Em dia', tom: 'success' },
  PROVAVEL_RETORNO: { label: 'Provável retorno', tom: 'warning' },
  ATRASADO: { label: 'Retorno atrasado', tom: 'danger' },
};

export const FORMAS_PAGAMENTO: Record<FormaPagamento, { label: string; icone: string }> = {
  PIX: { label: 'Pix', icone: 'bx-qr' },
  DINHEIRO: { label: 'Dinheiro', icone: 'bx-money' },
  CARTAO_CREDITO: { label: 'Cartão de crédito', icone: 'bx-credit-card' },
  CARTAO_DEBITO: { label: 'Cartão de débito', icone: 'bx-credit-card-front' },
  BOLETO: { label: 'Boleto', icone: 'bx-barcode' },
  TRANSFERENCIA: { label: 'Transferência', icone: 'bx-transfer' },
  OUTRO: { label: 'Outro', icone: 'bx-dots-horizontal-rounded' },
};
export const labelForma = (f: string | null | undefined): string =>
  f ? (FORMAS_PAGAMENTO[f as FormaPagamento]?.label ?? (f === 'NAO_INFORMADO' ? 'Não informado' : f)) : 'Não informado';

export const PAPEIS: Record<Papel, { label: string; descricao: string; icone: string }> = {
  PROPRIETARIO: { label: 'Proprietário', descricao: 'Acesso total, inclusive financeiro e configurações.', icone: 'bx-crown' },
  RECEPCIONISTA: { label: 'Recepção', descricao: 'Agenda, atendimentos e clientes de todos, além de orçamentos.', icone: 'bx-headphone' },
  PROFISSIONAL: { label: 'Profissional', descricao: 'Vê e registra apenas a própria agenda e os próprios atendimentos.', icone: 'bx-user-pin' },
};

export const MODULOS: Record<Modulo, { label: string; icone: string; resumo: string }> = {
  NUCLEO: { label: 'Núcleo', icone: 'bx-cube', resumo: 'Agenda, clientes, serviços, histórico e dashboard' },
  ORCAMENTOS: { label: 'Orçamentos', icone: 'bx-file', resumo: 'Orçamentos com PDF da sua marca' },
  FINANCEIRO: { label: 'Financeiro', icone: 'bx-wallet', resumo: 'Despesas e resultado do período' },
  MULTI_PROFISSIONAL: { label: 'Multi-profissional', icone: 'bx-group', resumo: 'Equipe, agendas e comissões' },
};
export const iconeModulo = (codigo: string) => MODULOS[codigo as Modulo]?.icone ?? 'bx-extension';

export const SEGMENTOS_ICONE: Record<Segmento, string> = {
  SALAO_BELEZA: 'bx-spa',
  BARBEARIA: 'bx-cut',
  ESTETICA: 'bx-face',
  PETSHOP: 'bxs-dog',
  FISIOTERAPIA: 'bx-body',
  CONSULTORIA: 'bx-briefcase-alt-2',
  OUTRO: 'bx-category',
};

export const ACOES_AUDITORIA: Record<string, string> = {
  ADMIN_LOGIN: 'Login de admin',
  ADMIN_LOGIN_FALHOU: 'Falha no login de admin',
  ADMIN_2FA_FALHOU: 'Código 2FA inválido',
  ADMIN_2FA_ATIVADO: '2FA ativado',
  ASSINATURA_ATIVADA: 'Assinatura ativada',
  PAGAMENTO_APROVADO: 'Pagamento aprovado',
  CONFIGURACOES_ALTERADAS: 'Configurações alteradas',
  USUARIO_SENHA_ALTERADA: 'Senha alterada',
  CATALOGO_PLANO_ATUALIZADO: 'Preço do plano alterado',
  CATALOGO_MODULO_ATUALIZADO: 'Módulo do catálogo alterado',
};
export const labelAcao = (a: string) => ACOES_AUDITORIA[a] ?? a.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const FUSOS = [
  'America/Sao_Paulo',
  'America/Recife',
  'America/Fortaleza',
  'America/Bahia',
  'America/Belem',
  'America/Maceio',
  'America/Araguaina',
  'America/Manaus',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Rio_Branco',
  'America/Noronha',
];

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
