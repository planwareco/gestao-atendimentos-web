import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints/admin';
import type { AdminCatalogo as Catalogo } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MaskedInputs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/Switch';
import { tratarErro } from '@/lib/errors';
import { iconeModulo } from '@/lib/labels';
import { toast } from '@/lib/notify';

type Mod = Catalogo['modulos'][number];

/** Preços do plano Start e dos módulos (valem só para novos cadastros). */
export default function AdminCatalogo() {
  const q = useQuery({ queryKey: ['admin', 'catalogo'], queryFn: adminApi.catalogo });
  if (q.isLoading) return <PageLoader />;
  if (q.error || !q.data) return <ErrorState erro={q.error} onTentar={() => q.refetch()} />;
  return (
    <div className="page">
      <PageHeader titulo="Catálogo e preços" />
      <div className="callout callout--warning" data-aos="fade-up">
        <i className="bx bx-info-circle" aria-hidden="true" />
        <span>Os preços valem só para novos cadastros. Quem já contratou mantém o valor congelado.</span>
      </div>
      <PlanoCard plano={q.data.plano} />
      <ul className="catalogo">
        {q.data.modulos.map((m, i) => (
          <ModuloLinha key={m.codigo} m={m} delay={i * 50} />
        ))}
      </ul>
    </div>
  );
}

function PlanoCard({ plano }: { plano: Catalogo['plano'] }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(plano?.nome ?? 'Start');
  const [preco, setPreco] = useState(plano?.precoBaseCentavos ?? 0);
  const salvar = useMutation({
    mutationFn: () => adminApi.atualizarPlano({ precoBaseCentavos: preco, nome: nome.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'catalogo'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      toast.ok('Plano atualizado.');
    },
    onError: (e) => tratarErro(e),
  });
  return (
    <section className="card card--pad catalogo__plano" data-aos="fade-up">
      <div className="catalogo__icone" aria-hidden="true">
        <i className="bx bx-package" />
      </div>
      <Input label="Nome do plano" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
      <MoneyInput label="Preço base mensal" value={preco} onChange={setPreco} />
      <Button icon="bx-check" loading={salvar.isPending} onClick={() => salvar.mutate()}>
        Salvar
      </Button>
    </section>
  );
}

function ModuloLinha({ m, delay }: { m: Mod; delay: number }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ nome: m.nome, descricao: m.descricao ?? '', precoCentavos: m.precoCentavos, ativo: m.ativo, ordem: m.ordem });
  useEffect(() => setV({ nome: m.nome, descricao: m.descricao ?? '', precoCentavos: m.precoCentavos, ativo: m.ativo, ordem: m.ordem }), [m]);
  const mudou = v.nome !== m.nome || v.descricao !== (m.descricao ?? '') || v.precoCentavos !== m.precoCentavos || v.ativo !== m.ativo || v.ordem !== m.ordem;
  const salvar = useMutation({
    mutationFn: () => adminApi.atualizarModulo(m.codigo, { nome: v.nome.trim(), descricao: v.descricao.trim() || null, precoCentavos: v.precoCentavos, ativo: v.ativo, ordem: v.ordem }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'catalogo'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      toast.ok(`${v.nome} atualizado.`);
    },
    onError: (e) => tratarErro(e),
  });
  return (
    <li className="card card--pad catalogo__modulo" data-aos="fade-up" data-aos-delay={delay}>
      <div className="catalogo__icone" aria-hidden="true">
        <i className={`bx ${iconeModulo(m.codigo)}`} />
      </div>
      <div className="catalogo__campos">
        <div className="row">
          <code className="text-xs">{m.codigo}</code>
          {m.obrigatorio && <Badge tom="primary">obrigatório</Badge>}
        </div>
        <div className="form-grid form-grid--3">
          <Input label="Nome" value={v.nome} maxLength={80} onChange={(e) => setV({ ...v, nome: e.target.value })} />
          <MoneyInput label="Preço mensal" value={v.precoCentavos} onChange={(c) => setV({ ...v, precoCentavos: c })} />
          <Input label="Ordem" type="number" min={0} max={1000} value={v.ordem} onChange={(e) => setV({ ...v, ordem: Number(e.target.value) || 0 })} />
          <Input label="Descrição" value={v.descricao} maxLength={300} onChange={(e) => setV({ ...v, descricao: e.target.value })} fieldClassName="span-3" />
        </div>
        <div className="row row--between">
          <Switch checked={v.ativo} onChange={(a) => setV({ ...v, ativo: a })} label="Disponível para venda" disabled={m.obrigatorio} />
          <Button size="sm" icon="bx-check" disabled={!mudou} loading={salvar.isPending} onClick={() => salvar.mutate()}>
            Salvar
          </Button>
        </div>
      </div>
    </li>
  );
}
