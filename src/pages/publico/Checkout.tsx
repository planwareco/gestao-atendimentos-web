import { lazy, Suspense, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints/auth';
import { checkoutApi, checkoutBaseUrl } from '@/api/endpoints/checkout';
import { useSession } from '@/auth/SessionProvider';
import { rotaInicial } from '@/auth/guards';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Skeleton, Spinner } from '@/components/ui/Feedback';
import { codigoErro, statusErro, tratarErro } from '@/lib/errors';
import { useTitulo } from '@/lib/hooks';
import { iconeModulo } from '@/lib/labels';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { MARCA } from '@/theme/applyTheme';

/* O widget usa MUI internamente: carregado só nesta tela. */
const PaymentWidget = lazy(() => import('@payment-system-mp/react-widget').then((m) => ({ default: m.PaymentWidget })));

/** Checkout da adesão: resumo calculado no servidor + PaymentWidget (Pix, cartão, boleto). */
export default function Checkout() {
  useTitulo('Pagamento da adesão');
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessao, recarregar } = useSession();
  const apiBaseUrl = checkoutBaseUrl(token);
  const [aprovado, setAprovado] = useState(false);

  const { data: resumo, error, isLoading } = useQuery({
    queryKey: ['checkout', token],
    queryFn: () => checkoutApi.resumo(token),
    retry: false,
    staleTime: 0,
  });

  const concluir = async () => {
    setAprovado(true);
    toast.ok('Pagamento aprovado! Sua conta está ativa.');
    qc.removeQueries({ queryKey: ['checkout', token] });
    const s = await recarregar();
    window.setTimeout(() => navigate(s ? rotaInicial(s.permissoes) : '/login', { replace: true }), 1400);
  };

  if (error) {
    const expirado = statusErro(error) === 401 || codigoErro(error) === 'CHECKOUT_INVALIDO';
    return <LinkInvalido expirado={expirado} logado={Boolean(sessao)} />;
  }
  if (resumo?.pago && !aprovado) return <Navigate to={sessao ? rotaInicial(sessao.permissoes) : '/login'} replace />;

  return (
    <div className="checkout container">
      <aside className="checkout__resumo" data-aos="fade-right">
        <span className="checkout__selo">
          <i className="bx bx-lock-alt" aria-hidden="true" /> Pagamento seguro
        </span>
        {isLoading || !resumo ? (
          <div className="stack">
            <Skeleton w="60%" h={22} />
            <Skeleton w="40%" h={40} />
            <Skeleton h={90} />
          </div>
        ) : (
          <>
            <h1 className="checkout__empresa">{resumo.empresa.nome}</h1>
            <p className="checkout__desc">{resumo.descricao}</p>
            <div className="checkout__total">
              <span className="num">{brl(resumo.valorCentavos)}</span>
              <small>/mês</small>
            </div>
            <ul className="checkout__modulos">
              {resumo.modulos.map((m) => (
                <li key={m.codigo}>
                  <i className={`bx ${iconeModulo(m.codigo)}`} aria-hidden="true" />
                  <span>{m.nome}</span>
                  <span className="num">{m.precoCentavos ? brl(m.precoCentavos) : 'incluso'}</span>
                </li>
              ))}
            </ul>
            <ul className="checkout__garantias">
              <li>
                <i className="bx bx-check-shield" aria-hidden="true" /> Valor calculado pelo servidor
              </li>
              <li>
                <i className="bx bx-bolt-circle" aria-hidden="true" /> Pix libera a conta em segundos
              </li>
              <li>
                <i className="bx bx-time-five" aria-hidden="true" /> Fechou a aba? Confirmamos em até 5 minutos
              </li>
            </ul>
          </>
        )}
      </aside>

      <section className="checkout__widget card" aria-label="Pagamento" data-aos="fade-up">
        {aprovado ? (
          <div className="checkout__ok" role="status">
            <span className="checkout__ok-icone" aria-hidden="true">
              <i className="bx bx-check" />
            </span>
            <h2 className="h-2">Pagamento confirmado</h2>
            <p className="muted">Estamos abrindo o seu painel.</p>
            <Spinner />
          </div>
        ) : resumo ? (
          <Suspense
            fallback={
              <div className="page-loader" style={{ minHeight: 420 }}>
                <Spinner label="Carregando pagamento" />
              </div>
            }
          >
            <PaymentWidget
              apiBaseUrl={apiBaseUrl}
              publicKey={resumo.publicKey}
              amount={resumo.valor}
              description={resumo.descricao}
              methods={resumo.metodos}
              theme="light"
              accentColor={MARCA.primaria}
              persistDraft={false}
              allowSaveCard={false}
              payer={sessao ? { email: sessao.usuario.email, firstName: sessao.usuario.nome.split(' ')[0], lastName: sessao.usuario.nome.split(' ').slice(1).join(' ') } : undefined}
              onPaymentApproved={() => void concluir()}
              onError={(e) => tratarErro(e, { silencioso: false })}
            />
          </Suspense>
        ) : (
          <div className="stack">
            <Skeleton h={48} r={14} />
            <Skeleton h={48} r={14} />
            <Skeleton h={220} r={18} />
          </div>
        )}
      </section>
    </div>
  );
}

/** Link expirado (72h) ou inválido: oferece gerar outro pelo login. */
function LinkInvalido({ expirado, logado }: { expirado: boolean; logado: boolean }) {
  const navigate = useNavigate();
  const [gerando, setGerando] = useState(false);
  const gerar = async () => {
    setGerando(true);
    try {
      const l = await authApi.checkoutLink();
      navigate(`/checkout/${encodeURIComponent(l.checkoutToken)}`, { replace: true });
    } catch (e) {
      tratarErro(e, { on: { ASSINATURA_JA_ATIVA: () => (navigate('/app'), true) } });
    } finally {
      setGerando(false);
    }
  };
  return (
    <div className="container status-page">
      <div className="status-page__card card card--pad" data-aos="zoom-in">
        <span className="status-page__icone status-page__icone--warning" aria-hidden="true">
          <i className="bx bx-link-alt" />
        </span>
        <h1 className="h-1">{expirado ? 'Este link de pagamento expirou' : 'Link de pagamento inválido'}</h1>
        <p className="muted">Os links valem por 72 horas. Entre na sua conta para gerar um novo, é rápido.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {logado ? (
            <Button icon="bx-refresh" loading={gerando} onClick={gerar}>
              Gerar novo link
            </Button>
          ) : (
            <ButtonLink to="/login" icon="bx-log-in">
              Entrar
            </ButtonLink>
          )}
          <Link to="/" className="btn btn--ghost">
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
