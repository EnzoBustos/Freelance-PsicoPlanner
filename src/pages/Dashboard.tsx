import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { CalendarCheck, DollarSign, Users, AlertCircle, Clock, AlertTriangle, CreditCard, FileX, Loader, ArrowRight, CalendarDays, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateBR, getStatusBadgeClass, getStatusLabel } from '@/data/mockData';
import type { Session, Patient, Transaction, ClinicalAlert } from '@/data/mockData';
import { fetchClinicalAlerts, fetchPatients, fetchSessions, fetchTransactions } from '@/services/supabaseQueries';

const safeFormatDateBR = (date: unknown) => {
  if (typeof date !== 'string' || !date.includes('-')) return '—';
  const onlyDate = date.slice(0, 10);
  return formatDateBR(onlyDate);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clinicalAlerts, setClinicalAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sessionsData, patientsData, transactionsData, alertsData] = await Promise.all([
          fetchSessions(),
          fetchPatients(),
          fetchTransactions(),
          fetchClinicalAlerts(),
        ]);
        setSessions(sessionsData);
        setPatients(patientsData);
        setTransactions(transactionsData);
        setClinicalAlerts(alertsData);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter((s) => typeof s.date === 'string' && s.date.slice(0, 10) === today);
  const activePatients = patients.filter((p) => p.status === 'ativo').length;
  const monthRevenue = transactions.filter((t) => t.status === 'pago').reduce((sum, t) => sum + t.value, 0);
  const pendingPayments = transactions.filter((t) => t.status === 'pendente').length;

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((session) => {
        if (!session.date || !session.startTime) return false;
        const sessionDateTime = new Date(`${session.date}T${session.startTime}:00`);
        if (Number.isNaN(sessionDateTime.getTime())) return false;
        return sessionDateTime >= now;
      })
      .sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.startTime}:00`).getTime();
        const bDate = new Date(`${b.date}T${b.startTime}:00`).getTime();
        return aDate - bDate;
      })
      .slice(0, 6);
  }, [sessions]);

  const recentPatients = useMemo(() => {
    return [...patients].slice(0, 6);
  }, [patients]);

  const pendingTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status === 'pendente').slice(0, 6);
  }, [transactions]);

  const metrics = [
    { label: 'Sessões Hoje', value: todaySessions.length, icon: CalendarCheck, color: 'text-primary', action: () => navigate('/agenda') },
    { label: 'Receita do Mês', value: formatCurrency(monthRevenue), icon: DollarSign, color: 'text-success', action: () => navigate('/financeiro') },
    { label: 'Pacientes Ativos', value: activePatients, icon: Users, color: 'text-info', action: () => navigate('/pacientes') },
    { label: 'Pgtos Pendentes', value: pendingPayments, icon: CreditCard, color: 'text-warning', action: () => navigate('/financeiro') },
  ];

  const alertIcons: Record<string, typeof AlertTriangle> = {
    faltas: AlertTriangle,
    evolucao: FileX,
    inadimplencia: CreditCard,
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[360px]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Button className="justify-between bg-primary hover:bg-primary/90" onClick={() => navigate('/agenda')}>
          Ir para Agenda
          <CalendarDays className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="justify-between border-border" onClick={() => navigate('/pacientes')}>
          Gerenciar Pacientes
          <UserRound className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="justify-between border-border" onClick={() => navigate('/financeiro')}>
          Ver Financeiro
          <DollarSign className="w-4 h-4" />
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5 cursor-pointer hover:bg-secondary/40 transition-smooth"
            onClick={m.action}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's agenda */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Agenda do Dia</h2>
          </div>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão agendada para hoje.</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/pacientes/${s.patientId}`)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-smooth text-left"
                >
                  <div className="text-sm font-mono font-medium text-primary w-14">{s.startTime}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.patientName}</p>
                    <p className="text-xs text-muted-foreground">{s.duration}min · {getStatusLabel(s.type)}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(s.status)}`}>
                    {getStatusLabel(s.status)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Clinical alerts */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-semibold text-foreground">Alertas Clínicos</h2>
          </div>
          {clinicalAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
          ) : (
            <div className="space-y-3">
              {clinicalAlerts.map(a => {
                const Icon = alertIcons[a.type] || AlertTriangle;
                const badgeClass = a.type === 'faltas' ? 'badge-danger' : a.type === 'inadimplencia' ? 'badge-warning' : 'badge-info';
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/pacientes/${a.patientId}`)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-smooth text-left"
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.patientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${badgeClass}`}>
                      {a.type === 'faltas' ? 'Faltas' : a.type === 'inadimplencia' ? 'Inadimplente' : 'Evolução'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Próximas Sessões</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate('/agenda')} className="text-primary gap-1">
              Ver agenda <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem sessões futuras.</p>
            ) : (
              upcomingSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/pacientes/${session.patientId}`)}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-secondary/50 hover:bg-secondary text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{session.patientName}</p>
                    <p className="text-xs text-muted-foreground">{safeFormatDateBR(session.date)} · {session.startTime || '—'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeClass(session.status)}`}>
                    {getStatusLabel(session.status)}
                  </span>
                </button>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Pendências Financeiras</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate('/financeiro')} className="text-primary gap-1">
              Ver financeiro <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {pendingTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem pendências.</p>
            ) : (
              pendingTransactions.map((transaction) => (
                <button
                  key={transaction.id}
                  onClick={() => navigate(`/pacientes/${transaction.patientId}`)}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-secondary/50 hover:bg-secondary text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{transaction.patientName}</p>
                    <p className="text-xs text-muted-foreground">{safeFormatDateBR(transaction.date)} · {formatCurrency(transaction.value || 0)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeClass(transaction.status)}`}>
                    {getStatusLabel(transaction.status)}
                  </span>
                </button>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Pacientes</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate('/pacientes')} className="text-primary gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum paciente cadastrado.</p>
            ) : (
              recentPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-secondary/50 hover:bg-secondary text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.age} anos</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeClass(patient.status)}`}>
                    {getStatusLabel(patient.status)}
                  </span>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
