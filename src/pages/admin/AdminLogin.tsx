import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminSession } from '@/admin/AdminSessionProvider';
import { adminAuthApi } from '@/api/endpoints/admin';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { tratarErro } from '@/lib/errors';
import { useTitulo } from '@/lib/hooks';

/** Login do super admin em duas etapas (senha + TOTP). */
export default function AdminLogin() {
  useTitulo('Admin');
  const { admin, carregando, abrir, mfaPendente } = useAdminSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <PageLoader />;
  if (admin) return <Navigate to={mfaPendente ? '/admin/configurar-2fa' : '/admin'} replace />;

  const etapa1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await adminAuthApi.login(email.trim(), senha);
      if ('mfaObrigatorio' in r) setMfaToken(r.mfaToken);
      else {
        abrir(r);
        navigate(r.mfaConfiguracaoObrigatoria ? '/admin/configurar-2fa' : '/admin', { replace: true });
      }
    } catch (err) {
      tratarErro(err, { on: { CREDENCIAIS_INVALIDAS: (b) => (setErro(b.message), true), ADMIN_INATIVO: (b) => (setErro(b.message), true) } });
    } finally {
      setEnviando(false);
    }
  };

  const etapa2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo)) return setErro('Digite os 6 números do app autenticador.');
    setErro(null);
    setEnviando(true);
    try {
      const s = await adminAuthApi.verificar2fa(mfaToken!, codigo);
      abrir(s);
      navigate('/admin', { replace: true });
    } catch (err) {
      tratarErro(err, {
        on: {
          CODIGO_2FA_INVALIDO: (b) => (setErro(b.message), setCodigo(''), true),
          MFA_TOKEN_INVALIDO: (b) => (setErro(b.message), setMfaToken(null), true),
        },
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="admin-auth">
      <div className="admin-auth__card card card--pad" data-aos="zoom-in">
        <Logo />
        <span className="badge badge--primary" style={{ alignSelf: 'flex-start' }}>
          <i className="bx bx-shield-quarter" aria-hidden="true" /> Admin da plataforma
        </span>
        {erro && (
          <div className="callout callout--warning" role="alert">
            <i className="bx bx-error" aria-hidden="true" />
            <span>{erro}</span>
          </div>
        )}
        {!mfaToken ? (
          <form className="stack" onSubmit={etapa1} noValidate>
            <h1 className="h-2">Entrar</h1>
            <Input label="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <Input label="Senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            <Button type="submit" block loading={enviando} iconRight="bx-right-arrow-alt">
              Continuar
            </Button>
          </form>
        ) : (
          <form className="stack" onSubmit={etapa2} noValidate>
            <h1 className="h-2">Código de verificação</h1>
            <p className="muted text-sm">Abra o app autenticador e digite o código de 6 números.</p>
            <input
              className="input otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Código de 6 dígitos"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />
            <Button type="submit" block loading={enviando} icon="bx-check-shield">
              Verificar
            </Button>
            <button type="button" className="btn btn--link btn--sm" onClick={() => (setMfaToken(null), setCodigo(''))}>
              Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
