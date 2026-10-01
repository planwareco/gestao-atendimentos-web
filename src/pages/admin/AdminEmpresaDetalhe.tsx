import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints/admin';
import type { Papel, StatusEmpresa } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusEmpresaBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Checkbox, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/Switch';
import { fmtDataHora, relativo } from '@/lib/dates';
import { tratarErro } from '@/lib/errors';
import { iconeModulo, PAPEIS, STATUS_EMPRESA } from '@/lib/labels';
import { maskDocumento, maskTelefone } from '@/lib/masks';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';

type NovoStatus = Exclude<StatusEmpresa, 'PENDENTE'>;
const ACOES: { status: NovoStatus; label: string; icone: string; variante: 'primary' | 'ghost' | 'danger' }[] = [
  { status: 'ATIVO', label: 'Ativar', icone: 'bx-check-circle', variante: 'primary' },
  { status: 'SOMENTE_LEITURA', label: 'Somente leitura', icone: 'bx-lock-alt', variante: 'ghost' },
  { status: 'DESATIVADO', label: 'Desativar', icone: 'bx-block', variante: 'danger' },
];

/** Detalhe da empresa: status (com motivo), módulos com recálculo, usuários e pagamentos. */
export default function AdminEmpresaDetalhe() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'empresa', id], queryFn: () => adminApi.empresa(id) });
  const cat = useQuery({ queryKey: ['admin', 'catalogo'], queryFn: adminApi.catalogo });
  const [mudar, setMudar] = useState<NovoStatus | null>(null);
  const [motivo, setMotivo] = useState('');
  const [modulos, setModulos] = useState<string[]>([]);
  const [recalcular, setRecalcular] = useState(true);
  const e = q.data;

  useEffect(() => {
    if (e) setModulos(e.modulos.filter((m) => m.ativo).map((m) => m.moduloCodigo));
  }, [e]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ['admin'] });
  const status = useMutation({
    mutationFn: () => adminApi.alterarStatus(id, mudar!, motivo.trim() || undefined),
    onSuccess: () => {
      invalidar();
      toast.ok(`Empresa agora está: ${STATUS_EMPRESA[mudar!].label.toLowerCase()}.`);
      setMudar(null);
      setMotivo('');
    },
    onError: (err) => tratarErro(err),
  });
  const salvarModulos = useMutation({
    mutationFn: () => adminApi.definirModulos(id, modulos, recalcular),
    onSuccess: () => {
      invalidar();
      toast.ok('Módulos atualizados. As permissões mudam na hora.');
    },
    onError: (err) => tratarErro(err),
  });
  const usuario = useMutation({
    mutationFn: (p: { usuarioId: string; ativo?: boolean; papel?: Papel }) => adminApi.alterarUsuario(id, p.usuarioId, { ativo: p.ativo, papel: p.papel }),
    onSuccess: () => {
      invalidar();
      toast.ok('Usuário atualizado.');
    },
    onError: (err) => tratarErro(err),
  });

  const catalogo = cat.data;
  const novoValor = useMemo(() => {
    if (!catalogo?.plano) return null;
    const set = new Set(modulos);
    return catalogo.plano.precoBaseCentavos + catalogo.modulos.filter((m) => m.obrigatorio || set.has(m.codigo)).reduce((a, m) => a + m.precoCentavos, 0);
  }, [catalogo, modulos]);
  const mudouModulos = e && JSON.stringify([...modulos].sort()) !== JSON.stringify(e.modulos.filter((m) => m.ativo).map((m) => m.moduloCodigo).sort());

  if (q.isLoading) return <PageLoader />;
  if (q.error || !e) return <ErrorState erro={q.error} onTentar={() => q.refetch()} />;

  return (
    <div className="page">
      <PageHeader
        titulo={e.nomeFantasia ?? e.nome}
        voltar={
          <Link to="/admin/empresas" className="voltar">
            <i className="bx bx-left-arrow-alt" aria-hidden="true" /> Empresas
          </Link>
        }
        descricao={<StatusEmpresaBadge status={e.status} />}
        acoes={
          <div className="row">
            {ACOES.filter((a) => a.status !== e.status).map((a) => (
              <Button key={a.status} variant={a.variante === 'danger' ? 'danger-ghost' : a.variante} icon={a.icone} onClick={() => setMudar(a.status)}>
                {a.label}
              </Button>
            ))}
          </div>
        }
      />

      {e.motivoStatus && (
        <div className="callout callout--warning">
          <i className="bx bx-info-circle" aria-hidden="true" />
          <span>
            <strong>Motivo registrado:</strong> {e.motivoStatus}
          </span>
        </div>
      )}

      <div className="admin-detalhe">
        <section className="card card--pad" data-aos="fade-up">
          <h2 className="card__title">Dados</h2>
          <dl className="perfil__dados">
            <div>
              <dt>Razão social</dt>
              <dd>{e.nome}</dd>
            </div>
            <div>
              <dt>Documento</dt>
              <dd className="num">{e.documento ? maskDocumento(e.documento) : '-'}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{e.email}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd className="num">{maskTelefone(e.whatsapp ?? e.telefone) || '-'}</dd>
            </div>
            <div>
              <dt>Segmento</dt>
              <dd>{e.segmento.replace('_', ' ').toLowerCase()}</dd>
            </div>
            <div>
              <dt>Mensalidade</dt>
              <dd className="num">{brl(e.valorMensalCentavos)}</dd>
            </div>
            <div>
              <dt>Ativada em</dt>
              <dd className="num">{e.ativadoEm ? fmtDataHora(e.ativadoEm) : '-'}</dd>
            </div>
            <div>
              <dt>Uso</dt>
              <dd>
                {e.totais.clientes} clientes · {e.totais.atendimentos} atendimentos · {e.totais.orcamentos} orçamentos
              </dd>
            </div>
          </dl>
        </section>

        <section className="card card--pad stack" data-aos="fade-up" data-aos-delay="60">
          <h2 className="card__title">Módulos e permissões</h2>
          <ul className="admin-modulos">
            {(catalogo?.modulos ?? []).map((m) => (
              <li key={m.codigo}>
                <Checkbox
                  label={
                    <span className="row" style={{ ['--gap' as string]: '0.4rem' }}>
                      <i className={`bx ${iconeModulo(m.codigo)}`} aria-hidden="true" /> {m.nome} <span className="muted num">{m.precoCentavos ? brl(m.precoCentavos) : 'incluso'}</span>
                    </span>
                  }
                  checked={m.obrigatorio || modulos.includes(m.codigo)}
                  disabled={m.obrigatorio}
                  onChange={(ev) => setModulos((x) => (ev.target.checked ? [...x, m.codigo] : x.filter((c) => c !== m.codigo)))}
                />
              </li>
            ))}
          </ul>
          <Switch checked={recalcular} onChange={setRecalcular} label="Recalcular a mensalidade" descricao={novoValor !== null ? `Novo valor: ${brl(novoValor)} (preços atuais do catálogo)` : undefined} />
          <div>
            <Button icon="bx-check" disabled={!mudouModulos} loading={salvarModulos.isPending} onClick={() => salvarModulos.mutate()}>
              Salvar módulos
            </Button>
          </div>
        </section>

        <section className="card card--pad admin-detalhe__full" data-aos="fade-up">
          <h2 className="card__title">Usuários</h2>
          <div className="table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Papel</th>
                  <th>Último acesso</th>
                  <th>Acesso</th>
                </tr>
              </thead>
              <tbody>
                {e.usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="t-primary">
                      <span className="cell-pessoa">
                        <Avatar nome={u.nome} size={30} />
                        <span>
                          {u.nome}
                          <small>{u.email}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Papel">
                      <Select aria-label={`Papel de ${u.nome}`} value={u.papel} onChange={(ev) => usuario.mutate({ usuarioId: u.id, papel: ev.target.value as Papel })} fieldClassName="field--inline">
                        {(Object.keys(PAPEIS) as Papel[]).map((p) => (
                          <option key={p} value={p}>
                            {PAPEIS[p].label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td data-label="Último acesso">{u.ultimoLoginEm ? relativo(u.ultimoLoginEm) : 'Nunca'}</td>
                    <td data-label="Acesso">
                      <button type="button" role="switch" className="switch" aria-checked={u.ativo} aria-label={`Acesso de ${u.nome}`} onClick={() => usuario.mutate({ usuarioId: u.id, ativo: !u.ativo })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card card--pad admin-detalhe__full" data-aos="fade-up">
          <h2 className="card__title">Pagamentos da adesão</h2>
          {!e.pagamentosAssinatura.length ? (
            <p className="muted text-sm">Nenhum pagamento iniciado.</p>
          ) : (
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th className="t-right">Valor</th>
                    <th>Criado</th>
                    <th>Aprovado</th>
                  </tr>
                </thead>
                <tbody>
                  {e.pagamentosAssinatura.map((p) => (
                    <tr key={p.id}>
                      <td className="t-primary num">{p.gatewayPaymentId}</td>
                      <td data-label="Método">{p.metodo ?? '-'}</td>
                      <td data-label="Status">
                        <Badge tom={p.status === 'APPROVED' ? 'success' : ['REJECTED', 'CANCELLED', 'REFUNDED', 'CHARGED_BACK'].includes(p.status) ? 'danger' : 'warning'}>{p.status}</Badge>
                      </td>
                      <td data-label="Valor" className="t-right num">
                        {brl(p.valorCentavos)}
                      </td>
                      <td data-label="Criado" className="num">
                        {fmtDataHora(p.criadoEm)}
                      </td>
                      <td data-label="Aprovado" className="num">
                        {p.aprovadoEm ? fmtDataHora(p.aprovadoEm) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Modal
        aberto={Boolean(mudar)}
        onFechar={() => setMudar(null)}
        tamanho="sm"
        titulo={mudar ? `${ACOES.find((a) => a.status === mudar)?.label}?` : ''}
        subtitulo={
          mudar === 'DESATIVADO'
            ? 'Bloqueia o login e encerra todas as sessões. Os dados ficam guardados.'
            : mudar === 'SOMENTE_LEITURA'
              ? 'A empresa consulta tudo, mas não cria nem altera nada.'
              : e.status === 'PENDENTE'
                ? 'Ativa manualmente (ex.: pagou por fora). A ação fica na auditoria.'
                : 'Libera leitura e escrita normalmente.'
        }
        bloquearFechar={status.isPending}
        rodape={
          <>
            <Button variant="ghost" onClick={() => setMudar(null)} disabled={status.isPending}>
              Voltar
            </Button>
            <Button variant={mudar === 'DESATIVADO' ? 'danger' : 'primary'} loading={status.isPending} onClick={() => status.mutate()}>
              Confirmar
            </Button>
          </>
        }
      >
        <Textarea label="Motivo" hint="Fica registrado na empresa e na auditoria." placeholder="Ex.: Mensalidade de outubro em aberto" maxLength={300} rows={3} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} data-autofocus />
      </Modal>
    </div>
  );
}
