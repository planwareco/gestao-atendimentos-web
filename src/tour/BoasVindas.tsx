import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '@/auth/SessionProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { useRotulos } from '@/lib/rotulos';
import { useTour } from './TourProvider';

const chave = (id: string) => `simbora:boas-vindas:${id}`;

/**
 * Primeira vez no sistema (ou entrada na demonstração): convida para o tour.
 * Quem fecha não vê de novo; o tour continua na Central de ajuda.
 */
export function BoasVindas() {
  const { sessao, demo } = useSession();
  const tour = useTour();
  const r = useRotulos();
  const [params, setParams] = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const id = demo ? 'demo' : sessao?.usuario.id;

  useEffect(() => {
    if (!id || !tour) return;
    const pedido = params.get('boasVindas') === '1';
    let jaViu = false;
    try {
      jaViu = localStorage.getItem(chave(id)) === '1';
    } catch {
      jaViu = true;
    }
    if (pedido || !jaViu) setAberto(true);
    if (pedido) {
      const p = new URLSearchParams(params);
      p.delete('boasVindas');
      setParams(p, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fechar = () => {
    setAberto(false);
    try {
      if (id) localStorage.setItem(chave(id), '1');
    } catch {
      /* ok */
    }
  };
  const comecar = (trilha: string) => {
    fechar();
    tour?.iniciar(trilha);
  };

  if (!sessao || !tour) return null;
  const nome = sessao.usuario.nome.split(' ')[0];
  const empresa = sessao.empresa.nomeFantasia ?? sessao.empresa.nome;
  const geral = tour.disponiveis.find((t) => t.id === 'primeiros-passos') ?? tour.disponiveis.find((t) => t.id === 'agenda');
  const atalhos = [
    { trilha: 'agenda', icone: 'bx-calendar-plus', texto: `Marcar um ${r.atendimento.toLowerCase()}` },
    { trilha: 'clientes', icone: 'bx-user-plus', texto: `Cadastrar ${r.artigo(r.cliente) === 'a' ? 'uma' : 'um'} ${r.cliente.toLowerCase()}` },
    { trilha: 'orcamentos', icone: 'bx-file', texto: 'Fazer um orçamento' },
  ].filter((a) => tour.disponiveis.some((t) => t.id === a.trilha));

  const titulo = demo ? 'Sua empresa de exemplo está pronta' : `Boas-vindas, ${nome}!`;
  return (
    <Modal aberto={aberto} onFechar={fechar} titulo={<span className="sr-only">{titulo}</span>} tamanho="sm">
      <div className="boas-vindas">
        <span className="boas-vindas__selo" aria-hidden="true">
          <i className={cn('bx', demo ? 'bxs-magic-wand' : 'bx-rocket')} />
        </span>
        <p className="h-2" aria-hidden="true">
          {titulo}
        </p>
        <p className="muted">
          {demo
            ? `${empresa} é uma empresa de exemplo, com a agenda da semana cheia e 4 meses de ${r.atendimentos.toLowerCase()}, ${r.clientes.toLowerCase()} e despesas. Pode marcar, cadastrar e mexer à vontade: nada aqui é de verdade.`
            : 'Sua empresa já está no Simbora Gerir. Quer conhecer o sistema em 1 minuto, com a gente mostrando cada parte na tela?'}
        </p>
        <div className="boas-vindas__acoes">
          {geral && (
            <Button block size="lg" icon="bx-play-circle" data-autofocus onClick={() => comecar(geral.id)}>
              Fazer o tour ({geral.duracao})
            </Button>
          )}
          <Button block variant="ghost" onClick={fechar}>
            Explorar sozinho
          </Button>
        </div>
        {atalhos.length > 0 && (
          <div className="boas-vindas__atalhos">
            <span className="text-xs muted">Ou vá direto ao que interessa:</span>
            <div className="row" style={{ ['--gap' as string]: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {atalhos.map((a) => (
                <button key={a.trilha} type="button" className="chip" onClick={() => comecar(a.trilha)}>
                  <i className={cn('bx', a.icone)} aria-hidden="true" /> {a.texto}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs muted">O passo a passo fica sempre no botão Ajuda, no topo.</p>
      </div>
    </Modal>
  );
}
