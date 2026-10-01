import { isAxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiErro } from '@/api/types';
import { navegar } from './navigation';
import { toast } from './notify';

/** Extrai o corpo de erro padronizado da API (ou null se não houver resposta). */
export function erroApi(err: unknown): ApiErro | null {
  if (isAxiosError<ApiErro>(err) && err.response?.data && typeof err.response.data === 'object' && 'code' in err.response.data) {
    return err.response.data;
  }
  return null;
}

export const codigoErro = (err: unknown): string | undefined => erroApi(err)?.code;
export const statusErro = (err: unknown): number | undefined => (isAxiosError(err) ? err.response?.status : undefined);

const MENSAGENS: Record<string, string> = {
  MODULO_NAO_CONTRATADO: 'Este recurso faz parte de um módulo que sua empresa ainda não contratou. Fale com o suporte.',
  PERMISSAO_NEGADA: 'Seu perfil não tem permissão para esta ação.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  CONFLITO_CONCORRENCIA: 'Este registro foi alterado por outra pessoa. Os dados foram recarregados.',
  TRANSICAO_INVALIDA: 'O status mudou desde que você abriu a tela. Recarregamos os dados.',
  PAGAMENTOS_INDISPONIVEL: 'O serviço de pagamento está instável. Tente em instantes.',
  PAGAMENTOS_TIMEOUT: 'O serviço de pagamento demorou para responder. Tente em instantes.',
  PAGAMENTOS_CIRCUITO_ABERTO: 'O serviço de pagamento está instável. Tente em instantes.',
};

interface Opcoes<T extends FieldValues> {
  setError?: UseFormSetError<T>;
  /** Mapeia o campo vindo da API (sem o prefixo body.) para o nome no formulário. */
  mapField?: (campo: string) => string;
  /** Tratamentos específicos por código. Retorne true para suprimir o toast padrão. */
  on?: Partial<Record<string, (e: ApiErro) => boolean | void>>;
  silencioso?: boolean;
}

/** Tratamento central: erros de campo vão ao formulário, códigos conhecidos ganham UX própria. */
export function tratarErro<T extends FieldValues = FieldValues>(err: unknown, opts: Opcoes<T> = {}): ApiErro | null {
  const body = erroApi(err);
  if (!body) {
    if (!opts.silencioso) toast.erro(isAxiosError(err) && !err.response ? 'Sem conexão com o servidor. Verifique sua internet.' : 'Algo deu errado. Tente novamente.');
    return null;
  }

  const custom = opts.on?.[body.code];
  if (custom && custom(body) === true) return body;

  if (opts.setError && body.errors?.length) {
    body.errors.forEach((e) => {
      const campo = e.field.replace(/^(body|query|params)\./, '');
      const nome = opts.mapField ? opts.mapField(campo) : campo;
      opts.setError?.(nome as Path<T>, { type: 'server', message: e.message });
    });
  }

  switch (body.code) {
    case 'ASSINATURA_PENDENTE':
      navegar('/pendente');
      return body;
    case 'EMPRESA_DESATIVADA':
      navegar('/conta-desativada');
      return body;
    default:
      break;
  }

  if (opts.silencioso) return body;
  if (body.code === 'ERRO_INTERNO' || (statusErro(err) ?? 0) >= 500) {
    const pagamento = body.code?.startsWith('PAGAMENTOS_');
    toast.erro(pagamento ? MENSAGENS.PAGAMENTOS_INDISPONIVEL : `Erro inesperado. Informe ao suporte o código ${body.requestId ?? 'indisponível'}.`);
    return body;
  }
  toast.erro(MENSAGENS[body.code] ?? body.message);
  return body;
}
