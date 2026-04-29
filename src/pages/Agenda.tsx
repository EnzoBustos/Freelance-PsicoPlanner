import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Loader } from 'lucide-react';
import { getStatusBadgeClass, getStatusLabel, formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  addDaysToISODate,
  addMonthsClampedToISODate,
  formatMonthYearInBrazil,
  getTodayISODateInBrazil,
  isSameBrazilDate,
  toISODateInBrazil,
} from '@/lib/dateTime';
import type { Patient, Session } from '@/data/mockData';
import {
  createAgendaSessions,
  deleteAgendaSession,
  fetchPatients,
  fetchPsychologistProfile,
  fetchSchedulePreferences,
  fetchSessions,
  updateAgendaSession,
} from '@/services/supabaseQueries';

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
type RecurrencePattern = 'none' | 'weekly' | 'biweekly' | 'monthly';

interface SchedulePreference {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
}

function getWeekDates(baseDate: Date) {
  const start = new Date(baseDate);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const sessionColors: Record<string, string> = {
  confirmada: 'bg-primary/20 border-primary/40 text-primary',
  pendente: 'bg-warning/20 border-warning/40 text-warning',
  realizada: 'bg-success/20 border-success/40 text-success',
  falta: 'bg-destructive/20 border-destructive/40 text-destructive',
  cancelada: 'bg-muted border-border text-muted-foreground',
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const buildHourSlots = (
  scheduleMap: Record<number, SchedulePreference>,
  weekSessions: Session[]
) => {
  const activeDays = Object.values(scheduleMap).filter(
    (day) => day.isActive && day.startTime && day.endTime
  );

  const configuredMinStartHour =
    activeDays.length > 0
      ? Math.min(...activeDays.map((day) => Number(day.startTime!.slice(0, 2))))
      : null;

  const configuredMaxEndHour =
    activeDays.length > 0
      ? Math.max(...activeDays.map((day) => Number(day.endTime!.slice(0, 2))))
      : null;

  const sessionsWithValidTime = weekSessions.filter((session) => /^\d{2}:\d{2}/.test(session.startTime));

  const earliestSessionHour =
    sessionsWithValidTime.length > 0
      ? Math.min(...sessionsWithValidTime.map((session) => Number(session.startTime.slice(0, 2))))
      : null;

  const latestSessionHour =
    sessionsWithValidTime.length > 0
      ? Math.max(...sessionsWithValidTime.map((session) => Number(session.startTime.slice(0, 2))))
      : null;

  if (
    configuredMinStartHour === null &&
    configuredMaxEndHour === null &&
    earliestSessionHour === null &&
    latestSessionHour === null
  ) {
    return Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
  }

  const minStartHour = Math.min(
    configuredMinStartHour ?? Number.POSITIVE_INFINITY,
    earliestSessionHour ?? Number.POSITIVE_INFINITY,
    7
  );

  const maxDisplayHour = Math.max(
    configuredMaxEndHour ?? Number.NEGATIVE_INFINITY,
    latestSessionHour ?? Number.NEGATIVE_INFINITY
  );

  const safeMinHour = Number.isFinite(minStartHour) ? minStartHour : 7;
  const safeMaxHour = Number.isFinite(maxDisplayHour) ? maxDisplayHour : safeMinHour;

  const totalHours = Math.max(1, safeMaxHour - safeMinHour + 1);
  return Array.from({ length: totalHours }, (_, i) => `${String(safeMinHour + i).padStart(2, '0')}:00`);
};

const isWithinDayAvailability = (
  scheduleDay: SchedulePreference | undefined,
  time: string
) => {
  if (!scheduleDay || !scheduleDay.isActive || !scheduleDay.startTime || !scheduleDay.endTime) {
    return false;
  }

  const target = toMinutes(time.slice(0, 5));
  const start = toMinutes(scheduleDay.startTime.slice(0, 5));
  const end = toMinutes(scheduleDay.endTime.slice(0, 5));
  return target >= start && target < end;
};

const getDayIndexFromDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
};

const buildRecurrenceDates = (startDate: string, pattern: Exclude<RecurrencePattern, 'none'>, count: number) => {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return startDate;

    if (pattern === 'monthly') {
      return addMonthsClampedToISODate(startDate, index);
    }

    const stepDays = pattern === 'weekly' ? 7 : 14;
    return addDaysToISODate(startDate, index * stepDays);
  });
};

