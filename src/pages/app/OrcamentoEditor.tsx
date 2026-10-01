import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import { servicosApi } from '@/api/endpoints/servicos';
import type { OrcamentoPayload } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { ClientePicker, type ClienteEscolhido } from '@/components/ClientePicker';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MaskedInputs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { hojeISO, somarDias } from '@/lib/dates';
import { tratarErro } from '@/lib/errors';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';
import { ClienteFormModal } from './parts/ClienteFormModal';
import { numeroOrcamento } from './Orcamentos';

interface Item {
  tipo: 'SERVICO' | 'AVULSO';
  servicoId: string;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
}
interface Form {
  cliente: ClienteEscolhido | null;
  data: string;
  validade: string;
  itens: Item[];
  descontoCentavos: number;
  acrescimoCentavos: number;
  observacoes: string;
}

const itemVazio: Item = { tipo: 'SERVICO', servicoId: '', descricao: '', quantidade: 1, valorUnitarioCentavos: 0 };

/** Criação/edição de orçamento: itens do catálogo ou avulsos, com prévia do total. */
export default function OrcamentoEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const r = useRotulos();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessao } = useSession();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const [erros, setErros] = useState<Record<string, string>>({});
  const [novoCliente, setNovoCliente] = useState(false);

  const orc = useQuery({ queryKey: ['orcamentos', id], queryFn: () => orcamentosApi.obter(id!), enabled: Boolean(id) });
  const servicos = useQuery({ queryKey: ['servicos', 'ativos'], queryFn: () => servicosApi.listar({ status: 'ATIVO', perPage: 100 }), staleTime: 60_000 });
  const mapa = useMemo(() => new Map((servicos.data?.items ?? []).map((s) => [s.id, s])), [servicos.data]);

  const pre = params.get('clienteId');
  const { control, register, handleSubmit, reset, setValue } = useForm<Form>({
    defaultValues: {
      cliente: pre ? { id: pre, nome: params.get('clienteNome') ?? r.cliente } : null,
      data: hojeISO(tz),
      validade: somarDias(hojeISO(tz), 15),
      itens: [itemVazio],
      descontoCentavos: 0,
      acrescimoCentavos: 0,
      observacoes: '',
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });
  const v = useWatch({ control });

  useEffect(() => {
    const o = orc.data;
    if (!o) return;
    reset({
      cliente: { id: o.cliente.id, nome: o.cliente.nome },
      data: o.data.slice(0, 10),
      validade: o.validade?.slice(0, 10) ?? '',
      itens: o.itens.map((i) => ({ tipo: i.servicoId ? 'SERVICO' : 'AVULSO', servicoId: i.servicoId ?? '', descricao: i.descricao, quantidade: i.quantidade, valorUnitarioCentavos: i.valorUnitarioCentavos })),
      descontoCentavos: o.descontoCentavos,
      acrescimoCentavos: o.acrescimoCentavos,
      observacoes: o.observacoes ?? '',
    });
  }, [orc.data, reset]);

  const subtotal = (v.itens ?? []).reduce((a, i) => a + (i?.valorUnitarioCentavos ?? 0) * (i?.quantidade ?? 1), 0);
  const total = Math.max(0, subtotal - (v.descontoCentavos ?? 0) + (v.acrescimoCentavos ?? 0));

  const salvar = useMutation({
    mutationFn: (b: OrcamentoPayload) => (id ? orcamentosApi.atualizar(id, b) : orcamentosApi.criar(b)),
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.ok(id ? 'Orçamento atualizado.' : `Orçamento ${numeroOrcamento(o.numero)} criado.`);
      navigate(`/app/orcamentos/${o.id}`, { replace: true });
    },
    onError: (e) => tratarErro(e, { on: { DESCONTO_INVALIDO: (b) => setErros((x) => ({ ...x, desconto: b.message })) } }),
  });

  const enviar = handleSubmit((f) => {
    const e: Record<string, string> = {};
    if (!f.cliente) e.cliente = `Escolha o ${r.cliente.toLowerCase()}.`;
    f.itens.forEach((i, idx) => {
      if (i.tipo === 'SERVICO' && !i.servicoId) e[`item${idx}`] = `Escolha o ${r.servico.toLowerCase()}.`;
      if (i.tipo === 'AVULSO' && (!i.descricao.trim() || i.valorUnitarioCentavos <= 0)) e[`item${idx}`] = 'Informe descrição e valor.';
    });
    if (f.validade && f.validade < f.data) e.validade = 'A validade precisa ser depois da data.';
    if (f.descontoCentavos > subtotal) e.desconto = 'O desconto não pode ser maior que o subtotal.';
    setErros(e);
    if (Object.keys(e).length) return;
    salvar.mutate({
      clienteId: f.cliente!.id,
      data: f.data,
      validade: f.validade || null,
      observacoes: f.observacoes.trim() || null,
      descontoCentavos: f.descontoCentavos,
      acrescimoCentavos: f.acrescimoCentavos,
      itens: f.itens.map((i) => {
        if (i.tipo === 'AVULSO') return { descricao: i.descricao.trim(), quantidade: i.quantidade || 1, valorUnitarioCentavos: i.valorUnitarioCentavos };
        const s = mapa.get(i.servicoId);
        return { servicoId: i.servicoId, quantidade: i.quantidade || 1, ...(s && s.valorCentavos !== i.valorUnitarioCentavos ? { valorUnitarioCentavos: i.valorUnitarioCentavos } : {}) };
      }),
    });
  });

  if (id && orc.isLoading) return <PageLoader />;
  if (orc.error) return <ErrorState erro={orc.error} onTentar={() => orc.refetch()} />;
  if (orc.data && !['RASCUNHO', 'ENVIADO'].includes(orc.data.status)) {
    return (
      <div className="page">
        <div className="callout callout--warning">
          <i className="bx bx-lock-alt" aria-hidden="true" />
          <span>
            Só orçamentos em rascunho ou enviados podem ser editados. <Link to={`/app/orcamentos/${id}`} className="btn btn--link">Voltar ao orçamento</Link>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        titulo={id && orc.data ? `Editar orçamento ${numeroOrcamento(orc.data.numero)}` : 'Novo orçamento'}
        voltar={
          <Link to={id ? `/app/orcamentos/${id}` : '/app/orcamentos'} className="voltar">
            <i className="bx bx-left-arrow-alt" aria-hidden="true" /> Orçamentos
          </Link>
        }
      />

      <form className="editor" onSubmit={enviar} noValidate>
        <div className="editor__main stack" style={{ ['--gap' as string]: '1.25rem' }}>
          <section className="card card--pad stack" data-aos="fade-up">
            <div className="form-grid form-grid--3">
              <div className="span-3">
                <Controller control={control} name="cliente" render={({ field }) => <ClientePicker valor={field.value} onChange={field.onChange} error={erros.cliente} onNovo={() => setNovoCliente(true)} disabled={Boolean(id)} />} />
              </div>
              <Input label="Data" type="date" required {...register('data')} />
              <Input label="Validade" type="date" hint="Depois dela, o orçamento enviado expira." error={erros.validade} {...register('validade')} />
            </div>
          </section>

          <section className="card card--pad stack" data-aos="fade-up" data-aos-delay="60" aria-labelledby="itens-t">
            <h2 className="card__title" id="itens-t">
              <i className="bx bx-list-ul" aria-hidden="true" /> Itens
            </h2>
            <div className="orc-itens">
              {fields.map((f, idx) => {
                const tipo = v.itens?.[idx]?.tipo ?? 'SERVICO';
                return (
                  <div key={f.id} className="orc-item">
                    <Controller
                      control={control}
                      name={`itens.${idx}.tipo`}
                      render={({ field }) => (
                        <Segmented
                          label="Tipo do item"
                          valor={field.value}
                          onChange={field.onChange}
                          opcoes={[
                            { valor: 'SERVICO', label: 'Do catálogo' },
                            { valor: 'AVULSO', label: 'Avulso' },
                          ]}
                        />
                      )}
                    />
                    <div className="orc-item__campos">
                      {tipo === 'SERVICO' ? (
                        <Controller
                          control={control}
                          name={`itens.${idx}.servicoId`}
                          render={({ field }) => (
                            <Select
                              label={r.servico}
                              value={field.value}
                              fieldClassName="orc-item__desc"
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                const s = mapa.get(e.target.value);
                                if (s) setValue(`itens.${idx}.valorUnitarioCentavos`, s.valorCentavos);
                              }}
                            >
                              <option value="">Selecione</option>
                              {(servicos.data?.items ?? []).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.nome}
                                </option>
                              ))}
                            </Select>
                          )}
                        />
                      ) : (
                        <Input label="Descrição" maxLength={150} fieldClassName="orc-item__desc" {...register(`itens.${idx}.descricao`)} />
                      )}
                      <Input label="Qtd." type="number" min={1} max={1000} fieldClassName="orc-item__qtd" {...register(`itens.${idx}.quantidade`, { valueAsNumber: true })} />
                      <Controller control={control} name={`itens.${idx}.valorUnitarioCentavos`} render={({ field }) => <MoneyInput label="Valor unit." value={field.value} onChange={field.onChange} fieldClassName="orc-item__valor" />} />
                      <div className="orc-item__total">
                        <span className="text-xs muted">Total</span>
                        <strong className="num">{brl((v.itens?.[idx]?.valorUnitarioCentavos ?? 0) * (v.itens?.[idx]?.quantidade ?? 1))}</strong>
                      </div>
                      <Button variant="ghost" size="sm" iconOnly icon="bx-trash" aria-label="Remover item" disabled={fields.length === 1} onClick={() => remove(idx)} />
                    </div>
                    {erros[`item${idx}`] && (
                      <span className="field__error" role="alert">
                        <i className="bx bx-error-circle" aria-hidden="true" />
                        {erros[`item${idx}`]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="row">
              <Button variant="soft" size="sm" icon="bx-plus" onClick={() => append(itemVazio)}>
                Item do catálogo
              </Button>
              <Button variant="ghost" size="sm" icon="bx-plus" onClick={() => append({ ...itemVazio, tipo: 'AVULSO' })}>
                Item avulso
              </Button>
            </div>
            <p className="text-xs muted">Itens avulsos precisam ser vinculados a um {r.servico.toLowerCase()} antes de converter o orçamento em agendamento.</p>
          </section>

          <section className="card card--pad" data-aos="fade-up" data-aos-delay="120">
            <Textarea label="Observações" hint="Aparecem no PDF." rows={3} maxLength={2000} {...register('observacoes')} />
          </section>
        </div>

        <aside className="editor__lado card card--pad" aria-live="polite">
          <h2 className="card__title">Resumo</h2>
          <dl className="detalhe__valores">
            <div>
              <dt>Subtotal</dt>
              <dd className="num">{brl(subtotal)}</dd>
            </div>
          </dl>
          <Controller control={control} name="descontoCentavos" render={({ field }) => <MoneyInput label="Desconto" value={field.value} onChange={field.onChange} error={erros.desconto} />} />
          <Controller control={control} name="acrescimoCentavos" render={({ field }) => <MoneyInput label="Acréscimo" value={field.value} onChange={field.onChange} />} />
          <div className="editor__total">
            <span>Total</span>
            <strong className="num">{brl(total)}</strong>
          </div>
          <Button type="submit" block icon="bx-check" loading={salvar.isPending}>
            {id ? 'Salvar alterações' : 'Criar orçamento'}
          </Button>
          <p className="text-xs muted">O total oficial é calculado pela API ao salvar.</p>
        </aside>
      </form>

      <ClienteFormModal aberto={novoCliente} onFechar={() => setNovoCliente(false)} onSalvo={(c) => setValue('cliente', { id: c.id, nome: c.nome })} />
    </div>
  );
}
