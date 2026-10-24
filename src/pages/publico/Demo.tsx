import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Segmento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { Logo } from '@/components/Logo';
import { CATALOGOS } from '@/demo/catalogos';
import { SEGMENTOS_DEMO } from '@/demo/modo';
import { cn } from '@/lib/cn';
import { useTitulo } from '@/lib/hooks';

const PASSOS = ['Cadastrando serviços e profissionais', 'Marcando 4 meses de atendimentos', 'Organizando a agenda desta semana', 'Fechando o financeiro do mês'];

/**
 * Porta de entrada da demonstração: a pessoa escolhe o tipo de negócio e o sistema abre
 * com uma empresa de exemplo. Tudo roda no navegador, sem cadastro.
 */
export default function Demo() {
  useTitulo('Testar grátis');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { entrarDemo } = useSession();
  const inicial = (params.get('segmento') ?? '').toUpperCase() as Segmento;
  const [escolhido, setEscolhido] = useState<Segmento | null>(SEGMENTOS_DEMO.includes(inicial) ? inicial : null);
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState(false);
  const iniciou = useRef(false);

  const reduzir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ritmo = reduzir ? 120 : 520;

  // Progresso visual dos passos
  useEffect(() => {
    if (!escolhido || erro) return;
    const t = window.setInterval(() => setPasso((p) => Math.min(p + 1, PASSOS.length - 1)), ritmo);
    return () => window.clearInterval(t);
  }, [escolhido, erro, ritmo]);

  // Monta a empresa uma única vez (o StrictMode roda efeitos duas vezes em desenvolvimento)
  useEffect(() => {
    if (!escolhido || iniciou.current) return;
    iniciou.current = true;
    const inicio = Date.now();
    entrarDemo(escolhido)
      .then(async (s) => {
        if (!s) throw new Error('sem sessão');
        // Deixa a pessoa ver o que está sendo montado, sem prender quem tem pressa
        const falta = PASSOS.length * ritmo - (Date.now() - inicio);
        if (falta > 0) await new Promise((r) => setTimeout(r, falta));
        setPasso(PASSOS.length);
        await new Promise((r) => setTimeout(r, reduzir ? 0 : 350));
        navigate('/app?boasVindas=1', { replace: true });
      })
      .catch(() => setErro(true));
  }, [escolhido, entrarDemo, navigate, ritmo, reduzir]);

  return (
    <main className="demo-entrada">
      <header className="demo-entrada__topo">
        <Link to="/" aria-label="Simbora Gerir, página inicial">
          <Logo />
        </Link>
        <Link to="/cadastro" className="btn btn--ghost btn--sm">
          Criar minha conta
        </Link>
      </header>

      {!escolhido ? (
        <section className="demo-entrada__corpo" aria-labelledby="demo-titulo">
          <span className="demo-entrada__selo">
            <i className="bx bx-gift" aria-hidden="true" /> Grátis, sem cadastro e sem cartão
          </span>
          <h1 id="demo-titulo" className="h-display">
            Teste o Simbora Gerir com uma empresa de exemplo
          </h1>
          <p className="demo-entrada__sub">
            Escolha o seu tipo de negócio. Você entra no sistema completo, com agenda cheia, clientes, orçamentos e financeiro de mentira, e pode mexer em tudo.
          </p>
          <ul className="seg-grid demo-entrada__segmentos" aria-label="Tipos de negócio">
            {SEGMENTOS_DEMO.map((s) => (
              <li key={s}>
              <button type="button" className="seg-opcao" onClick={() => setEscolhido(s)}>
                <i className={cn('bx', CATALOGOS[s].icone)} aria-hidden="true" />
                <span>
                  <strong>{CATALOGOS[s].nome}</strong>
                  <small>{CATALOGOS[s].resumo}</small>
                </span>
                <i className="bx bx-right-arrow-alt demo-entrada__seta" aria-hidden="true" />
              </button>
              </li>
            ))}
          </ul>
          <p className="demo-entrada__nota">
            <i className="bx bx-shield-quarter" aria-hidden="true" /> Os dados ficam só neste navegador e somem quando você fecha a aba. Nada é cobrado nem enviado.
          </p>
        </section>
      ) : (
        <section className="demo-entrada__corpo demo-carregando" aria-live="polite" aria-busy={!erro}>
          <span className="demo-carregando__icone" aria-hidden="true">
            <i className={cn('bx', CATALOGOS[escolhido].icone)} />
          </span>
          <h1 className="h-1">{erro ? 'Não deu para montar a demonstração' : `Montando ${CATALOGOS[escolhido].empresa}`}</h1>
          {erro ? (
            <>
              <p className="demo-entrada__sub">Seu navegador bloqueou o armazenamento desta página. Saia do modo anônimo ou libere os dados do site e tente de novo.</p>
              <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
                Tentar de novo
              </button>
            </>
          ) : (
            <>
              <div className="demo-carregando__barra" role="progressbar" aria-valuemin={0} aria-valuemax={PASSOS.length} aria-valuenow={Math.min(passo, PASSOS.length)} aria-label="Progresso">
                <span style={{ width: `${(Math.min(passo, PASSOS.length) / PASSOS.length) * 100}%` }} />
              </div>
              <ol className="demo-carregando__passos">
                {PASSOS.map((t, i) => (
                  <li key={t} className={cn(i < passo && 'is-feito', i === passo && 'is-atual')}>
                    <span className="demo-carregando__marca" aria-hidden="true">
                      {i < passo ? <i className="bx bx-check" /> : null}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </main>
  );
}
