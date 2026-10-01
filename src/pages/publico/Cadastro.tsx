import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicoApi } from '@/api/endpoints/publico';
import type { Segmento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { senhaForte } from '@/components/AlterarSenhaModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Field';
import { MaskedInput } from '@/components/ui/MaskedInputs';
import { Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';
import { tratarErro } from '@/lib/errors';
import { useDebounce, useTitulo } from '@/lib/hooks';
import { iconeModulo, SEGMENTOS_ICONE } from '@/lib/labels';
import { maskDocumento, maskTelefone } from '@/lib/masks';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';

const SEGMENTOS: Segmento[] = ['SALAO_BELEZA', 'BARBEARIA', 'ESTETICA', 'PETSHOP', 'FISIOTERAPIA', 'CONSULTORIA', 'OUTRO'];

const digitos = (min: number, max: number, msg: string) =>
  z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= min && v.length <= max), msg);

const schema = z
  .object({
    empresa: z.object({
      nome: z.string().trim().min(2, 'Informe o nome da empresa.').max(150),
      nomeFantasia: z.string().trim().max(150).optional(),
      documento: z
        .string()
        .optional()
        .refine((v) => !v || v.length === 11 || v.length === 14, 'CPF com 11 ou CNPJ com 14 dígitos.'),
      email: z.string().trim().toLowerCase().email('E-mail inválido.'),
      telefone: digitos(10, 13, 'Telefone com DDD.'),
      whatsapp: digitos(10, 13, 'WhatsApp com DDD.'),
      segmento: z.enum(['SALAO_BELEZA', 'BARBEARIA', 'ESTETICA', 'PETSHOP', 'FISIOTERAPIA', 'CONSULTORIA', 'OUTRO']),
    }),
    proprietario: z.object({
      nome: z.string().trim().min(2, 'Informe seu nome.').max(120),
      email: z.string().trim().toLowerCase().email('E-mail inválido.'),
      senha: senhaForte,
    }),
    confirmarSenha: z.string(),
    modulos: z.array(z.string()),
    aceiteTermos: z.boolean().refine((v) => v, 'É preciso aceitar os termos de uso.'),
  })
  .refine((v) => v.proprietario.senha === v.confirmarSenha, { path: ['confirmarSenha'], message: 'As senhas não conferem.' });

type Form = z.infer<typeof schema>;

const ETAPAS = [
  { titulo: 'Seu negócio', icone: 'bx-store-alt' },
  { titulo: 'Seu acesso', icone: 'bx-user-circle' },
  { titulo: 'Módulos', icone: 'bx-extension' },
] as const;

const CAMPOS_ETAPA: (keyof Form | `empresa.${string}` | `proprietario.${string}`)[][] = [
  ['empresa.nome', 'empresa.nomeFantasia', 'empresa.documento', 'empresa.email', 'empresa.telefone', 'empresa.whatsapp', 'empresa.segmento'],
  ['proprietario.nome', 'proprietario.email', 'proprietario.senha', 'confirmarSenha'],
  ['modulos', 'aceiteTermos'],
];

