import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Stethoscope, FileText, DollarSign, FolderOpen, CheckCircle2, Circle, Loader } from 'lucide-react';
import { formatCurrency, formatDateBR, getStatusBadgeClass, getStatusLabel } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Patient, Session, Transaction } from '@/data/mockData';
import { fetchPatientWithGoals, fetchSessions, fetchTransactions } from '@/services/supabaseQueries';

const riskColors: Record<string, string> = {
  baixo: 'badge-info',
  medio: 'badge-warning',
  alto: 'badge-danger',
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const [patientData, sessionsData, transactionsData] = await Promise.all([
          fetchPatientWithGoals(id),
          fetchSessions(),
          fetchTransactions(),
        ]);
        setPatient(patientData);
        setSessions(sessionsData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Erro ao carregar detalhe do paciente:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const patientSessions = useMemo(
    () => sessions.filter((s) => s.patientId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, id]
  );
  const patientTransactions = useMemo(
    () => transactions.filter((t) => t.patientId === id),
    [transactions, id]
  );
  const totalPaid = patientTransactions.filter((t) => t.status === 'pago').reduce((s, t) => s + t.value, 0);
  const totalPending = patientTransactions.filter((t) => t.status === 'pendente').reduce((s, t) => s + t.value, 0);

  if (loading) {
    return (
      <AppLayout title="Paciente">
        <div className="flex items-center justify-center min-h-[360px]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout title="Paciente não encontrado">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate('/pacientes')} className="mt-4">Voltar</Button>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={patient.name}>
      <button
        onClick={() => navigate('/pacientes')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para pacientes
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center text-xl font-bold text-primary">
            {patient.avatar}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">{patient.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(patient.status)}`}>
                {getStatusLabel(patient.status)}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${riskColors[patient.riskLevel]}`}>
                Risco {getStatusLabel(patient.riskLevel)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{patient.age} anos · {patient.phone} · {patient.email}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Valor/sessão</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(patient.sessionValue)}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="dados" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="w-3.5 h-3.5" />Dados Pessoais</TabsTrigger>
          <TabsTrigger value="clinico" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Stethoscope className="w-3.5 h-3.5" />Clínico</TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileText className="w-3.5 h-3.5" />Evolução</TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><DollarSign className="w-3.5 h-3.5" />Financeiro</TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FolderOpen className="w-3.5 h-3.5" />Documentos</TabsTrigger>
        </TabsList>

        {/* Dados Pessoais */}
        <TabsContent value="dados">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                ['Nome Completo', patient.name],
                ['Data de Nascimento', `${formatDateBR(patient.birthDate)} (${patient.age} anos)`],
                ['CPF', patient.cpf],
                ['Telefone', patient.phone],
                ['E-mail', patient.email],
                ['Endereço', patient.address],
                ['Contato de Emergência', patient.emergencyContact],
                ['Responsável Legal', patient.legalGuardian || '—'],
                ['Plano de Saúde', patient.healthPlan || '—'],
                ['Nº Carteirinha', patient.cardNumber || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm text-foreground">{value}</p>
                </div>
              ))}
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm text-foreground">{patient.notes || '—'}</p>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Clínico */}
        <TabsContent value="clinico">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="glass-card p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  ['Motivo de Busca', patient.searchReason],
                  ['Queixa Principal', patient.mainComplaint],
                  ['Histórico de Saúde', patient.healthHistory],
                  ['Medicações em Uso', patient.medications],
                  ['Hipótese Diagnóstica', patient.diagnosticHypothesis],
                  ['CID-10', patient.cid10],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm text-foreground">{value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nível de Risco</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${riskColors[patient.riskLevel]}`}>
                    {getStatusLabel(patient.riskLevel)}
                  </span>
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Metas Terapêuticas</h3>
              <div className="space-y-3">
                {patient.therapeuticGoals.map(g => (
                  <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    {g.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm ${g.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{g.description}</p>
                      <p className="text-xs text-muted-foreground">Definida em {formatDateBR(g.dateSet)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Evolução */}
        <TabsContent value="evolucao">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-foreground">Linha do Tempo</h3>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">+ Nova Evolução</Button>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-6">
                {patientSessions.filter(s => s.evolutionNote).map(s => (
                  <div key={s.id} className="relative pl-10">
                    <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-foreground">{formatDateBR(s.date)}</span>
                        <span className="text-xs text-muted-foreground">{s.startTime} · {s.duration}min</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeClass(s.status)}`}>
                          {getStatusLabel(s.status)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{s.evolutionNote}</p>
                    </div>
                  </div>
                ))}
                {patientSessions.filter(s => s.evolutionNote).length === 0 && (
                  <p className="text-sm text-muted-foreground pl-10">Nenhuma evolução registrada.</p>
                )}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-5">
                <p className="text-xs text-muted-foreground mb-1">Valor por Sessão</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(patient.sessionValue)}</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-xs text-muted-foreground mb-1">Total Pago</p>
                <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-xs text-muted-foreground mb-1">Saldo em Aberto</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(totalPending)}</p>
              </div>
            </div>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Data</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Valor</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Método</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {patientTransactions.map(t => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="px-6 py-3 text-sm text-foreground">{formatDateBR(t.date)}</td>
                      <td className="px-6 py-3 text-sm text-foreground">{formatCurrency(t.value)}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{t.paymentMethod || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(t.status)}`}>
                          {getStatusLabel(t.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {t.status === 'pendente' && (
                          <Button size="sm" variant="ghost" className="text-xs text-primary hover:text-primary">Registrar</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">+ Upload</Button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Termo de Consentimento.pdf', category: 'Termo de Consentimento', date: '10/03/2026' },
                { name: 'Laudo Psicológico.pdf', category: 'Laudo', date: '25/02/2026' },
              ].map((doc, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.category} · {doc.date}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs text-primary">Baixar</Button>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
