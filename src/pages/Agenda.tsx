import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Loader } from 'lucide-react';
import { getStatusBadgeClass, getStatusLabel, formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Session } from '@/data/mockData';
import { fetchSessions } from '@/services/supabaseQueries';

const hours = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDates(baseDate: Date) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
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

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const weekDates = getWeekDates(currentDate);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await fetchSessions();
        setSessions(data);
      } catch (error) {
        console.error('Erro ao carregar sessões:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const goToday = () => setCurrentDate(new Date());

  const formatDayHeader = (d: Date) => ({
    day: weekDays[d.getDay()],
    date: d.getDate(),
    isToday: d.toDateString() === new Date().toDateString(),
    dateStr: d.toISOString().split('T')[0],
  });

  const monthYear = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

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
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
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
            return (
              <div key={d.toISOString()} className={`p-3 text-center border-l border-border ${isToday ? 'bg-primary/5' : ''}`}>
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
                const dateStr = d.toISOString().split('T')[0];
                const slotSessions = sessions.filter(s => s.date === dateStr && s.startTime === hour);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={d.toISOString()} className={`border-l border-border/50 p-1 ${isToday ? 'bg-primary/5' : ''}`}>
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
              {selectedSession.onlineLink && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Link da Sessão</p>
                  <a href={selectedSession.onlineLink} className="text-sm text-primary underline">{selectedSession.onlineLink}</a>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1">Confirmar</Button>
                <Button size="sm" variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary">Remarcar</Button>
                <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">Falta</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
