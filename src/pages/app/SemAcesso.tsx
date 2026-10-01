import { useSession } from '@/auth/SessionProvider';
import { rotaInicial } from '@/auth/guards';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { useTitulo } from '@/lib/hooks';

/** Rota sem permissão para o papel do usuário. */
export default function SemAcesso() {
  useTitulo('Sem acesso');
  const { sessao } = useSession();
  return (
    <div className="page">
      <div className="card">
        <EmptyState
          icon="bx-lock-alt"
          titulo="Seu perfil não acessa esta área"
          texto="Peça ao proprietário da conta para ajustar o seu papel na equipe."
          acao={<ButtonLink to={sessao ? rotaInicial(sessao.permissoes) : '/app'} icon="bx-home-alt">Voltar ao início</ButtonLink>}
        />
      </div>
    </div>
  );
}
