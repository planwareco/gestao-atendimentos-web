import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useAdminSession } from '@/admin/AdminSessionProvider';
import { adminAuthApi } from '@/api/endpoints/admin';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { tratarErro } from '@/lib/errors';
import { useTitulo } from '@/lib/hooks';
import { toast } from '@/lib/notify';

/** Configuração obrigatória do 2FA (TOTP) no primeiro acesso do admin. */
export default function Configurar2fa() {
  useTitulo('Configurar 2FA');
  const { marcar2faAtivo, logout } = useAdminSession();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const gerar = useMutation({ mutationFn: adminAuthApi.configurar2fa, onError: (e) => tratarErro(e) });
  const ativar = useMutation({
    mutationFn: () => adminAuthApi.ativar2fa(codigo),
    onSuccess: () => {
      marcar2faAtivo();
      toast.ok('2FA ativado. A partir de agora o login pede o código.');
      navigate('/admin', { replace: true });
    },
    onError: (e) => tratarErro(e, { on: { CODIGO_2FA_INVALIDO: (b) => (setErro(b.message), true), MFA_NAO_CONFIGURADO: (b) => (setErro(b.message), true) } }),
  });

  return (
    <div className="admin-auth">
      <div className="admin-auth__card admin-auth__card--wide card card--pad" data-aos="zoom-in">
        <Logo />
        <h1 className="h-2">Proteja o acesso com 2FA</h1>
        <p className="muted text-sm">Obrigatório para o painel da plataforma. Use Google Authenticator, Authy, 1Password ou similar.</p>
        {!gerar.data ? (
          <Button icon="bx-qr" loading={gerar.isPending} onClick={() => gerar.mutate()}>
            Gerar QR Code
          </Button>
        ) : (
          <div className="mfa">
            <div className="mfa__qr">
              <QRCodeSVG value={gerar.data.otpauthUrl} size={184} level="M" marginSize={2} />
            </div>
            <div className="stack">
              <div>
                <span className="text-xs muted">Ou digite este código no app</span>
                <code className="mfa__segredo">{gerar.data.segredo}</code>
              </div>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!/^\d{6}$/.test(codigo)) return setErro('Digite os 6 números.');
                  setErro(null);
                  ativar.mutate();
                }}
              >
                <label className="field__label" htmlFor="otp">
                  Código gerado pelo app
                </label>
                <input id="otp" className="input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
                {erro && (
                  <span className="field__error" role="alert">
                    <i className="bx bx-error-circle" aria-hidden="true" />
                    {erro}
                  </span>
                )}
                <Button type="submit" icon="bx-check-shield" loading={ativar.isPending}>
                  Ativar 2FA
                </Button>
              </form>
            </div>
          </div>
        )}
        <button type="button" className="btn btn--link btn--sm" onClick={async () => (await logout(), navigate('/admin/login', { replace: true }))}>
          Sair
        </button>
      </div>
    </div>
  );
}
