import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { CalendarCheck, DollarSign, Users, AlertCircle, Clock, AlertTriangle, CreditCard, FileX, Loader } from 'lucide-react';
import { fetchSessions, fetchPatients, fetchTransactions, fetchClinicalAlerts } from '@/services/supabaseQueries';
import { formatCurrency, formatDateBR, getStatusBadgeClass, getStatusLabel } from '@/data/mockData';
import type { Session, Patient, Transaction, ClinicalAlert } from '@/data/mockData';

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clinicalAlerts, setClinicalAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sessionsData, patientsData, transactionsData, alertsData] = await Promise.all([
          fetchSessions().catch((err) => { console.error('Erro sessões:', err); return []; }),
          fetchPatients().catch((err) => { console.error('Erro pacientes:', err); return []; }),
          fetchTransactions().catch((err) => { console.error('Erro transações:', err); return []; }),
          fetchClinicalAlerts().catch((err) => { console.error('Erro alertas:', err); return []; }),
        ]);
        setSessions(sessionsData);
        setPatients(patientsData);
        setTransactions(transactionsData);
        setClinicalAlerts(alertsData);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar dados do banco de dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === today);
  const activePatients = patients.filter(p => p.status === 'ativo').length;
  const monthRevenue = transactions.filter(t => t.status === 'pago').reduce((sum, t) => sum + (t.value || 0), 0);
  const pendingPayments = transactions.filter(t => t.status === 'pendente').length;

  const metrics = [
    { label: 'Sessões Hoje', value: todaySessions.length, icon: CalendarCheck, color: 'text-primary' },
    { label: 'Receita do Mês', value: formatCurrency(monthRevenue), icon: DollarSign, color: 'text-success' },
    { label: 'Pacientes Ativos', value: activePatients, icon: Users, color: 'text-info' },
    { label: 'Pgtos Pendentes', value: pendingPayments, icon: CreditCard, color: 'text-warning' },
  ];

  const alertIcons: Record<string, typeof AlertTriangle> = {
    faltas: AlertTriangle,
    evolucao: FileX,
    inadimplencia: CreditCard,
  };

  return (
    <AppLayout title="Dashboard">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-6 text-destructive text-sm flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-smooth">
                  <div className="text-sm font-mono font-medium text-primary w-14">{s.startTime}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.patientName}</p>
                    <p className="text-xs text-muted-foreground">{s.duration}min · {getStatusLabel(s.type)}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(s.status)}`}>
                    {getStatusLabel(s.status)}
                  </span>
                </div>
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
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <Icon className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.patientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${badgeClass}`}>
                      {a.type === 'faltas' ? 'Faltas' : a.type === 'inadimplencia' ? 'Inadimplente' : 'Evolução'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
