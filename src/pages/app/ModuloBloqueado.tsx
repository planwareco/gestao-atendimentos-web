import { Navigate, useParams } from 'react-router-dom';
import type { Modulo } from '@/api/types';
import { usePermissao } from '@/auth/usePermissao';
import { LockedModule } from '@/components/LockedModule';
import { PageHeader } from '@/components/ui/PageHeader';
import { MODULOS } from '@/lib/labels';

const DESTINO: Record<Modulo, string> = { NUCLEO: '/app', ORCAMENTOS: '/app/orcamentos', FINANCEIRO: '/app/financeiro', MULTI_PROFISSIONAL: '/app/profissionais' };

/** Upsell: módulo não contratado. */
export default function ModuloBloqueado() {
  const { codigo = '' } = useParams();
  const { temModulo } = usePermissao();
  const m = codigo as Modulo;
  if (!MODULOS[m]) return <Navigate to="/app" replace />;
  if (temModulo(m)) return <Navigate to={DESTINO[m]} replace />;
  return (
    <div className="page">
      <PageHeader titulo={MODULOS[m].label} descricao="Este módulo ainda não faz parte do seu plano." />
      <div className="card card--pad" data-aos="fade-up">
        <LockedModule modulo={m} />
      </div>
    </div>
  );
}
