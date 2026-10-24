import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Papel } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { ConfirmDialog } from '@/components/ui/Modal';
import { segmentoDemo } from '@/demo/modo';
import { PAPEIS } from '@/lib/labels';
import { toast } from '@/lib/notify';

const ROTA_DO_PAPEL: Record<Papel, string> = { PROPRIETARIO: '/app', RECEPCIONISTA: '/app/agenda', PROFISSIONAL: '/app/agenda' };

/** Faixa fixa da demonstração: deixa claro que é exemplo e dá as saídas (conta real, recomeçar, sair). */
export function DemoFaixa() {
  const { sessao, entrarDemo, sairDemo, verComoDemo } = useSession();
  const navigate = useNavigate();
  const [recomecar, setRecomecar] = useState(false);
  const [trocando, setTrocando] = useState(false);
  if (!sessao) return null;

  const trocarPapel = async (papel: Papel) => {
    setTrocando(true);
    try {
      await verComoDemo(papel);
      navigate(ROTA_DO_PAPEL[papel], { replace: true });
      toast.info(`Agora você vê o sistema como ${papel === 'PROPRIETARIO' ? 'dona do negócio' : PAPEIS[papel].label.toLowerCase()}.`);
    } finally {
      setTrocando(false);
    }
  };

  return (
    <div className="demo-faixa" role="region" aria-label="Modo demonstração">
      <span className="demo-faixa__selo">
        <i className="bx bxs-magic-wand" aria-hidden="true" /> <span className="hide-xs">Demonstração</span>
        <span className="so-xs">Demo</span>
      </span>
      <span className="demo-faixa__texto">Empresa de exemplo com dados fictícios. Fique à vontade para testar.</span>
      <label className="demo-faixa__papel">
        <span className="hide-sm">Ver como</span>
        <select value={sessao.usuario.papel} disabled={trocando} onChange={(e) => void trocarPapel(e.target.value as Papel)} aria-label="Ver o sistema como">
          {(Object.keys(PAPEIS) as Papel[]).map((p) => (
            <option key={p} value={p}>
              {p === 'PROPRIETARIO' ? 'Dona' : PAPEIS[p].label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="demo-faixa__acao" onClick={() => setRecomecar(true)}>
        <i className="bx bx-revision" aria-hidden="true" /> <span className="hide-sm">Recomeçar</span>
      </button>
      <Link to="/cadastro" className="demo-faixa__cta">
        Criar <span className="hide-xs">minha</span> conta <i className="bx bx-right-arrow-alt" aria-hidden="true" />
      </Link>
      <button
        type="button"
        className="demo-faixa__sair"
        aria-label="Sair da demonstração"
        title="Sair da demonstração"
        onClick={async () => {
          // Sai das telas do sistema antes de desligar a demo (nada busca na API real no caminho)
          navigate('/', { replace: true });
          await new Promise((r) => setTimeout(r, 50));
          await sairDemo();
        }}
      >
        <i className="bx bx-x" aria-hidden="true" />
      </button>

      <ConfirmDialog
        aberto={recomecar}
        onFechar={() => setRecomecar(false)}
        titulo="Recomeçar a demonstração?"
        confirmar="Recomeçar"
        mensagem="A empresa de exemplo volta ao começo. O que você marcou e cadastrou aqui é apagado."
        onConfirmar={async () => {
          setRecomecar(false);
          await entrarDemo(segmentoDemo() ?? 'SALAO_BELEZA');
          navigate('/app', { replace: true });
          toast.ok('Empresa de exemplo recomeçada.');
        }}
      />
    </div>
  );
}
