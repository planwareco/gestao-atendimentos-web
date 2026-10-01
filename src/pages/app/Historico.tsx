import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClientePicker, type ClienteEscolhido } from '@/components/ClientePicker';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { useRotulos } from '@/lib/rotulos';
import { ClientePainel } from './parts/ClientePainel';

/** Atalho: escolha um cliente e veja resumo e histórico sem sair da tela. */
export default function Historico() {
  const r = useRotulos();
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);
  return (
    <div className="page">
      <PageHeader titulo="Histórico" descricao={`Escolha ${r.artigo(r.cliente) === 'a' ? 'uma' : 'um'} ${r.cliente.toLowerCase()} para ver tudo o que já foi feito.`} />
      <div className="card card--pad historico-busca" data-aos="fade-up">
        <ClientePicker valor={cliente} onChange={setCliente} />
        {cliente && (
          <Link to={`/app/clientes/${cliente.id}`} className="btn btn--link btn--sm">
            Abrir ficha completa <i className="bx bx-right-arrow-alt" aria-hidden="true" />
          </Link>
        )}
      </div>
      {cliente ? (
        <ClientePainel key={cliente.id} clienteId={cliente.id} />
      ) : (
        <div className="card">
          <EmptyState icon="bx-search-alt" titulo={`Busque ${r.artigo(r.cliente) === 'a' ? 'uma' : 'um'} ${r.cliente.toLowerCase()}`} texto="Total gasto, frequência, situação de retorno e a linha do tempo aparecem aqui." />
        </div>
      )}
    </div>
  );
}
