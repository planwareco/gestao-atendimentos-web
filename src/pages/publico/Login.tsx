import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '@/auth/SessionProvider';
import { rotaInicial } from '@/auth/guards';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { tratarErro } from '@/lib/errors';
import { useTitulo } from '@/lib/hooks';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  senha: z.string().min(1, 'Informe a senha.').max(72),
});
type Form = z.infer<typeof schema>;

/** Login dos usuários das empresas. */
export default function Login() {
  useTitulo('Entrar');
  const { sessao, carregando, login } = useSession();
  const navigate = useNavigate();
  const loc = useLocation();
  const [aviso, setAviso] = useState<{ tom: 'danger' | 'warning'; texto: string } | null>(null);
  const [verSenha, setVerSenha] = useState(false);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: '', senha: '' } });

  const destino = (loc.state as { from?: string } | null)?.from;

  if (carregando) return <PageLoader />;
  if (sessao) return <Navigate to={sessao.empresa.status === 'PENDENTE' ? '/pendente' : (destino ?? rotaInicial(sessao.permissoes))} replace />;

  const enviar = handleSubmit(async ({ email, senha }) => {
    setAviso(null);
    try {
      const s = await login(email, senha);
      if (s.empresa.status === 'PENDENTE') navigate('/pendente', { replace: true });
      else navigate(destino?.startsWith('/app') ? destino : rotaInicial(s.permissoes), { replace: true });
    } catch (err) {
      tratarErro(err, {
        on: {
          CREDENCIAIS_INVALIDAS: () => (setAviso({ tom: 'danger', texto: 'E-mail ou senha inválidos.' }), true),
          USUARIO_INATIVO: (b) => (setAviso({ tom: 'warning', texto: b.message }), true),
          EMPRESA_DESATIVADA: (b) => (setAviso({ tom: 'warning', texto: b.message }), true),
          RATE_LIMITED: () => (setAviso({ tom: 'warning', texto: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' }), true),
        },
      });
    }
  });

  return (
    <div className="auth">
      <div className="auth__form-lado">
        <Link to="/" className="auth__logo" aria-label="Página inicial">
          <Logo />
        </Link>
        <form className="auth__form" onSubmit={enviar} noValidate data-aos="fade-up">
          <div>
            <h1 className="h-1">Bem-vindo de volta</h1>
            <p className="muted">Entre para ver a agenda de hoje.</p>
          </div>
          {aviso && (
            <div className={`callout ${aviso.tom === 'warning' ? 'callout--warning' : ''}`} role="alert" style={aviso.tom === 'danger' ? { background: 'var(--danger-soft)' } : undefined}>
              <i className="bx bx-error-circle" aria-hidden="true" style={aviso.tom === 'danger' ? { color: 'var(--danger)' } : undefined} />
              <span>{aviso.texto}</span>
            </div>
          )}
          <Input label="E-mail" type="email" icon="bx-envelope" autoComplete="username" autoFocus required error={formState.errors.email?.message} {...register('email')} />
          <Input
            label="Senha"
            type={verSenha ? 'text' : 'password'}
            icon="bx-lock-alt"
            autoComplete="current-password"
            required
            error={formState.errors.senha?.message}
            suffix={
              <button type="button" className="btn btn--ghost btn--sm btn--icon" style={{ border: 0 }} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVerSenha((v) => !v)}>
                <i className={`bx ${verSenha ? 'bx-hide' : 'bx-show'}`} aria-hidden="true" />
              </button>
            }
            {...register('senha')}
          />
          <Button type="submit" size="lg" block iconRight="bx-right-arrow-alt" loading={formState.isSubmitting}>
            Entrar
          </Button>
          <p className="text-sm muted" style={{ textAlign: 'center' }}>
            Ainda não tem conta? <Link to="/cadastro" className="btn btn--link">Criar conta</Link>
            <br />
            <Link to="/demo" className="btn btn--link">
              <i className="bx bx-play-circle" aria-hidden="true" /> Testar grátis com uma empresa de exemplo
            </Link>
          </p>
        </form>
        <p className="auth__rodape text-xs subtle">Esqueceu a senha? Peça ao proprietário da conta para redefinir em Equipe.</p>
      </div>
      <div className="auth__arte" aria-hidden="true">
        <div className="auth__mesh" />
        <div className="auth__vidro">
          <span className="auth__vidro-hora num">09:00</span>
          <strong>Marina Albuquerque</strong>
          <span>Corte e escova · Confirmado</span>
        </div>
        <div className="auth__vidro auth__vidro--b">
          <span className="auth__vidro-hora num">10:30</span>
          <strong>Rafael Tenório</strong>
          <span>Barba completa · Agendado</span>
        </div>
        <p className="auth__frase">Sua agenda, seus clientes e o seu caixa no mesmo lugar.</p>
      </div>
    </div>
  );
}