/** Cadastro em três etapas: cria a empresa PENDENTE + proprietário e segue para o checkout. */
export default function Cadastro() {
  useTitulo('Criar conta');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { abrirSessao } = useSession();
  const [etapa, setEtapa] = useState(0);
  const [emailEmUso, setEmailEmUso] = useState(false);

  const plano = useQuery({ queryKey: ['public', 'plano'], queryFn: publicoApi.plano, staleTime: 300_000 });
  const segmentos = useQuery({ queryKey: ['public', 'segmentos'], queryFn: publicoApi.segmentos, staleTime: 3_600_000 });

  const iniciais = useMemo(() => (params.get('modulos') ?? '').split(',').map((m) => m.trim().toUpperCase()).filter(Boolean), [params]);

  const { register, control, handleSubmit, trigger, watch, setError, formState, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      empresa: { nome: '', nomeFantasia: '', documento: '', email: '', telefone: '', whatsapp: '', segmento: 'SALAO_BELEZA' },
      proprietario: { nome: '', email: '', senha: '' },
      confirmarSenha: '',
      modulos: iniciais,
      aceiteTermos: false,
    },
  });
  const e = formState.errors;
  const modulos = watch('modulos');
  const segmento = watch('empresa.segmento');

  const chave = useDebounce([...modulos].sort().join(','), 300);
  const preco = useQuery({
    queryKey: ['public', 'preco', chave],
    queryFn: () => publicoApi.preco(chave ? chave.split(',') : []),
    enabled: plano.isSuccess,
    placeholderData: (p) => p,
  });

  const avancar = async () => {
    const ok = await trigger(CAMPOS_ETAPA[etapa] as Parameters<typeof trigger>[0]);
    if (ok) setEtapa((x) => Math.min(x + 1, ETAPAS.length - 1));
  };

  const enviar = handleSubmit(
    async (v) => {
      setEmailEmUso(false);
      const vazio = (x?: string) => (x ? x : undefined);
      try {
        const r = await publicoApi.cadastro({
          empresa: {
            nome: v.empresa.nome,
            nomeFantasia: vazio(v.empresa.nomeFantasia),
            documento: vazio(v.empresa.documento),
            email: v.empresa.email,
            telefone: vazio(v.empresa.telefone),
            whatsapp: vazio(v.empresa.whatsapp),
            segmento: v.empresa.segmento,
          },
          proprietario: v.proprietario,
          modulos: v.modulos,
          aceiteTermos: true,
        });
        abrirSessao(r.sessao);
        toast.ok('Conta criada! Falta só o pagamento da adesão.');
        navigate(`/checkout/${encodeURIComponent(r.checkoutToken)}`, { replace: true });
      } catch (err) {
        tratarErro<Form>(err, {
          setError,
          on: {
            EMAIL_EM_USO: () => {
              setEmailEmUso(true);
              setEtapa(1);
              setError('proprietario.email', { message: 'Este e-mail já tem uma conta.' });
              return true;
            },
            VALIDACAO: (b) => {
              const campo = b.errors?.[0]?.field.replace(/^body\./, '') ?? '';
              const idx = CAMPOS_ETAPA.findIndex((c) => c.some((x) => campo.startsWith(String(x))));
              if (idx >= 0) setEtapa(idx);
            },
          },
        });
      }
    },
    (erros) => {
      const idx = CAMPOS_ETAPA.findIndex((c) => c.some((x) => String(x).split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], erros)));
      if (idx >= 0) setEtapa(idx);
    },
  );

  const opcionais = (plano.data?.modulos ?? []).filter((m) => !m.obrigatorio);
  const alternar = (codigo: string) => setValue('modulos', modulos.includes(codigo) ? modulos.filter((m) => m !== codigo) : [...modulos, codigo], { shouldDirty: true });
  const nomeSegmento = (s: Segmento) => segmentos.data?.find((x) => x.codigo === s)?.nome ?? s.replace('_', ' ').toLowerCase();

  return (
    <div className="onboard container">
      <aside className="onboard__lado" data-aos="fade-right">
        <div className="onboard__mesh" aria-hidden="true" />
        <h1 className="onboard__titulo">Crie a conta da sua empresa</h1>
        <p className="onboard__sub">Você paga a adesão no próximo passo e a conta é liberada assim que o pagamento for confirmado.</p>

        <div className="onboard__resumo" aria-live="polite">
          <span className="onboard__resumo-label">Plano Start</span>
          <strong className="onboard__resumo-total num">
            {preco.data ? brl(preco.data.totalCentavos) : <Skeleton w={130} h={30} style={{ background: 'rgb(255 255 255 / .2)' }} />}
            <small>/mês</small>
          </strong>
          <ul>
            {preco.data && (
              <li>
                <span>Plano base</span>
                <span className="num">{brl(preco.data.precoBaseCentavos)}</span>
              </li>
            )}
            {preco.data?.modulos.map((m) => (
              <li key={m.codigo}>
                <span>{m.nome}</span>
                <span className="num">{m.precoCentavos ? brl(m.precoCentavos) : 'incluso'}</span>
              </li>
            ))}
          </ul>
        </div>

        <ol className="onboard__etapas" aria-label="Progresso">
          {ETAPAS.map((x, i) => (
            <li key={x.titulo} className={cn(i === etapa && 'is-atual', i < etapa && 'is-feita')} aria-current={i === etapa ? 'step' : undefined}>
              <span className="onboard__etapa-icone">
                <i className={cn('bx', i < etapa ? 'bx-check' : x.icone)} aria-hidden="true" />
              </span>
              {x.titulo}
            </li>
          ))}
        </ol>
      </aside>

      <form
        className="onboard__form card"
        noValidate
        data-aos="fade-up"
        onSubmit={(ev) => {
          if (etapa < ETAPAS.length - 1) {
            ev.preventDefault();
            void avancar();
          } else void enviar(ev);
        }}
      >
        <div className="onboard__progress" aria-hidden="true">
          <span style={{ width: `${((etapa + 1) / ETAPAS.length) * 100}%` }} />
        </div>

        {etapa === 0 && (
          <fieldset className="stack onboard__step" key="e0">
            <legend className="h-2">Conte sobre o seu negócio</legend>
            <div className="field">
              <span className="field__label">Segmento</span>
              <div className="seg-grid" role="radiogroup" aria-label="Segmento">
                {SEGMENTOS.map((s) => (
                  <label key={s} className={cn('seg-opcao', segmento === s && 'is-on')}>
                    <input type="radio" value={s} {...register('empresa.segmento')} />
                    <i className={cn('bx', SEGMENTOS_ICONE[s])} aria-hidden="true" />
                    <span>{nomeSegmento(s)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <Input label="Nome da empresa" required autoComplete="organization" error={e.empresa?.nome?.message} {...register('empresa.nome')} fieldClassName="span-2" />
              <Input label="Nome fantasia" hint="Opcional. Aparece no menu e nos orçamentos." error={e.empresa?.nomeFantasia?.message} {...register('empresa.nomeFantasia')} />
              <Controller
                control={control}
                name="empresa.documento"
                render={({ field }) => <MaskedInput label="CPF ou CNPJ" hint="Opcional." mask={maskDocumento} value={field.value} onChange={field.onChange} error={e.empresa?.documento?.message} />}
              />
              <Input label="E-mail da empresa" type="email" required autoComplete="email" error={e.empresa?.email?.message} {...register('empresa.email')} fieldClassName="span-2" />
              <Controller
                control={control}
                name="empresa.telefone"
                render={({ field }) => <MaskedInput label="Telefone" inputMode="tel" mask={maskTelefone} value={field.value} onChange={field.onChange} error={e.empresa?.telefone?.message} />}
              />
              <Controller
                control={control}
                name="empresa.whatsapp"
                render={({ field }) => <MaskedInput label="WhatsApp" inputMode="tel" icon="bxl-whatsapp" mask={maskTelefone} value={field.value} onChange={field.onChange} error={e.empresa?.whatsapp?.message} />}
              />
            </div>
          </fieldset>
        )}

        {etapa === 1 && (
          <fieldset className="stack onboard__step" key="e1">
            <legend className="h-2">Seu acesso de proprietário</legend>
            <div className="form-grid">
              <Input label="Seu nome" required autoComplete="name" error={e.proprietario?.nome?.message} {...register('proprietario.nome')} fieldClassName="span-2" />
              <Input label="Seu e-mail de login" type="email" required autoComplete="username" error={e.proprietario?.email?.message} {...register('proprietario.email')} fieldClassName="span-2" />
              <Input label="Senha" type="password" required autoComplete="new-password" hint="8 a 72 caracteres, com letras e números." error={e.proprietario?.senha?.message} {...register('proprietario.senha')} />
              <Input label="Confirmar senha" type="password" required autoComplete="new-password" error={e.confirmarSenha?.message} {...register('confirmarSenha')} />
            </div>
            {emailEmUso && (
              <div className="callout callout--warning">
                <i className="bx bx-info-circle" aria-hidden="true" />
                <span>
                  Já existe uma conta com este e-mail. <Link to="/login" className="btn btn--link">Entrar com ele</Link>
                </span>
              </div>
            )}
          </fieldset>
        )}

        {etapa === 2 && (
          <fieldset className="stack onboard__step" key="e2">
            <legend className="h-2">Escolha os módulos</legend>
            <p className="muted text-sm">O Núcleo já está incluso. Você pode pedir novos módulos ao suporte quando quiser.</p>
            <div className="stack" style={{ ['--gap' as string]: '0.6rem' }}>
              {plano.isLoading && <Skeleton h={70} r={16} />}
              {opcionais.map((m) => {
                const on = modulos.includes(m.codigo);
                return (
                  <button key={m.codigo} type="button" className={cn('modulo-card modulo-card--compact', on && 'is-on')} aria-pressed={on} onClick={() => alternar(m.codigo)}>
                    <span className="modulo-card__icon" aria-hidden="true">
                      <i className={cn('bx', iconeModulo(m.codigo))} />
                    </span>
                    <span className="modulo-card__text">
                      <strong>{m.nome}</strong>
                      {m.descricao && <small>{m.descricao}</small>}
                    </span>
                    <span className="modulo-card__preco num">+ {brl(m.precoCentavos)}</span>
                    <span className="modulo-card__toggle" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <Controller
              control={control}
              name="aceiteTermos"
              render={({ field }) => (
                <div className="field">
                  <Checkbox label="Li e aceito os termos de uso e a política de privacidade." checked={field.value} onChange={(ev) => field.onChange(ev.target.checked)} />
                  {e.aceiteTermos && (
                    <span className="field__error" role="alert">
                      <i className="bx bx-error-circle" aria-hidden="true" />
                      {e.aceiteTermos.message}
                    </span>
                  )}
                </div>
              )}
            />
            <div className="callout">
              <i className="bx bx-shield-quarter" aria-hidden="true" />
              <span>
                Segmento escolhido: <Badge tom="primary">{nomeSegmento(segmento)}</Badge>. Os rótulos e campos já vêm prontos e podem ser editados depois.
              </span>
            </div>
          </fieldset>
        )}

        <div className="onboard__acoes">
          {etapa > 0 ? (
            <Button variant="ghost" icon="bx-left-arrow-alt" onClick={() => setEtapa((x) => x - 1)}>
              Voltar
            </Button>
          ) : (
            <span className="text-sm muted">
              Já tem conta? <Link to="/login" className="btn btn--link">Entrar</Link>
            </span>
          )}
          {etapa < ETAPAS.length - 1 ? (
            <Button iconRight="bx-right-arrow-alt" onClick={avancar}>
              Continuar
            </Button>
          ) : (
            <Button type="submit" variant="accent" iconRight="bx-lock-open-alt" loading={formState.isSubmitting}>
              Criar conta e pagar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
