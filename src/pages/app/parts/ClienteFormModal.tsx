import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { clientesApi } from '@/api/endpoints/clientes';
import type { CamposExtras as Valores, Cliente, ClientePayload } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { CamposExtras, validarCamposExtras } from '@/components/CamposExtras';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { MaskedInput } from '@/components/ui/MaskedInputs';
import { Modal } from '@/components/ui/Modal';
import { tratarErro } from '@/lib/errors';
import { UFS } from '@/lib/labels';
import { maskCep, maskDocumento, maskTelefone } from '@/lib/masks';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';

const opc = z.string().trim().optional();
const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(150),
  telefone: opc.refine((v) => !v || (v.length >= 10 && v.length <= 13), 'Telefone com DDD.'),
  whatsapp: opc.refine((v) => !v || (v.length >= 10 && v.length <= 13), 'WhatsApp com DDD.'),
  email: opc.refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  documento: opc.refine((v) => !v || v.length === 11 || v.length === 14, 'CPF (11) ou CNPJ (14 dígitos).'),
  dataNascimento: opc,
  cep: opc.refine((v) => !v || v.length === 8, 'CEP com 8 dígitos.'),
  logradouro: opc,
  numero: opc,
  complemento: opc,
  bairro: opc,
  cidade: opc,
  estado: opc,
  observacoes: z.string().max(2000).optional(),
  status: z.enum(['ATIVO', 'INATIVO']),
});
type Form = z.infer<typeof schema>;

