import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, DatesSetArg, EventClickArg, EventContentArg, EventDropArg, EventInput } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { type EventResizeDoneArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { agendaApi } from '@/api/endpoints/agenda';
import { atendimentosApi } from '@/api/endpoints/atendimentos';
import { profissionaisApi } from '@/api/endpoints/profissionais';
import type { Atendimento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { resumoCamposExtras } from '@/components/CamposExtras';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { codigoErro, tratarErro } from '@/lib/errors';
import { useMedia } from '@/lib/hooks';
import { STATUS_ATENDIMENTO } from '@/lib/labels';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';
import { AtendimentoDetalheModal } from './parts/AtendimentoDetalheModal';
import { AtendimentoFormModal, useInvalidarAtendimentos, type InicialAtendimento } from './parts/AtendimentoFormModal';

type Visao = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth' | 'listWeek';

interface Remarcacao {
  id: string;
  inicio: string;
  fim?: string;
  revert: () => void;
}

/** Agenda: visão dia/semana/mês/lista, arrastar para remarcar, clique para marcar. */
export default function Agenda() {
  const r = useRotulos();
  const { sessao } = useSession();
  const { pode, podeEscrever, temModulo } = usePermissao();
  const invalidar = useInvalidarAtendimentos();
  const [params, setParams] = useSearchParams();
  const calRef = useRef<FullCalendar>(null);
  const celular = useMedia('(max-width: 767px)');
  const [visao, setVisao] = useState<Visao>(celular ? 'listWeek' : 'timeGridWeek');
  const [periodo, setPeriodo] = useState<{ inicio: string; fim: string; titulo: string } | null>(null);
  const [profissionalId, setProfissionalId] = useState('');
  const [cancelados, setCancelados] = useState(false);
  const [form, setForm] = useState<{ aberto: boolean; atendimento?: Atendimento | null; inicial?: InicialAtendimento }>({ aberto: false });
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [remarcar, setRemarcar] = useState<Remarcacao | null>(null);

  const filtraProf = temModulo('MULTI_PROFISSIONAL') && pode('atendimentos:todos');
  const escrever = podeEscrever('atendimentos:escrever');
  const defs = sessao?.empresa.camposPersonalizados?.atendimento;

  const profs = useQuery({ queryKey: ['profissionais', 'ativos'], queryFn: () => profissionaisApi.listar({ status: 'ATIVO', perPage: 100 }), enabled: filtraProf });
  const agenda = useQuery({
    queryKey: ['agenda', periodo?.inicio, periodo?.fim, profissionalId, cancelados],
    queryFn: () => agendaApi.listar({ inicio: periodo!.inicio, fim: periodo!.fim, profissionalId: profissionalId || undefined, incluirCancelados: cancelados }),
    enabled: Boolean(periodo),
    placeholderData: (p) => p,
  });

  // Links profundos: ?novo=1 abre o formulário, ?atendimento=ID abre o detalhe
  useEffect(() => {
    if (params.get('novo') === '1' && escrever) {
      setForm({ aberto: true, inicial: {} });
      params.delete('novo');
      setParams(params, { replace: true });
    }
    const id = params.get('atendimento');
    if (id) {
      setDetalhe(id);
      params.delete('atendimento');
      setParams(params, { replace: true });
    }
  }, [params, setParams, escrever]);

  // Troca de visão programática (segmentado e responsivo)
  useEffect(() => {
    calRef.current?.getApi().changeView(visao);
  }, [visao]);
  useEffect(() => {
    if (celular && (visao === 'timeGridWeek' || visao === 'dayGridMonth')) setVisao('listWeek');
  }, [celular, visao]);

  const eventos: EventInput[] = useMemo(
    () =>
      (agenda.data ?? []).map((a) => {
        const editavel = escrever && (a.status === 'AGENDADO' || a.status === 'CONFIRMADO');
        return {
          id: a.id,
          start: a.inicio,
          end: a.fim,
          title: `${a.cliente.nome} · ${a.itens.map((i) => i.descricao).join(', ')}`,
          backgroundColor: a.profissional?.cor ?? undefined,
          borderColor: a.profissional?.cor ?? undefined,
          editable: editavel,
          classNames: [`ev--${a.status.toLowerCase()}`, a.encaixe ? 'ev--encaixe' : '', a.profissional?.cor ? 'ev--cor' : ''],
          extendedProps: { a },
        };
      }),
    [agenda.data, escrever],
  );

  const mover = useMutation({
    mutationFn: (p: { id: string; inicio: string; fim?: string; encaixe?: boolean }) => atendimentosApi.atualizar(p.id, { inicio: p.inicio, ...(p.fim ? { fim: p.fim } : {}), ...(p.encaixe ? { encaixe: true } : {}) }),
    onSuccess: () => {
      void invalidar();
      setRemarcar(null);
      toast.ok(`${r.atendimento} remarcado.`);
    },
  });

  const aoMover = (info: EventDropArg | EventResizeDoneArg, comFim: boolean) => {
    const ev = info.event;
    const p = { id: ev.id, inicio: ev.start!.toISOString(), fim: comFim && ev.end ? ev.end.toISOString() : undefined };
    mover.mutate(p, {
      onError: (err) => {
        if (codigoErro(err) === 'AGENDA_CONFLITO') {
          setRemarcar({ ...p, revert: info.revert });
          return;
        }
        info.revert();
        tratarErro(err);
      },
    });
  };

  const conteudo = (arg: EventContentArg) => {
    const a = arg.event.extendedProps.a as Atendimento;
    const extra = resumoCamposExtras(defs, a.camposExtras, 1);
    if (arg.view.type.startsWith('list')) {
      return (
        <div className="ev-list">
          <strong>{a.cliente.nome}</strong>
          <span>{a.itens.map((i) => i.descricao).join(', ')}</span>
          {extra && <span className="ev-list__extra">{extra}</span>}
          <span className={cn('badge', `badge--${STATUS_ATENDIMENTO[a.status].tom}`)}>{STATUS_ATENDIMENTO[a.status].label}</span>
          {a.profissional && <span className="ev-list__prof">{a.profissional.nome}</span>}
          <span className="num ev-list__valor">{brl(a.totalCentavos)}</span>
        </div>
      );
    }
    return (
      <div className="ev">
        <span className="ev__hora num">{arg.timeText}</span>
        <strong className="ev__cliente">{a.cliente.nome}</strong>
        <span className="ev__servicos">{extra ? `${extra} · ` : ''}{a.itens.map((i) => i.descricao).join(', ')}</span>
        {a.status === 'CONFIRMADO' && <i className="bx bx-check ev__ok" aria-label="Confirmado" />}
      </div>
    );
  };

  const api = () => calRef.current?.getApi();

  return (
    <div className="page page--agenda">
      <PageHeader titulo="Agenda" descricao="Clique num horário vazio para marcar. Arraste para remarcar." />

      <div className="agenda-toolbar card" data-aos="fade-up">
        <div className="row">
          <Button variant="ghost" size="sm" iconOnly icon="bx-chevron-left" aria-label="Anterior" onClick={() => api()?.prev()} />
          <Button variant="ghost" size="sm" onClick={() => api()?.today()}>
            Hoje
          </Button>
          <Button variant="ghost" size="sm" iconOnly icon="bx-chevron-right" aria-label="Próximo" onClick={() => api()?.next()} />
          <strong className="agenda-toolbar__titulo">{periodo?.titulo}</strong>
          {agenda.isFetching && <span className="spinner" style={{ width: 16, height: 16 }} aria-label="Atualizando" />}
        </div>
        <div className="row agenda-toolbar__filtros">
          {filtraProf && (
            <Select aria-label="Profissional" value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} fieldClassName="field--inline">
              <option value="">Todos os profissionais</option>
              {(profs.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          )}
          <label className="check text-sm">
            <input type="checkbox" checked={cancelados} onChange={(e) => setCancelados(e.target.checked)} />
            <span>Cancelados</span>
          </label>
          <Segmented<Visao>
            label="Visualização"
            valor={visao}
            onChange={setVisao}
            opcoes={
              celular
                ? [
                    { valor: 'listWeek', label: 'Lista' },
                    { valor: 'timeGridDay', label: 'Dia' },
                  ]
                : [
                    { valor: 'timeGridDay', label: 'Dia' },
                    { valor: 'timeGridWeek', label: 'Semana' },
                    { valor: 'dayGridMonth', label: 'Mês' },
                    { valor: 'listWeek', label: 'Lista' },
                  ]
            }
          />
        </div>
      </div>

      {agenda.error && <ErrorState erro={agenda.error} onTentar={() => agenda.refetch()} />}

      {filtraProf && (profs.data?.items.length ?? 0) > 0 && (
        <div className="legenda legenda--prof" aria-label="Cores dos profissionais">
          {profs.data!.items.map((p) => (
            <span key={p.id}>
              <i style={{ background: p.cor ?? 'var(--secondary)' }} /> {p.nome}
            </span>
          ))}
        </div>
      )}

      <div className="agenda card" data-aos="fade-up" data-aos-delay="60">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
          locale={ptBrLocale}
          timeZone="local"
          initialView={visao}
          headerToolbar={false}
          height="auto"
          allDaySlot={false}
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          snapDuration="00:05:00"
          scrollTime="08:00:00"
          expandRows
          dayMaxEvents={3}
          selectable={escrever}
          selectMirror
          editable={escrever}
          eventDurationEditable={escrever}
          businessHours={{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: '08:00', endTime: '19:00' }}
          events={eventos}
          eventContent={conteudo}
          noEventsContent={`Nenhum ${r.atendimento.toLowerCase()} neste período.`}
          datesSet={(arg: DatesSetArg) => setPeriodo({ inicio: arg.start.toISOString(), fim: arg.end.toISOString(), titulo: arg.view.title })}
          select={(arg: DateSelectArg) => {
            arg.view.calendar.unselect();
            if (arg.view.type === 'dayGridMonth') {
              const d = new Date(arg.start);
              d.setHours(9, 0, 0, 0);
              setForm({ aberto: true, inicial: { inicio: d.toISOString(), profissionalId: profissionalId || undefined } });
            } else setForm({ aberto: true, inicial: { inicio: arg.start.toISOString(), profissionalId: profissionalId || undefined } });
          }}
          eventClick={(arg: EventClickArg) => {
            arg.jsEvent.preventDefault();
            setDetalhe(arg.event.id);
          }}
          eventDrop={(info) => aoMover(info, false)}
          eventResize={(info) => aoMover(info, true)}
        />
      </div>

      <AtendimentoFormModal
        aberto={form.aberto}
        atendimento={form.atendimento}
        inicial={form.inicial}
        onFechar={() => setForm({ aberto: false })}
        onSalvo={(a) => {
          // Leva a agenda até o dia do atendimento salvo e força a busca do período na tela
          const cal = api();
          const dia = new Date(a.inicio);
          if (cal && (dia < cal.view.activeStart || dia >= cal.view.activeEnd)) cal.gotoDate(dia);
          else void agenda.refetch();
        }}
      />
      <AtendimentoDetalheModal
        id={detalhe}
        onFechar={() => setDetalhe(null)}
        onEditar={(a) => {
          setDetalhe(null);
          setForm({ aberto: true, atendimento: a });
        }}
      />

      <Modal
        aberto={Boolean(remarcar)}
        onFechar={() => {
          remarcar?.revert();
          setRemarcar(null);
        }}
        tamanho="sm"
        titulo="Horário ocupado"
        rodape={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                remarcar?.revert();
                setRemarcar(null);
              }}
            >
              Desfazer
            </Button>
            <Button icon="bx-layer-plus" loading={mover.isPending} onClick={() => remarcar && mover.mutate({ ...remarcar, encaixe: true }, { onError: (e) => (remarcar.revert(), tratarErro(e)) })}>
              Marcar como encaixe
            </Button>
          </>
        }
      >
        <div className="conflito">
          <span className="conflito__icone" aria-hidden="true">
            <i className="bx bx-calendar-x" />
          </span>
          <p>Já existe um {r.atendimento.toLowerCase()} neste horário para o mesmo profissional.</p>
          <p className="muted text-sm">Você pode desfazer ou manter como encaixe, sobrepondo de propósito.</p>
        </div>
      </Modal>
    </div>
  );
}
