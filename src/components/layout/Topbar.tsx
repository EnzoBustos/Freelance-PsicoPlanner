import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatReadableDateInBrazil } from '@/lib/dateTime';
import { fetchClinicalAlerts, fetchPsychologistProfile, fetchSessions, fetchTransactions } from '@/services/supabaseQueries';

interface TopbarNotification {
  id: string;
  title: string;
  description: string;
  createdAt: number;
}

// Helper function to get initials from name
const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return 'PP';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper function to get a consistent color based on name
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500/20 text-blue-600',
    'bg-purple-500/20 text-purple-600',
    'bg-pink-500/20 text-pink-600',
    'bg-emerald-500/20 text-emerald-600',
    'bg-orange-500/20 text-orange-600',
    'bg-indigo-500/20 text-indigo-600',
  ];
  
  if (!name) return colors[0];
  const hash = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return colors[hash % colors.length];
};

export function Topbar({ title }: { title: string }) {
  const [alertsCount, setAlertsCount] = useState(0);
  const [notifications, setNotifications] = useState<TopbarNotification[]>([]);
  const [profileName, setProfileName] = useState('Carregando...');
  const [profileInitials, setProfileInitials] = useState('PP');
  const [avatarColor, setAvatarColor] = useState('bg-primary/20 text-primary');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [alerts, profile, sessions, transactions] = await Promise.all([
          fetchClinicalAlerts().catch(() => []),
          fetchPsychologistProfile().catch(() => null),
          fetchSessions().catch(() => []),
          fetchTransactions().catch(() => []),
        ]);

        const profileData = profile as any;
        const psychologistName = profileData?.name ?? profileData?.full_name ?? 'Profissional';
        setProfileName(psychologistName);
        const initials = getInitials(psychologistName);
        setProfileInitials(initials);
        setAvatarColor(getAvatarColor(psychologistName));

        const prefs = {
          sessionReminder: profileData?.notification_session_reminder ?? true,
          patientAbsences: profileData?.notification_patient_absences ?? true,
          pendingPayment: profileData?.notification_pending_payment ?? true,
          missingEvolution: profileData?.notification_missing_evolution ?? true,
        };

        const builtNotifications: TopbarNotification[] = [];

        if (prefs.sessionReminder) {
          const now = new Date();
          sessions
            .filter((session) => session.status === 'confirmada' || session.status === 'pendente')
            .forEach((session) => {
              if (!session.date || !session.startTime) return;
              const sessionDateTime = new Date(`${session.date}T${session.startTime}:00`);
              if (Number.isNaN(sessionDateTime.getTime())) return;
              const diffMinutes = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60);
              if (diffMinutes >= 0 && diffMinutes <= 10) {
                builtNotifications.push({
                  id: `session-${session.id}`,
                  title: 'Lembrete de sessão',
                  description: `${session.patientName} às ${session.startTime}`,
                  createdAt: sessionDateTime.getTime(),
                });
              }
            });
        }

        if (prefs.patientAbsences) {
          alerts
            .filter((alert) => alert.type === 'faltas')
            .forEach((alert, index) => {
              builtNotifications.push({
                id: `absence-${alert.id}`,
                title: 'Paciente com faltas',
                description: `${alert.patientName}: ${alert.message}`,
                createdAt: Date.now() - (index + 1) * 1000,
              });
            });
        }

        if (prefs.pendingPayment) {
          const threshold = new Date();
          threshold.setDate(threshold.getDate() - 15);

          transactions
            .filter((transaction) => {
              if (transaction.status !== 'pendente' || !transaction.date) return false;
              const [year, month, day] = String(transaction.date).slice(0, 10).split('-').map(Number);
              const transactionDate = new Date(year, month - 1, day);
              return transactionDate <= threshold;
            })
            .forEach((transaction) => {
              builtNotifications.push({
                id: `payment-${transaction.id}`,
                title: 'Pagamento pendente',
                description: `${transaction.patientName} com pendência de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.value || 0)}`,
                createdAt: Date.now() - 2000,
              });
            });
        }

        if (prefs.missingEvolution) {
          alerts
            .filter((alert) => alert.type === 'evolucao')
            .forEach((alert, index) => {
              builtNotifications.push({
                id: `evolution-${alert.id}`,
                title: 'Evolução não registrada',
                description: `${alert.patientName}: ${alert.message}`,
                createdAt: Date.now() - (index + 1) * 3000,
              });
            });
        }

        const sortedNotifications = builtNotifications
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 20);

        setNotifications(sortedNotifications);
        setAlertsCount(sortedNotifications.length);
      } catch (error) {
        console.error('Erro ao carregar topbar:', error);
      }
    };

    loadData();
    const intervalId = window.setInterval(loadData, 60 * 1000);

    // Listen for profile updates from settings page
    window.addEventListener('profileUpdated', loadData);
    return () => {
      window.removeEventListener('profileUpdated', loadData);
      window.clearInterval(intervalId);
    };
  }, []);

  const today = formatReadableDateInBrazil(new Date());

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-8 shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth">
              <Bell className="w-5 h-5" />
              {alertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse-pink" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/30">
              <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
              <p className="text-xs text-muted-foreground">Baseado nas preferências da terapeuta</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Nenhuma notificação no momento.</p>
              ) : (
                <div className="divide-y divide-border/70">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-3 hover:bg-secondary/40 transition-smooth">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notification.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor}`}>
            {profileInitials}
          </div>
          <span className="text-sm font-medium text-foreground hidden md:block">{profileName}</span>
        </div>
      </div>
    </header>
  );
}