const vazio: Form = { nome: '', telefone: '', whatsapp: '', email: '', documento: '', dataNascimento: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', observacoes: '', status: 'ATIVO' };

/** Converte '' em null (o PUT da API usa null para limpar; ausente = não altera). */
const nulo = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

interface ViaCep {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

/** Cadastro/edição de cliente com máscaras, busca de CEP e campos do segmento. */
export function ClienteFormModal({ aberto, onFechar, cliente, onSalvo }: { aberto: boolean; onFechar: () => void; cliente?: Cliente | null; onSalvo?: (c: Cliente) => void }) {
  const r = useRotulos();
  const { sessao } = useSession();
  const qc = useQueryClient();
  const defs = sessao?.empresa.camposPersonalizados?.cliente;
  const [extras, setExtras] = useState<Valores>({});
  const [errosExtras, setErrosExtras] = useState<Record<string, string>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const { register, control, handleSubmit, reset, setError, setValue, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: vazio });
  const e = formState.errors;

  const clienteRef = useRef(cliente);
  clienteRef.current = cliente;
  useEffect(() => {
    if (!aberto) return;
    const cliente = clienteRef.current;
    setErrosExtras({});
    if (cliente) {
      reset({
        nome: cliente.nome,
        telefone: cliente.telefone ?? '',
        whatsapp: cliente.whatsapp ?? '',
        email: cliente.email ?? '',
        documento: cliente.documento ?? '',
        dataNascimento: cliente.dataNascimento?.slice(0, 10) ?? '',
        cep: cliente.cep ?? '',
        logradouro: cliente.logradouro ?? '',
        numero: cliente.numero ?? '',
        complemento: cliente.complemento ?? '',
        bairro: cliente.bairro ?? '',
        cidade: cliente.cidade ?? '',
        estado: cliente.estado ?? '',
        observacoes: cliente.observacoes ?? '',
        status: cliente.status,
      });
      setExtras(cliente.camposExtras ?? {});
    } else {
      reset(vazio);
      setExtras({});
    }
  }, [aberto, cliente?.id, reset]);

  const salvar = useMutation({
    mutationFn: (body: ClientePayload) => (cliente ? clientesApi.atualizar(cliente.id, body) : clientesApi.criar(body)),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.ok(cliente ? `${r.cliente} atualizado.` : `${r.cliente} cadastrado.`);
      onSalvo?.(c);
      onFechar();
    },
    onError: (err) =>
      tratarErro<Form>(err, {
        setError,
        on: {
          CAMPOS_EXTRAS_INVALIDOS: (b) => {
            const m: Record<string, string> = {};
            b.errors?.forEach((x) => (m[x.field.replace(/^(body\.)?camposExtras\./, '')] = x.message));
            setErrosExtras(m);
          },
        },
      }),
  });

  const buscarCep = async (cep: string) => {
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const { data } = await axios.get<ViaCep>(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 6000 });
      if (data.erro) return;
      if (data.logradouro) setValue('logradouro', data.logradouro);
      if (data.bairro) setValue('bairro', data.bairro);
      if (data.localidade) setValue('cidade', data.localidade);
      if (data.uf) setValue('estado', data.uf);
    } catch {
      /* ViaCEP fora do ar: preenchimento manual */
    } finally {
      setBuscandoCep(false);
    }
  };

  const enviar = handleSubmit((v) => {
    const ex = validarCamposExtras(defs, extras);
    setErrosExtras(ex);
    if (Object.keys(ex).length) return;
    salvar.mutate({
      nome: v.nome.trim(),
      telefone: nulo(v.telefone),
      whatsapp: nulo(v.whatsapp),
      email: nulo(v.email),
      documento: nulo(v.documento),
      dataNascimento: nulo(v.dataNascimento),
      cep: nulo(v.cep),
      logradouro: nulo(v.logradouro),
      numero: nulo(v.numero),
      complemento: nulo(v.complemento),
      bairro: nulo(v.bairro),
      cidade: nulo(v.cidade),
      estado: nulo(v.estado),
      observacoes: nulo(v.observacoes),
      status: v.status,
      camposExtras: extras,
    });
  });

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      tamanho="lg"
      titulo={cliente ? `Editar ${r.cliente.toLowerCase()}` : r.novo(r.cliente)}
      subtitulo="Só o nome é obrigatório. Quanto mais completo, melhores os lembretes e o histórico."
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
      <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
        <div className="form-section">
          <span className="form-section__title">
            <i className="bx bx-user" aria-hidden="true" /> Identificação
          </span>
          <div className="form-grid">
            <Input label="Nome completo" required error={e.nome?.message} {...register('nome')} fieldClassName="span-2" data-autofocus />
            <Controller control={control} name="whatsapp" render={({ field }) => <MaskedInput label="WhatsApp" inputMode="tel" icon="bxl-whatsapp" mask={maskTelefone} value={field.value} onChange={field.onChange} error={e.whatsapp?.message} />} />
            <Controller control={control} name="telefone" render={({ field }) => <MaskedInput label="Telefone" inputMode="tel" mask={maskTelefone} value={field.value} onChange={field.onChange} error={e.telefone?.message} />} />
            <Input label="E-mail" type="email" error={e.email?.message} {...register('email')} />
            <Controller control={control} name="documento" render={({ field }) => <MaskedInput label="CPF ou CNPJ" mask={maskDocumento} value={field.value} onChange={field.onChange} error={e.documento?.message} />} />
            <Input label="Data de nascimento" type="date" hint="Usada nos aniversariantes da semana." error={e.dataNascimento?.message} {...register('dataNascimento')} />
            {cliente && (
              <Select label="Situação" {...register('status')}>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </Select>
            )}
          </div>
        </div>

        {defs && defs.length > 0 && (
          <div className="form-section">
            <span className="form-section__title">
              <i className="bx bx-customize" aria-hidden="true" /> Informações do segmento
            </span>
            <CamposExtras defs={defs} valor={extras} onChange={setExtras} erros={errosExtras} />
          </div>
        )}

        <details className="form-section form-section--collapse">
          <summary className="form-section__title">
            <i className="bx bx-map" aria-hidden="true" /> Endereço
            <i className="bx bx-chevron-down" aria-hidden="true" />
          </summary>
          <div className="form-grid form-grid--3" style={{ marginTop: '1rem' }}>
            <Controller
              control={control}
              name="cep"
              render={({ field }) => (
                <MaskedInput
                  label="CEP"
                  mask={maskCep}
                  value={field.value}
                  hint={buscandoCep ? 'Buscando endereço...' : 'Preenche o endereço automaticamente.'}
                  onChange={(d) => {
                    field.onChange(d);
                    if (d.length === 8) void buscarCep(d);
                  }}
                  error={e.cep?.message}
                />
              )}
            />
            <Input label="Logradouro" {...register('logradouro')} fieldClassName="span-2" />
            <Input label="Número" {...register('numero')} />
            <Input label="Complemento" {...register('complemento')} />
            <Input label="Bairro" {...register('bairro')} />
            <Input label="Cidade" {...register('cidade')} fieldClassName="span-2" />
            <Select label="UF" {...register('estado')}>
              <option value="">-</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </details>

        <Textarea label="Observações" rows={3} maxLength={2000} {...register('observacoes')} />
      </div>
    </Modal>
  );
}
