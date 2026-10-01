import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { despesasApi } from '@/api/endpoints/despesas';
import type { CategoriaDespesa, Despesa, DespesaPayload, FormaPagamento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MaskedInputs';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented, Tabs } from '@/components/ui/Tabs';
import { PALETA_CATEGORIAS } from '@/lib/chartTheme';
import { fmtData, hojeISO, limitesMes, MESES, partesNoFuso } from '@/lib/dates';
import { codigoErro, tratarErro } from '@/lib/errors';
import { useDebounce } from '@/lib/hooks';
import { FORMAS_PAGAMENTO, labelForma } from '@/lib/labels';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';

type Aba = 'lancamentos' | 'categorias';

/** Despesas do período (só PAGA entra no financeiro) e categorias com cor. */
export default function Despesas() {
  const [aba, setAba] = useState<Aba>('lancamentos');
  return (
    <div className="page">
      <PageHeader titulo="Despesas" descricao="Somente despesas pagas entram no resultado e no dashboard." />
      <Tabs<Aba>
        label="Seções de despesas"
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: 'lancamentos', label: 'Lançamentos', icon: 'bx-receipt' },
          { valor: 'categorias', label: 'Categorias', icon: 'bx-category' },
        ]}
      />
      {aba === 'lancamentos' ? <Lancamentos /> : <Categorias />}
    </div>
  );
}