export default function Agenda() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [savingSessionAction, setSavingSessionAction] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    date: getTodayISODateInBrazil(),
    startTime: '08:00',
  });
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<number, SchedulePreference>>({});
  const [defaultSessionDuration, setDefaultSessionDuration] = useState(50);
  const [defaultSessionValue, setDefaultSessionValue] = useState(250);
  const [newSessionForm, setNewSessionForm] = useState({
    patientId: '',
    date: getTodayISODateInBrazil(),
    startTime: '08:00',
    duration: 50,
    type: 'presencial' as 'presencial' | 'online',
    status: 'pendente' as 'confirmada' | 'pendente' | 'cancelada' | 'realizada' | 'falta',
    value: 250,
    recurrencePattern: 'none' as RecurrencePattern,
    recurrenceCount: 4,
  });
  const [loading, setLoading] = useState(true);
  const weekDates = getWeekDates(currentDate);
  const weekDateSet = useMemo(
    () => new Set(weekDates.map((date) => toISODateInBrazil(date))),
    [weekDates]
  );

  const weekSessions = useMemo(
    () => sessions.filter((session) => weekDateSet.has(session.date)),
    [sessions, weekDateSet]
  );

  const hours = useMemo(() => buildHourSlots(scheduleMap, weekSessions), [scheduleMap, weekSessions]);

  useEffect(() => {
    const loadAgendaData = async () => {
      try {
        const [sessionsData, patientsData, profileData] = await Promise.all([
          fetchSessions(),
          fetchPatients(),
          fetchPsychologistProfile().catch(() => null),
        ]);

        const scheduleData = await fetchSchedulePreferences().catch(() => []);
        const scheduleByDay = scheduleData.reduce<Record<number, SchedulePreference>>((acc, day) => {
          acc[day.dayOfWeek] = {
            dayOfWeek: day.dayOfWeek,
            isActive: day.isActive,
            startTime: day.startTime,
            endTime: day.endTime,
          };
          return acc;
        }, {});

        const profileDuration = Number(profileData?.default_session_duration ?? 50);
        const profileValue = Number(profileData?.default_session_value ?? 250);

        setSessions(sessionsData);
        setPatients(patientsData);
        setScheduleMap(scheduleByDay);
        setDefaultSessionDuration(profileDuration > 0 ? profileDuration : 50);
        setDefaultSessionValue(profileValue > 0 ? profileValue : 250);
        setNewSessionForm((prev) => ({
          ...prev,
          duration: profileDuration > 0 ? profileDuration : 50,
          value: profileValue > 0 ? profileValue : 250,
        }));
      } catch (error) {
        console.error('Erro ao carregar sessões:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgendaData();
  }, []);

  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const goToday = () => setCurrentDate(new Date());

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === newSessionForm.patientId) || null,
    [patients, newSessionForm.patientId]
  );

  const recurrenceLabel = useMemo(() => {
    switch (newSessionForm.recurrencePattern) {
      case 'weekly':
        return 'Semanal';
      case 'biweekly':
        return 'Quinzenal';
      case 'monthly':
        return 'Mensal';
      default:
        return 'Sem recorrência';
    }
  }, [newSessionForm.recurrencePattern]);

  const resetNewSessionForm = () => {
    setNewSessionForm({
      patientId: '',
      date: getTodayISODateInBrazil(),
      startTime: '08:00',
      duration: defaultSessionDuration,
      type: 'presencial',
      status: 'pendente',
      value: defaultSessionValue,
      recurrencePattern: 'none',
      recurrenceCount: 4,
    });
  };

  const handleCreateSession = async () => {
    if (!newSessionForm.patientId) {
      toast({
        title: 'Paciente obrigatório',
        description: 'Selecione um paciente para criar a sessão.',
        variant: 'destructive',
      });
      return;
    }

    if (!newSessionForm.date || !newSessionForm.startTime) {
      toast({
        title: 'Data e horário obrigatórios',
        description: 'Informe a data e o horário da sessão.',
        variant: 'destructive',
      });
      return;
    }

    if (newSessionForm.duration <= 0) {
      toast({
        title: 'Duração inválida',
        description: 'A duração da sessão deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (newSessionForm.recurrencePattern !== 'none' && newSessionForm.recurrenceCount < 2) {
      toast({
        title: 'Recorrência inválida',
        description: 'Informe pelo menos 2 consultas para gerar a recorrência.',
        variant: 'destructive',
      });
      return;
    }

    const recurrenceDates = newSessionForm.recurrencePattern === 'none'
      ? [newSessionForm.date]
      : buildRecurrenceDates(
          newSessionForm.date,
          newSessionForm.recurrencePattern,
          newSessionForm.recurrenceCount
        );

    const invalidDate = recurrenceDates.find((date) => {
      const selectedDayIndex = getDayIndexFromDate(date);
      const scheduleDay = scheduleMap[selectedDayIndex];
      return !isWithinDayAvailability(scheduleDay, newSessionForm.startTime);
    });

    if (invalidDate) {
      toast({
        title: 'Atenção',
        description: 'Este horário está fora do seu horário de atendimento marcado.',
      });
    }

    try {
      setSavingSession(true);

      const patient = patients.find((p) => p.id === newSessionForm.patientId);
      if (!patient) {
        throw new Error('Paciente selecionado não encontrado.');
      }

      const createdSessions = await createAgendaSessions({
        patientId: patient.id,
        patientName: patient.name,
        date: newSessionForm.date,
        startTime: newSessionForm.startTime,
        duration: newSessionForm.duration,
        type: newSessionForm.type,
        status: newSessionForm.status,
        value: newSessionForm.value,
        recurrence:
          newSessionForm.recurrencePattern === 'none'
            ? undefined
            : {
                pattern: newSessionForm.recurrencePattern,
                count: newSessionForm.recurrenceCount,
              },
      });

      setSessions((prev) => [...createdSessions, ...prev]);
      setNewSessionOpen(false);
      resetNewSessionForm();

      toast({
        title: createdSessions.length > 1 ? 'Sessões recorrentes criadas com sucesso! ✅' : 'Sessão criada com sucesso! ✅',
        description: `${patient.name} em ${newSessionForm.date.split('-').reverse().join('/')} às ${newSessionForm.startTime}${createdSessions.length > 1 ? `, repetida ${createdSessions.length - 1} vez(es)` : ''}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar sessão',
        description: error?.message ?? 'Não foi possível criar a sessão.',
        variant: 'destructive',
      });
    } finally {
      setSavingSession(false);
    }
  };

  const syncUpdatedSession = (updated: Session) => {
    setSessions((prev) => prev.map((session) => (session.id === updated.id ? updated : session)));
    setSelectedSession(updated);
  };

  const handleConfirmSession = async () => {
    if (!selectedSession) return;

    try {
      setSavingSessionAction(true);
      const updated = await updateAgendaSession(selectedSession.id, { status: 'confirmada' });
      syncUpdatedSession(updated);
      toast({ title: 'Sessão confirmada! ✅' });
    } catch (error: any) {
      toast({
        title: 'Erro ao confirmar sessão',
        description: error?.message ?? 'Não foi possível confirmar.',
        variant: 'destructive',
      });
    } finally {
      setSavingSessionAction(false);
    }
  };

  const handleNoShowSession = async () => {
    if (!selectedSession) return;

    try {
      setSavingSessionAction(true);
      const updated = await updateAgendaSession(selectedSession.id, { status: 'falta' });
      syncUpdatedSession(updated);
      toast({ title: 'Sessão marcada como falta.' });
    } catch (error: any) {
      toast({
        title: 'Erro ao marcar falta',
        description: error?.message ?? 'Não foi possível atualizar.',
        variant: 'destructive',
      });
    } finally {
      setSavingSessionAction(false);
    }
  };

  const openRescheduleDialog = () => {
    if (!selectedSession) return;
    setRescheduleForm({
      date: selectedSession.date,
      startTime: selectedSession.startTime,
    });
    setRescheduleOpen(true);
  };

  const handleRescheduleSession = async () => {
    if (!selectedSession) return;

    try {
      setSavingSessionAction(true);
      const updated = await updateAgendaSession(selectedSession.id, {
        date: rescheduleForm.date,
        startTime: rescheduleForm.startTime,
        status: 'pendente',
      });
      syncUpdatedSession(updated);
      setRescheduleOpen(false);
      toast({ title: 'Sessão remarcada com sucesso! ✅' });
    } catch (error: any) {
      toast({
        title: 'Erro ao remarcar sessão',
        description: error?.message ?? 'Não foi possível remarcar.',
        variant: 'destructive',
      });
    } finally {
      setSavingSessionAction(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    const confirmed = window.confirm('Tem certeza que deseja excluir esta consulta da agenda?');
    if (!confirmed) return;

    try {
      setSavingSessionAction(true);
      await deleteAgendaSession(selectedSession.id);
      setSessions((prev) => prev.filter((session) => session.id !== selectedSession.id));
      setSelectedSession(null);

      toast({
        title: 'Consulta excluída com sucesso! ✅',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir consulta',
        description: error?.message ?? 'Não foi possível excluir a consulta.',
        variant: 'destructive',
      });
    } finally {
      setSavingSessionAction(false);
    }
  };

  const formatDayHeader = (d: Date) => ({
    day: weekDays[d.getDay()],
    date: d.getDate(),
    isToday: isSameBrazilDate(d, getTodayISODateInBrazil()),
    dateStr: toISODateInBrazil(d),
  });

  const monthYear = formatMonthYearInBrazil(currentDate);

  if (loading) {
    return (
      <AppLayout title="Agenda">
        <div className="flex items-center justify-center min-h-[360px]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Agenda">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-smooth">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium text-foreground transition-smooth">
            Hoje
          </button>
          <button onClick={nextWeek} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-smooth">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold text-foreground capitalize ml-2">{monthYear}</h2>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={() => {
            resetNewSessionForm();
            setNewSessionOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Nova Sessão
        </Button>
      </div>

      {/* Calendar grid */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="p-3" />
          {weekDates.map(d => {
            const { day, date, isToday } = formatDayHeader(d);
            const daySchedule = scheduleMap[d.getDay()];
            const isUnavailableDay = !daySchedule?.isActive;
            return (
              <div
                key={d.toISOString()}
                className={`p-3 text-center border-l border-border ${
                  isUnavailableDay ? 'bg-muted/40' : isToday ? 'bg-primary/5' : ''
                }`}
              >
                <p className="text-xs text-muted-foreground">{day}</p>
                <p className={`text-lg font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>{date}</p>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[60px] border-b border-border/50">
              <div className="p-2 text-xs text-muted-foreground text-right pr-3 pt-1">{hour}</div>
              {weekDates.map(d => {
                const dateStr = toISODateInBrazil(d);
                const daySchedule = scheduleMap[d.getDay()];
                const isUnavailableDay = !daySchedule?.isActive;
                const isAvailableSlot = isWithinDayAvailability(daySchedule, hour);
                const slotSessions = sessions.filter(
                  (s) => s.date === dateStr && s.startTime.slice(0, 2) === hour.slice(0, 2)
                );
                const isToday = isSameBrazilDate(d, getTodayISODateInBrazil());
                return (
                  <div
                    key={d.toISOString()}
                    className={`border-l border-border/50 p-1 ${
                      isUnavailableDay || !isAvailableSlot
                        ? 'bg-muted/50'
                        : isToday
                          ? 'bg-primary/5'
                          : ''
                    }`}
                  >
                    {slotSessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSession(s)}
                        className={`w-full text-left p-2 rounded-md border text-xs transition-smooth hover:scale-[1.02] ${sessionColors[s.status] || sessionColors.pendente}`}
                      >
                        <p className="font-medium truncate">{s.patientName}</p>
                        <p className="opacity-70">{s.startTime} · {s.duration}min</p>
                      </button>
                    ))}
                    {(isUnavailableDay || !isAvailableSlot) && slotSessions.length === 0 && (
                      <div className="w-full h-full min-h-[40px]" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Session detail dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalhes da Sessão</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {selectedSession.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedSession.patientName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedSession.type === 'online' ? <Video className="w-3 h-3 text-info" /> : <MapPin className="w-3 h-3 text-success" />}
                    <span className="text-xs text-muted-foreground">{getStatusLabel(selectedSession.type)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Data</p><p className="text-sm text-foreground">{selectedSession.date.split('-').reverse().join('/')}</p></div>
                <div><p className="text-xs text-muted-foreground">Horário</p><p className="text-sm text-foreground">{selectedSession.startTime} ({selectedSession.duration}min)</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p><p className="text-sm text-foreground">{formatCurrency(selectedSession.value)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedSession.status)}`}>
                    {getStatusLabel(selectedSession.status)}
                  </span>
                </div>
              </div>
              {selectedSession.recurrencePattern && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recorrência</p>
                  <p className="text-sm text-foreground capitalize">
                    {selectedSession.recurrencePattern === 'weekly'
                      ? 'Semanal'
                      : selectedSession.recurrencePattern === 'biweekly'
                        ? 'Quinzenal'
                        : 'Mensal'}
                    {typeof selectedSession.recurrenceIndex === 'number' ? ` • ocorrência ${selectedSession.recurrenceIndex + 1}` : ''}
                  </p>
                </div>
              )}
              {selectedSession.onlineLink && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Link da Sessão</p>
                  <a href={selectedSession.onlineLink} className="text-sm text-primary underline">{selectedSession.onlineLink}</a>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
                  onClick={handleConfirmSession}
                  disabled={savingSessionAction}
                >
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-secondary"
                  onClick={openRescheduleDialog}
                  disabled={savingSessionAction}
                >
                  Remarcar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={handleNoShowSession}
                  disabled={savingSessionAction}
                >
                  Falta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteSession}
                  disabled={savingSessionAction}
                >
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remarcar sessão</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nova data</label>
              <Input
                type="date"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm((prev) => ({ ...prev, date: e.target.value }))}
                className="bg-secondary border-border"
                disabled={savingSessionAction}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Novo horário</label>
              <Input
                type="time"
                value={rescheduleForm.startTime}
                onChange={(e) => setRescheduleForm((prev) => ({ ...prev, startTime: e.target.value }))}
                className="bg-secondary border-border"
                disabled={savingSessionAction}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRescheduleOpen(false)} disabled={savingSessionAction}>
                Cancelar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleRescheduleSession} disabled={savingSessionAction}>
                {savingSessionAction ? 'Salvando...' : 'Salvar remarcação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Sessão</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Paciente</label>
              <Select
                value={newSessionForm.patientId || undefined}
                onValueChange={(value) => {
                  const patient = patients.find((p) => p.id === value);
                  setNewSessionForm((prev) => ({
                    ...prev,
                    patientId: value,
                    value: patient?.sessionValue ?? defaultSessionValue,
                  }));
                }}
                disabled={savingSession}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                <Input
                  type="date"
                  value={newSessionForm.date}
                  onChange={(e) => setNewSessionForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-secondary border-border"
                  disabled={savingSession}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
                <Input
                  type="time"
                  value={newSessionForm.startTime}
                  onChange={(e) => setNewSessionForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="bg-secondary border-border"
                  disabled={savingSession}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Duração (min)</label>
                <Input
                  type="number"
                  min="1"
                  step="5"
                  value={newSessionForm.duration}
                  onChange={(e) => setNewSessionForm((prev) => ({ ...prev, duration: Number(e.target.value) || 0 }))}
                  className="bg-secondary border-border"
                  disabled={savingSession}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Padrão da terapeuta: {defaultSessionDuration} min
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <Select
                  value={newSessionForm.type}
                  onValueChange={(value) => setNewSessionForm((prev) => ({ ...prev, type: value as 'presencial' | 'online' }))}
                  disabled={savingSession}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select
                  value={newSessionForm.status}
                  onValueChange={(value) =>
                    setNewSessionForm((prev) => ({
                      ...prev,
                      status: value as 'confirmada' | 'pendente' | 'cancelada' | 'realizada' | 'falta',
                    }))
                  }
                  disabled={savingSession}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="realizada">Realizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="falta">Falta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Recorrência</label>
                <Select
                  value={newSessionForm.recurrencePattern}
                  onValueChange={(value) =>
                    setNewSessionForm((prev) => ({
                      ...prev,
                      recurrencePattern: value as RecurrencePattern,
                      recurrenceCount: value === 'none' ? prev.recurrenceCount : Math.max(prev.recurrenceCount, 4),
                    }))
                  }
                  disabled={savingSession}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem recorrência</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">{recurrenceLabel}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Qtd. de consultas</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={newSessionForm.recurrenceCount}
                  onChange={(e) => setNewSessionForm((prev) => ({ ...prev, recurrenceCount: Number(e.target.value) || 0 }))}
                  className="bg-secondary border-border"
                  disabled={savingSession || newSessionForm.recurrencePattern === 'none'}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Inclui a primeira consulta. Use 4 para um acompanhamento mensal típico.</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={newSessionForm.value}
                onChange={(e) => setNewSessionForm((prev) => ({ ...prev, value: Number(e.target.value) || 0 }))}
                className="bg-secondary border-border"
                disabled={savingSession}
              />
              {selectedPatient && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Valor padrão do paciente: R$ {selectedPatient.sessionValue.toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewSessionOpen(false)} disabled={savingSession}>
                Cancelar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCreateSession} disabled={savingSession}>
                {savingSession ? 'Salvando...' : 'Criar Sessão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
