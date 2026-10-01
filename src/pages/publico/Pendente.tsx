import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints/auth';
import { useSession } from '@/auth/SessionProvider';
import { rotaInicial } from '@/auth/guards';
import { Button } from '@/components/ui/Button';
import { tratarErro } from '@/lib/errors';
import { useTitulo } from '@/lib/hooks';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';

/** Empresa PENDENTE: leva ao checkout, verifica pagamento e gera novo link. */
export default function Pendente() {
  useTitulo('Pagamento pendente');
  const { sessao, recarregar, logout } = useSession();
  const navigate = useNavigate();
  const [gerando, setGerando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  if (!sessao) return null;
  if (sessao.empresa.status !== 'PENDENTE') return <Navigate to={rotaInicial(sessao.permissoes)} replace />;
  const proprietario = sessao.usuario.papel === 'PROPRIETARIO';

  const pagar = async () => {
    setGerando(true);
    try {
      const l = await authApi.checkoutLink();
      navigate(`/checkout/${encodeURIComponent(l.checkoutToken)}`);
    } catch (e) {
      tratarErro(e, { on: { ASSINATURA_JA_ATIVA: () => (void recarregar(), true) } });
    } finally {
      setGerando(false);
    }
  };

  const verificar = async () => {
    setVerificando(true);
    const s = await recarregar();
    setVerificando(false);
    if (s?.empresa.status === 'ATIVO') {
      toast.ok('Pagamento confirmado. Bem-vindo!');
      navigate(rotaInicial(s.permissoes), { replace: true });
    } else toast.info('Ainda não recebemos a confirmação. Pix confirma em segundos; boleto pode levar até 3 dias úteis.');
  };

  return (
    <div className="container status-page">
      <div className="status-page__card card card--pad" data-aos="zoom-in">
        <span className="status-page__icone status-page__icone--warning" aria-hidden="true">
          <i className="bx bx-time-five" />
        </span>
        <h1 className="h-1">Falta só o pagamento da adesão</h1>
        <p className="muted">
          A conta de <strong>{sessao.empresa.nomeFantasia ?? sessao.empresa.nome}</strong> será liberada assim que o pagamento de{' '}
          <strong className="num">{brl(sessao.empresa.valorMensalCentavos)}</strong> for confirmado.
        </p>
        {proprietario ? (
          <div className="row" style={{ justifyContent: 'center' }}>
            <Button icon="bx-credit-card" loading={gerando} onClick={pagar}>
              Concluir pagamento
            </Button>
            <Button variant="ghost" icon="bx-refresh" loading={verificando} onClick={verificar}>
              Já paguei, verificar
            </Button>
          </div>
        ) : (
          <div className="callout">
            <i className="bx bx-info-circle" aria-hidden="true" />
            <span>Somente o proprietário pode concluir o pagamento. Avise o responsável pela sua empresa.</span>
          </div>
        )}
        <button type="button" className="btn btn--link" onClick={() => void logout()}>
          Sair desta conta
        </button>
      </div>
    </div>
  );
}