function Lancamentos() {
  const { sessao } = useSession();
  const { podeEscrever } = usePermissao();
  const qc = useQueryClient();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const agora = partesNoFuso(new Date(), tz);
  const [ref, setRef] = useState({ ano: agora.ano, mes: agora.mes });
  const [categoriaId, setCategoriaId] = useState('');
  const [status, setStatus] = useState<'TODAS' | 'PAGA' | 'PENDENTE'>('TODAS');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ aberto: boolean; despesa?: Despesa }>({ aberto: false });
  const [excluir, setExcluir] = useState<Despesa | null>(null);
  const termo = useDebounce(busca.trim(), 300);
  const { inicio, fim } = limitesMes(ref.ano, ref.mes);
  const escrever = podeEscrever('despesas:escrever');

  const cats = useQuery({ queryKey: ['despesas', 'categorias'], queryFn: () => despesasApi.categorias() });
  const filtros = { inicio, fim, categoriaId: categoriaId || undefined, status: status === 'TODAS' ? undefined : status, busca: termo || undefined, page, perPage: 20 };
  const q = useQuery({ queryKey: ['despesas', 'lista', filtros], queryFn: () => despesasApi.listar(filtros), placeholderData: keepPreviousData });

  const mudarMes = (d: number) => {
    setPage(1);
    setRef(({ ano, mes }) => {
      const m = mes + d;
      return m < 1 ? { ano: ano - 1, mes: 12 } : m > 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: m };
    });
  };

  const invalidar = () => ['despesas', 'dashboard', 'financeiro'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const remover = useMutation({
    mutationFn: (d: Despesa) => despesasApi.remover(d.id),
    onSuccess: () => {
      invalidar();
      toast.ok('Despesa excluída.');
      setExcluir(null);
    },
    onError: (e) => tratarErro(e),
  });
  const pagar = useMutation({
    mutationFn: (d: Despesa) => despesasApi.atualizar(d.id, { status: 'PAGA' }),
    onSuccess: () => {
      invalidar();
      toast.ok('Despesa marcada como paga.');
    },
    onError: (e) => tratarErro(e),
  });

  return (
    <>
      <div className="toolbar" data-aos="fade-up">
        <div className="mes-nav">
          <Button variant="ghost" size="sm" iconOnly icon="bx-chevron-left" aria-label="Mês anterior" onClick={() => mudarMes(-1)} />
          <strong>
            {MESES[ref.mes - 1]} {ref.ano}
          </strong>
          <Button variant="ghost" size="sm" iconOnly icon="bx-chevron-right" aria-label="Próximo mês" onClick={() => mudarMes(1)} />
        </div>
        <Input aria-label="Buscar" placeholder="Buscar descrição" icon="bx-search" value={busca} onChange={(e) => (setBusca(e.target.value), setPage(1))} fieldClassName="toolbar__busca" />
        <Select aria-label="Categoria" value={categoriaId} onChange={(e) => (setCategoriaId(e.target.value), setPage(1))} fieldClassName="field--inline">
          <option value="">Todas as categorias</option>
          {(cats.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Segmented
          label="Status"
          valor={status}
          onChange={(v) => (setStatus(v), setPage(1))}
          opcoes={[
            { valor: 'TODAS', label: 'Todas' },
            { valor: 'PAGA', label: 'Pagas' },
            { valor: 'PENDENTE', label: 'Pendentes' },
          ]}
        />
        {escrever && (
          <Button icon="bx-plus" onClick={() => setForm({ aberto: true })} className="toolbar__cta">
            Lançar despesa
          </Button>
        )}
      </div>

      <section className="card card--pad" data-aos="fade-up" data-aos-delay="60">
        {q.error ? (
          <ErrorState erro={q.error} onTentar={() => q.refetch()} />
        ) : q.isLoading ? (
          <SkeletonRows />
        ) : !q.data?.items.length ? (
          <EmptyState
            icon="bx-receipt"
            titulo="Nenhuma despesa no período"
            texto="Lance aluguel, insumos, energia e o que mais sair do caixa."
            acao={
              escrever && (
                <Button icon="bx-plus" onClick={() => setForm({ aberto: true })}>
                  Lançar despesa
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Data</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th className="t-right">Valor</th>
                    {escrever && (
                      <th className="t-actions">
                        <span className="sr-only">Ações</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((d) => (
                    <tr key={d.id}>
                      <td className="t-primary">{d.descricao}</td>
                      <td data-label="Categoria">
                        <span className="cat-tag">
                          <i style={{ background: d.categoria.cor ?? 'var(--line-strong)' }} />
                          {d.categoria.nome}
                        </span>
                      </td>
                      <td data-label="Data" className="num">
                        {fmtData(d.data)}
                      </td>
                      <td data-label="Pagamento">{labelForma(d.formaPagamento)}</td>
                      <td data-label="Status">{d.status === 'PAGA' ? <Badge tom="success">Paga</Badge> : <Badge tom="warning">Pendente</Badge>}</td>
                      <td data-label="Valor" className="t-right num t-strong">
                        {brl(d.valorCentavos)}
                      </td>
                      {escrever && (
                        <td className="t-actions">
                          {d.status === 'PENDENTE' && (
                            <Button size="sm" variant="soft" icon="bx-check" loading={pagar.isPending && pagar.variables?.id === d.id} onClick={() => pagar.mutate(d)}>
                              Pagar
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" iconOnly icon="bx-edit-alt" aria-label={`Editar ${d.descricao}`} onClick={() => setForm({ aberto: true, despesa: d })} />
                          <Button size="sm" variant="ghost" iconOnly icon="bx-trash" aria-label={`Excluir ${d.descricao}`} onClick={() => setExcluir(d)} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="total-rodape">
              <span>Total do período (filtros aplicados)</span>
              <strong className="num">{brl(q.data.meta.totalValorCentavos ?? 0)}</strong>
            </div>
            <Pagination meta={q.data.meta} onPage={setPage} />
          </>
        )}
      </section>

      <DespesaFormModal aberto={form.aberto} despesa={form.despesa} categorias={cats.data ?? []} onFechar={() => setForm({ aberto: false })} />
      <ConfirmDialog
        aberto={Boolean(excluir)}
        onFechar={() => setExcluir(null)}
        onConfirmar={() => excluir && remover.mutate(excluir)}
        carregando={remover.isPending}
        perigo
        titulo="Excluir despesa"
        confirmar="Excluir"
        mensagem={`"${excluir?.descricao ?? ''}" será apagada do financeiro.`}
      />
    </>
  );
}

const schema = z.object({
  descricao: z.string().trim().min(2, 'Informe a descrição.').max(150),
  categoriaId: z.string().min(1, 'Escolha a categoria.'),
  valorCentavos: z.number().int().min(1, 'Informe o valor.'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data.'),
  formaPagamento: z.string().optional(),
  status: z.enum(['PAGA', 'PENDENTE']),
  observacao: z.string().max(1000).optional(),
});
type Form = z.infer<typeof schema>;

function DespesaFormModal({ aberto, despesa, categorias, onFechar }: { aberto: boolean; despesa?: Despesa; categorias: CategoriaDespesa[]; onFechar: () => void }) {
  const qc = useQueryClient();
  const { sessao } = useSession();
  const hoje = hojeISO(sessao?.empresa.fusoHorario);
  const { register, control, handleSubmit, reset, setError, formState } = useForm<Form>({ resolver: zodResolver(schema) });
  const e = formState.errors;

  useEffect(() => {
    if (!aberto) return;
    reset(
      despesa
        ? { descricao: despesa.descricao, categoriaId: despesa.categoria.id, valorCentavos: despesa.valorCentavos, data: despesa.data.slice(0, 10), formaPagamento: despesa.formaPagamento ?? '', status: despesa.status, observacao: despesa.observacao ?? '' }
        : { descricao: '', categoriaId: '', valorCentavos: 0, data: hoje, formaPagamento: '', status: 'PAGA', observacao: '' },
    );
  }, [aberto, despesa, reset, hoje]);

  const salvar = useMutation({
    mutationFn: (b: DespesaPayload) => (despesa ? despesasApi.atualizar(despesa.id, b) : despesasApi.criar(b)),
    onSuccess: () => {
      ['despesas', 'dashboard', 'financeiro'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.ok(despesa ? 'Despesa atualizada.' : 'Despesa lançada.');
      onFechar();
    },
    onError: (err) => tratarErro<Form>(err, { setError }),
  });

  const enviar = handleSubmit((v) =>
    salvar.mutate({
      descricao: v.descricao,
      categoriaId: v.categoriaId,
      valorCentavos: v.valorCentavos,
      data: v.data,
      formaPagamento: (v.formaPagamento || null) as FormaPagamento | null,
      status: v.status,
      observacao: v.observacao?.trim() || null,
    }),
  );

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={despesa ? 'Editar despesa' : 'Lançar despesa'}
      onSubmit={enviar}
      bloquearFechar={salvar.isPending}
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" icon="bx-check" loading={salvar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Input label="Descrição" required error={e.descricao?.message} {...register('descricao')} fieldClassName="span-2" data-autofocus />
        <Select label="Categoria" required error={e.categoriaId?.message} {...register('categoriaId')}>
          <option value="">Selecione</option>
          {categorias
            .filter((c) => c.ativo !== false || c.id === despesa?.categoria.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </Select>
        <Controller control={control} name="valorCentavos" render={({ field }) => <MoneyInput label="Valor" required value={field.value} onChange={field.onChange} error={e.valorCentavos?.message} />} />
        <Input label="Data" type="date" required error={e.data?.message} {...register('data')} />
        <Select label="Forma de pagamento" {...register('formaPagamento')}>
          <option value="">Não informar</option>
          {Object.entries(FORMAS_PAGAMENTO).map(([k, f]) => (
            <option key={k} value={k}>
              {f.label}
            </option>
          ))}
        </Select>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <div className="field span-2">
              <span className="field__label">Status</span>
              <Segmented
                label="Status"
                valor={field.value ?? 'PAGA'}
                onChange={field.onChange}
                opcoes={[
                  { valor: 'PAGA', label: 'Paga' },
                  { valor: 'PENDENTE', label: 'Pendente' },
                ]}
              />
            </div>
          )}
        />
        <Textarea label="Observação" rows={2} maxLength={1000} {...register('observacao')} fieldClassName="span-2" />
      </div>
    </Modal>
  );
}

/** CRUD de categorias de despesa (nome + cor). */
function Categorias() {
  const qc = useQueryClient();
  const { podeEscrever } = usePermissao();
  const escrever = podeEscrever('despesas:escrever');
  const q = useQuery({ queryKey: ['despesas', 'categorias', 'todas'], queryFn: () => despesasApi.categorias(true) });
  const [edit, setEdit] = useState<{ aberto: boolean; cat?: CategoriaDespesa }>({ aberto: false });
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(PALETA_CATEGORIAS[0]);
  const [erro, setErro] = useState<string>();
  const [excluir, setExcluir] = useState<CategoriaDespesa | null>(null);

  const invalidar = () => qc.invalidateQueries({ queryKey: ['despesas'] });
  const salvar = useMutation({
    mutationFn: () => (edit.cat ? despesasApi.atualizarCategoria(edit.cat.id, { nome: nome.trim(), cor }) : despesasApi.criarCategoria({ nome: nome.trim(), cor })),
    onSuccess: () => {
      invalidar();
      toast.ok('Categoria salva.');
      setEdit({ aberto: false });
    },
    onError: (e) => tratarErro(e, { on: { REGISTRO_DUPLICADO: () => (setErro('Já existe uma categoria com este nome.'), true) } }),
  });
  const alternar = useMutation({
    mutationFn: (c: CategoriaDespesa) => despesasApi.atualizarCategoria(c.id, { ativo: !c.ativo }),
    onSuccess: invalidar,
    onError: (e) => tratarErro(e),
  });
  const remover = useMutation({
    mutationFn: (c: CategoriaDespesa) => despesasApi.removerCategoria(c.id),
    onSuccess: () => {
      invalidar();
      toast.ok('Categoria excluída.');
      setExcluir(null);
    },
    onError: (e, c) => {
      setExcluir(null);
      if (codigoErro(e)?.includes('EM_USO') || codigoErro(e)?.includes('COM_DESPESAS')) {
        toast.info(`"${c.nome}" tem despesas. Desative a categoria em vez de excluir.`);
        return;
      }
      tratarErro(e);
    },
  });

  const abrir = (cat?: CategoriaDespesa) => {
    setNome(cat?.nome ?? '');
    setCor(cat?.cor ?? PALETA_CATEGORIAS[(q.data?.length ?? 0) % PALETA_CATEGORIAS.length]);
    setErro(undefined);
    setEdit({ aberto: true, cat });
  };

  return (
    <section className="card card--pad" data-aos="fade-up">
      <div className="row row--between" style={{ marginBottom: '1rem' }}>
        <p className="muted text-sm">Cores aparecem nos gráficos do dashboard e do financeiro.</p>
        {escrever && (
          <Button icon="bx-plus" size="sm" onClick={() => abrir()}>
            Nova categoria
          </Button>
        )}
      </div>
      {q.error ? (
        <ErrorState erro={q.error} onTentar={() => q.refetch()} />
      ) : q.isLoading ? (
        <SkeletonRows linhas={5} />
      ) : (
        <ul className="cat-grid">
          {(q.data ?? []).map((c) => (
            <li key={c.id} className={c.ativo === false ? 'is-off' : undefined}>
              <span className="cat-grid__cor" style={{ background: c.cor ?? 'var(--line-strong)' }} aria-hidden="true" />
              <span className="grow">
                <strong>{c.nome}</strong>
                {c.ativo === false && <small>desativada</small>}
              </span>
              {escrever && (
                <>
                  <Button size="sm" variant="ghost" iconOnly icon={c.ativo === false ? 'bx-show' : 'bx-hide'} aria-label={c.ativo === false ? `Ativar ${c.nome}` : `Desativar ${c.nome}`} onClick={() => alternar.mutate(c)} />
                  <Button size="sm" variant="ghost" iconOnly icon="bx-edit-alt" aria-label={`Editar ${c.nome}`} onClick={() => abrir(c)} />
                  <Button size="sm" variant="ghost" iconOnly icon="bx-trash" aria-label={`Excluir ${c.nome}`} onClick={() => setExcluir(c)} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={edit.aberto}
        onFechar={() => setEdit({ aberto: false })}
        tamanho="sm"
        titulo={edit.cat ? 'Editar categoria' : 'Nova categoria'}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (nome.trim().length < 2) return setErro('Informe o nome.');
          salvar.mutate();
        }}
        rodape={
          <>
            <Button variant="ghost" onClick={() => setEdit({ aberto: false })}>
              Cancelar
            </Button>
            <Button type="submit" icon="bx-check" loading={salvar.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="stack">
          <Input label="Nome" required maxLength={60} value={nome} error={erro} onChange={(e) => setNome(e.target.value)} data-autofocus />
          <div className="field">
            <span className="field__label">Cor</span>
            <div className="cores" role="radiogroup" aria-label="Cor">
              {PALETA_CATEGORIAS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cor === c} aria-label={c} className="cores__op" style={{ background: c }} onClick={() => setCor(c)} />
              ))}
              <input type="color" className="input" value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Outra cor" />
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        aberto={Boolean(excluir)}
        onFechar={() => setExcluir(null)}
        onConfirmar={() => excluir && remover.mutate(excluir)}
        carregando={remover.isPending}
        perigo
        titulo="Excluir categoria"
        confirmar="Excluir"
        mensagem="Só categorias sem despesas podem ser excluídas."
      />
    </section>
  );
}
