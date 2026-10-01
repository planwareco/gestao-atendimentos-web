import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/endpoints/auth';
import { tratarErro } from '@/lib/errors';
import { toast } from '@/lib/notify';
import { Button } from './ui/Button';
import { Input } from './ui/Field';
import { Modal } from './ui/Modal';

export const senhaForte = z
  .string()
  .min(8, 'Mínimo de 8 caracteres.')
  .max(72, 'Máximo de 72 caracteres.')
  .regex(/[A-Za-z]/, 'Use letras e números.')
  .regex(/\d/, 'Use letras e números.');

const schema = z
  .object({ senhaAtual: z.string().min(1, 'Informe a senha atual.'), novaSenha: senhaForte, confirmar: z.string() })
  .refine((v) => v.novaSenha === v.confirmar, { path: ['confirmar'], message: 'As senhas não conferem.' });
type Form = z.infer<typeof schema>;

/** Troca da própria senha (PUT /auth/senha). Encerra as outras sessões. */
export function AlterarSenhaForm({ onFeito }: { onFeito?: () => void }) {
  const { register, handleSubmit, setError, reset, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { senhaAtual: '', novaSenha: '', confirmar: '' } });
  const enviar = handleSubmit(async (v) => {
    try {
      const r = await authApi.alterarSenha(v.senhaAtual, v.novaSenha);
      toast.ok(r.message ?? 'Senha alterada.');
      reset();
      onFeito?.();
    } catch (e) {
      tratarErro(e, { setError, on: { SENHA_ATUAL_INCORRETA: (b) => (setError('senhaAtual', { message: b.message }), true) } });
    }
  });
  return (
    <form onSubmit={enviar} noValidate className="stack" style={{ maxWidth: 440 }}>
      <Input label="Senha atual" type="password" autoComplete="current-password" required error={formState.errors.senhaAtual?.message} {...register('senhaAtual')} />
      <Input label="Nova senha" type="password" autoComplete="new-password" required hint="8 a 72 caracteres, com letras e números." error={formState.errors.novaSenha?.message} {...register('novaSenha')} />
      <Input label="Confirmar nova senha" type="password" autoComplete="new-password" required error={formState.errors.confirmar?.message} {...register('confirmar')} />
      <div>
        <Button type="submit" icon="bx-lock-alt" loading={formState.isSubmitting}>
          Alterar senha
        </Button>
      </div>
    </form>
  );
}

export function AlterarSenhaModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Alterar senha" subtitulo="Por segurança, as outras sessões abertas serão encerradas." tamanho="sm">
      <AlterarSenhaForm onFeito={onFechar} />
    </Modal>
  );
}
