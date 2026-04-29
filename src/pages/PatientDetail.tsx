import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Stethoscope, FileText, DollarSign, FolderOpen, Loader, Pencil } from 'lucide-react';
import { formatCurrency, formatDateBR, getStatusBadgeClass, getStatusLabel } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDateInBrazil, getTodayISODateInBrazil } from '@/lib/dateTime';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Patient, Session, Transaction } from '@/data/mockData';
import {
  createPatientEvolution,
  createPatientFinancialSession,
  fetchPatientWithGoals,
  fetchPatientDocuments,
  fetchSessions,
  fetchTransactions,
  getPatientDocumentDownloadUrl,
  registerTransactionPayment,
  type PatientDocumentItem,
  uploadPatientDocument,
  updatePatient,
  updateSessionEvolution,
} from '@/services/supabaseQueries';

const riskColors: Record<string, string> = {
  baixo: 'badge-info',
  medio: 'badge-warning',
  alto: 'badge-danger',
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const calculateAge = (birthDate: string) => {
  if (!birthDate) return 0;

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age < 0 ? 0 : age;
};

export default function PatientDetail() {
  const { toast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newEvolutionOpen, setNewEvolutionOpen] = useState(false);
  const [savingNewEvolution, setSavingNewEvolution] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [savingNewSession, setSavingNewSession] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [downloadingDocumentName, setDownloadingDocumentName] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [newSessionForm, setNewSessionForm] = useState({
    date: getTodayISODateInBrazil(),
    value: 0,
    paymentMethod: '',
    paymentStatus: 'pendente' as 'pago' | 'pendente',
  });
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [newEvolutionForm, setNewEvolutionForm] = useState({
    date: getTodayISODateInBrazil(),
    note: '',
  });
  const [profileForm, setProfileForm] = useState({
    name: '',
    birthDate: '',
    cpf: '',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    legalGuardian: '',
    healthPlan: '',
    cardNumber: '',
    status: 'ativo' as Patient['status'],
    notes: '',
    searchReason: '',
    mainComplaint: '',
    healthHistory: '',
    medications: '',
    sessionValue: 0,
    diagnosticHypothesis: '',
    cid10: '',
    riskLevel: 'baixo' as Patient['riskLevel'],
  });
  const [evolutionDrafts, setEvolutionDrafts] = useState<Record<string, string>>({});
  const [savingEvolutionId, setSavingEvolutionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoadingDocuments(true);
        const [patientData, sessionsData, transactionsData] = await Promise.all([
          fetchPatientWithGoals(id),
          fetchSessions(),
          fetchTransactions(),
        ]);
        setPatient(patientData);
        setSessions(sessionsData);
        setTransactions(transactionsData);
        if (patientData) {
          setProfileForm({
            name: patientData.name ?? '',
            birthDate: patientData.birthDate ?? '',
            cpf: patientData.cpf ?? '',
            phone: patientData.phone ?? '',
            email: patientData.email ?? '',
            address: patientData.address ?? '',
            emergencyContact: patientData.emergencyContact ?? '',
            legalGuardian: patientData.legalGuardian ?? '',
            healthPlan: patientData.healthPlan ?? '',
            cardNumber: patientData.cardNumber ?? '',
            status: patientData.status ?? 'ativo',
            notes: patientData.notes ?? '',
            searchReason: patientData.searchReason ?? '',
            mainComplaint: patientData.mainComplaint ?? '',
            healthHistory: patientData.healthHistory ?? '',
            medications: patientData.medications ?? '',
            sessionValue: patientData.sessionValue ?? 0,
            diagnosticHypothesis: patientData.diagnosticHypothesis ?? '',
            cid10: patientData.cid10 ?? '',
            riskLevel: patientData.riskLevel ?? 'baixo',
          });
          setNewSessionForm((prev) => ({
            ...prev,
            value: patientData.sessionValue ?? 0,
          }));
        }
        setEvolutionDrafts(
          sessionsData.reduce<Record<string, string>>((acc, session) => {
            acc[session.id] = session.evolutionNote ?? '';
            return acc;
          }, {})
        );

        const docsData = await fetchPatientDocuments(id).catch((error) => {
          console.error('Erro ao carregar documentos:', error);
          return [];
        });
        setDocuments(docsData);
      } catch (error) {
        console.error('Erro ao carregar detalhe do paciente:', error);
      } finally {
        setLoadingDocuments(false);
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
    () =>
      transactions
        .filter((t) => t.patientId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, id]
  );
  const totalPaid = patientTransactions.filter((t) => t.status === 'pago').reduce((s, t) => s + t.value, 0);
  const totalPending = patientTransactions.filter((t) => t.status === 'pendente').reduce((s, t) => s + t.value, 0);

  const handleCreateFinancialSession = async () => {
    if (!patient || !id) return;

    if (!newSessionForm.date || newSessionForm.value <= 0) {
      toast({
        title: 'Dados inválidos',
        description: 'Informe data e valor maior que zero para a sessão.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingNewSession(true);

      const { session, transaction } = await createPatientFinancialSession({
        patientId: id,
        patientName: patient.name,
        date: newSessionForm.date,
        value: newSessionForm.value,
        paymentMethod: newSessionForm.paymentStatus === 'pago' ? newSessionForm.paymentMethod : undefined,
        paymentStatus: newSessionForm.paymentStatus,
      });

      setSessions((prev) => [session, ...prev]);
      setTransactions((prev) => [transaction, ...prev]);
      setNewSessionOpen(false);
      setNewSessionForm({
        date: getTodayISODateInBrazil(),
        value: patient.sessionValue ?? 0,
        paymentMethod: '',
        paymentStatus: 'pendente',
      });

      toast({
        title: 'Sessão cadastrada com sucesso! ✅',
        description: 'A sessão e o lançamento financeiro foram criados.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar sessão',
        description: error?.message ?? 'Não foi possível cadastrar a sessão.',
        variant: 'destructive',
      });
    } finally {
      setSavingNewSession(false);
    }
  };

  const handleOpenPaymentDialog = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setPaymentMethod('PIX');
    setPaymentOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedTransactionId) return;

    try {
      setSavingPayment(true);

      const updatedTransaction = await registerTransactionPayment(selectedTransactionId, paymentMethod);

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === selectedTransactionId
            ? updatedTransaction
            : transaction
        )
      );

      setPaymentOpen(false);
      setSelectedTransactionId(null);

      toast({
        title: 'Pagamento registrado! ✅',
        description: 'O lançamento foi marcado como pago.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: error?.message ?? 'Não foi possível atualizar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!id) return;

    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      setUploadingDocument(true);
      await uploadPatientDocument(id, file);

      const refreshedDocuments = await fetchPatientDocuments(id);
      setDocuments(refreshedDocuments);

      toast({
        title: 'Documento enviado com sucesso! ✅',
        description: file.name,
      });
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error?.message ?? 'Não foi possível enviar o documento.',
        variant: 'destructive',
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDownloadDocument = async (document: PatientDocumentItem) => {
    try {
      setDownloadingDocumentName(document.name);
      const url = await getPatientDocumentDownloadUrl(document.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      toast({
        title: 'Erro ao baixar documento',
        description: error?.message ?? 'Não foi possível gerar o download.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingDocumentName(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!patient || !id) return;

    try {
      setSavingProfile(true);

      const updatedPatient = (await updatePatient(id, {
        name: profileForm.name.trim(),
        birthDate: profileForm.birthDate,
        age: calculateAge(profileForm.birthDate),
        cpf: profileForm.cpf.trim(),
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
        address: profileForm.address.trim(),
        emergencyContact: profileForm.emergencyContact.trim(),
        legalGuardian: profileForm.legalGuardian.trim(),
        healthPlan: profileForm.healthPlan.trim(),
        cardNumber: profileForm.cardNumber.trim(),
        status: profileForm.status,
        notes: profileForm.notes.trim(),
        avatar: getInitials(profileForm.name),
        searchReason: profileForm.searchReason.trim(),
        mainComplaint: profileForm.mainComplaint.trim(),
        healthHistory: profileForm.healthHistory.trim(),
        medications: profileForm.medications.trim(),
        sessionValue: Number(profileForm.sessionValue) || 0,
        diagnosticHypothesis: profileForm.diagnosticHypothesis.trim(),
        cid10: profileForm.cid10.trim(),
        riskLevel: profileForm.riskLevel,
      })) as any;

      const normalizedPatient: Patient = {
        ...patient,
        name: updatedPatient.name ?? profileForm.name.trim(),
        birthDate: updatedPatient.birth_date ?? profileForm.birthDate,
        age: updatedPatient.age ?? calculateAge(profileForm.birthDate),
        cpf: updatedPatient.cpf ?? profileForm.cpf.trim(),
        phone: updatedPatient.phone ?? profileForm.phone.trim(),
        email: updatedPatient.email ?? profileForm.email.trim(),
        address: updatedPatient.address ?? profileForm.address.trim(),
        emergencyContact: updatedPatient.emergency_contact ?? profileForm.emergencyContact.trim(),
        legalGuardian: updatedPatient.legal_guardian ?? profileForm.legalGuardian.trim(),
        healthPlan: updatedPatient.health_plan ?? profileForm.healthPlan.trim(),
        cardNumber: updatedPatient.card_number ?? profileForm.cardNumber.trim(),
        status: updatedPatient.status ?? profileForm.status,
        notes: updatedPatient.notes ?? profileForm.notes.trim(),
        avatar: updatedPatient.avatar ?? getInitials(profileForm.name),
        searchReason: updatedPatient.search_reason ?? profileForm.searchReason.trim(),
        mainComplaint: updatedPatient.main_complaint ?? profileForm.mainComplaint.trim(),
        healthHistory: updatedPatient.health_history ?? profileForm.healthHistory.trim(),
        medications: updatedPatient.medications ?? profileForm.medications.trim(),
        sessionValue: updatedPatient.session_value ?? (Number(profileForm.sessionValue) || 0),
        diagnosticHypothesis: updatedPatient.diagnostic_hypothesis ?? profileForm.diagnosticHypothesis.trim(),
        cid10: updatedPatient.cid10 ?? profileForm.cid10.trim(),
        riskLevel: updatedPatient.risk_level ?? profileForm.riskLevel,
      };

      setPatient(normalizedPatient);
      setEditOpen(false);

      toast({
        title: 'Paciente atualizado com sucesso! ✅',
        description: 'O perfil foi salvo no banco.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar paciente',
        description: error?.message ?? 'Não foi possível salvar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEvolution = async (sessionId: string) => {
    try {
      setSavingEvolutionId(sessionId);
      const evolutionNote = evolutionDrafts[sessionId] ?? '';

      await updateSessionEvolution(sessionId, evolutionNote);

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, evolutionNote }
            : session
        )
      );

      toast({
        title: 'Evolução salva com sucesso! ✅',
        description: 'O texto foi atualizado.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar evolução',
        description: error?.message ?? 'Não foi possível salvar o texto.',
        variant: 'destructive',
      });
    } finally {
      setSavingEvolutionId(null);
    }
  };

  const handleCreateEvolution = async () => {
    if (!patient || !id) return;

    if (!newEvolutionForm.note.trim()) {
      toast({
        title: 'Evolução vazia',
        description: 'Escreva um texto para salvar a evolução.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingNewEvolution(true);

      const createdSession = await createPatientEvolution({
        patientId: id,
        patientName: patient.name,
        date: newEvolutionForm.date,
        evolutionNote: newEvolutionForm.note.trim(),
        value: patient.sessionValue,
      });

      setSessions((prev) => [createdSession, ...prev]);
      setEvolutionDrafts((prev) => ({
        ...prev,
        [createdSession.id]: createdSession.evolutionNote ?? '',
      }));

      setNewEvolutionOpen(false);
      setNewEvolutionForm({ date: getTodayISODateInBrazil(), note: '' });

      toast({
        title: 'Evolução criada com sucesso! ✅',
        description: 'Nova anotação adicionada à linha do tempo.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar evolução',
        description: error?.message ?? 'Não foi possível salvar a anotação.',
        variant: 'destructive',
      });
    } finally {
      setSavingNewEvolution(false);
    }
  };

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
          <Button
            variant="outline"
            className="ml-4 border-border text-foreground hover:bg-secondary gap-2"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-4 h-4" />
            Editar perfil
          </Button>
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
          </motion.div>
        </TabsContent>

        {/* Evolução */}
        <TabsContent value="evolucao">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-foreground">Linha do Tempo</h3>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  setNewEvolutionForm({ date: getTodayISODateInBrazil(), note: '' });
                  setNewEvolutionOpen(true);
                }}
              >
                + Nova Evolução
              </Button>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-6">
                {patientSessions.map((s) => (
                  <div key={s.id} className="relative pl-10">
                    <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-foreground">{formatDateBR(s.date)}</span>
                        <span className="text-xs text-muted-foreground">{s.startTime} · {s.duration}min</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeClass(s.status)}`}>
                          {getStatusLabel(s.status)}
                        </span>
                      </div>
                      <Textarea
                        value={evolutionDrafts[s.id] ?? ''}
                        onChange={(e) =>
                          setEvolutionDrafts((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        className="bg-card border-border min-h-[140px]"
                        placeholder="Escreva a evolução desta sessão..."
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => handleSaveEvolution(s.id)}
                          disabled={savingEvolutionId === s.id}
                        >
                          {savingEvolutionId === s.id ? 'Salvando...' : 'Salvar evolução'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {patientSessions.length === 0 && (
                  <p className="text-sm text-muted-foreground pl-10">Nenhuma evolução registrada.</p>
                )}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-end">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  setNewSessionForm({
                    date: getTodayISODateInBrazil(),
                    value: patient.sessionValue ?? 0,
                    paymentMethod: '',
                    paymentStatus: 'pendente',
                  });
                  setNewSessionOpen(true);
                }}
              >
                + Nova Sessão
              </Button>
            </div>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-primary hover:text-primary"
                            onClick={() => handleOpenPaymentDialog(t.id)}
                          >
                            Registrar
                          </Button>
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
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUploadDocument}
                />
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDocument}
                >
                  {uploadingDocument ? 'Enviando...' : '+ Upload Arquivo'}
                </Button>
              </>
            </div>
            <div className="space-y-3">
              {loadingDocuments ? (
                <p className="text-sm text-muted-foreground">Carregando documentos...</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
              ) : (
                documents.map((doc) => (
                <div key={doc.path} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Arquivo · {doc.createdAt ? formatDateInBrazil(doc.createdAt) : '—'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-primary"
                    onClick={() => handleDownloadDocument(doc)}
                    disabled={downloadingDocumentName === doc.name}
                  >
                    {downloadingDocumentName === doc.name ? 'Baixando...' : 'Baixar'}
                  </Button>
                </div>
                ))
              )}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      <Dialog open={newEvolutionOpen} onOpenChange={setNewEvolutionOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova evolução</DialogTitle>
            <DialogDescription>
              Selecione a data e registre a anotação da evolução do paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data da evolução</label>
              <Input
                type="date"
                value={newEvolutionForm.date}
                onChange={(e) => setNewEvolutionForm((prev) => ({ ...prev, date: e.target.value }))}
                className="bg-secondary border-border"
                disabled={savingNewEvolution}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Texto da evolução</label>
              <Textarea
                value={newEvolutionForm.note}
                onChange={(e) => setNewEvolutionForm((prev) => ({ ...prev, note: e.target.value }))}
                className="bg-secondary border-border min-h-[180px]"
                placeholder="Descreva a evolução da sessão..."
                disabled={savingNewEvolution}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setNewEvolutionOpen(false)} disabled={savingNewEvolution}>
                Cancelar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCreateEvolution} disabled={savingNewEvolution}>
                {savingNewEvolution ? 'Salvando...' : 'Salvar evolução'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cadastrar sessão</DialogTitle>
            <DialogDescription>
              Informe data, valor, método e status para lançar a sessão no financeiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data</label>
              <Input
                type="date"
                value={newSessionForm.date}
                onChange={(e) => setNewSessionForm((prev) => ({ ...prev, date: e.target.value }))}
                className="bg-secondary border-border"
                disabled={savingNewSession}
              />
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
                disabled={savingNewSession}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Método</label>
              <Select
                value={newSessionForm.paymentMethod || undefined}
                onValueChange={(value) => setNewSessionForm((prev) => ({ ...prev, paymentMethod: value }))}
                disabled={savingNewSession || newSessionForm.paymentStatus === 'pendente'}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select
                value={newSessionForm.paymentStatus}
                onValueChange={(value) =>
                  setNewSessionForm((prev) => ({
                    ...prev,
                    paymentStatus: value as 'pago' | 'pendente',
                    paymentMethod: value === 'pendente' ? '' : prev.paymentMethod,
                  }))
                }
                disabled={savingNewSession}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setNewSessionOpen(false)} disabled={savingNewSession}>
                Cancelar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCreateFinancialSession} disabled={savingNewSession}>
                {savingNewSession ? 'Salvando...' : 'Salvar sessão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar pagamento</DialogTitle>
            <DialogDescription>
              Escolha o método de pagamento para marcar o lançamento como pago.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Método</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={savingPayment}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={savingPayment}>
                Cancelar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleRegisterPayment} disabled={savingPayment}>
                {savingPayment ? 'Registrando...' : 'Confirmar pagamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open && patient) {
            setProfileForm({
              name: patient.name ?? '',
              birthDate: patient.birthDate ?? '',
              cpf: patient.cpf ?? '',
              phone: patient.phone ?? '',
              email: patient.email ?? '',
              address: patient.address ?? '',
              emergencyContact: patient.emergencyContact ?? '',
              legalGuardian: patient.legalGuardian ?? '',
              healthPlan: patient.healthPlan ?? '',
              cardNumber: patient.cardNumber ?? '',
              status: patient.status ?? 'ativo',
              notes: patient.notes ?? '',
              searchReason: patient.searchReason ?? '',
              mainComplaint: patient.mainComplaint ?? '',
              healthHistory: patient.healthHistory ?? '',
              medications: patient.medications ?? '',
              sessionValue: patient.sessionValue ?? 0,
              diagnosticHypothesis: patient.diagnosticHypothesis ?? '',
              cid10: patient.cid10 ?? '',
              riskLevel: patient.riskLevel ?? 'baixo',
            });
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar paciente</DialogTitle>
            <DialogDescription>
              Atualize os dados pessoais, clínicos e de status do paciente cadastrado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data de nascimento</label>
                <Input type="date" value={profileForm.birthDate} onChange={(e) => setProfileForm((prev) => ({ ...prev, birthDate: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Idade calculada</label>
                <Input value={calculateAge(profileForm.birthDate) || ''} readOnly className="bg-secondary/50 border-border opacity-80" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={profileForm.status} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, status: value as Patient['status'] }))} disabled={savingProfile}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="em_pausa">Em Pausa</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="encaminhado">Encaminhado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CPF</label>
                <Input value={profileForm.cpf} onChange={(e) => setProfileForm((prev) => ({ ...prev, cpf: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Endereço</label>
                <Input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contato de emergência</label>
                <Input value={profileForm.emergencyContact} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContact: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Responsável legal</label>
                <Input value={profileForm.legalGuardian} onChange={(e) => setProfileForm((prev) => ({ ...prev, legalGuardian: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Plano de saúde</label>
                <Input value={profileForm.healthPlan} onChange={(e) => setProfileForm((prev) => ({ ...prev, healthPlan: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nº carteirinha</label>
                <Input value={profileForm.cardNumber} onChange={(e) => setProfileForm((prev) => ({ ...prev, cardNumber: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nível de risco</label>
                <Select value={profileForm.riskLevel} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, riskLevel: value as Patient['riskLevel'] }))} disabled={savingProfile}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione o risco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixo">Baixo</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor por sessão (R$)</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={profileForm.sessionValue}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, sessionValue: Number(e.target.value) || 0 }))}
                  className="bg-secondary border-border"
                  disabled={savingProfile}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Motivo de busca</label>
                <Textarea value={profileForm.searchReason} onChange={(e) => setProfileForm((prev) => ({ ...prev, searchReason: e.target.value }))} className="bg-secondary border-border min-h-[92px]" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Queixa principal</label>
                <Textarea value={profileForm.mainComplaint} onChange={(e) => setProfileForm((prev) => ({ ...prev, mainComplaint: e.target.value }))} className="bg-secondary border-border min-h-[92px]" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Histórico de saúde</label>
                <Textarea value={profileForm.healthHistory} onChange={(e) => setProfileForm((prev) => ({ ...prev, healthHistory: e.target.value }))} className="bg-secondary border-border min-h-[92px]" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Medicações em uso</label>
                <Textarea value={profileForm.medications} onChange={(e) => setProfileForm((prev) => ({ ...prev, medications: e.target.value }))} className="bg-secondary border-border min-h-[92px]" disabled={savingProfile} placeholder="Separe por vírgula se necessário" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hipótese diagnóstica</label>
                <Textarea value={profileForm.diagnosticHypothesis} onChange={(e) => setProfileForm((prev) => ({ ...prev, diagnosticHypothesis: e.target.value }))} className="bg-secondary border-border min-h-[92px]" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CID-10</label>
                <Input value={profileForm.cid10} onChange={(e) => setProfileForm((prev) => ({ ...prev, cid10: e.target.value }))} className="bg-secondary border-border" disabled={savingProfile} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
                <Textarea value={profileForm.notes} onChange={(e) => setProfileForm((prev) => ({ ...prev, notes: e.target.value }))} className="bg-secondary border-border min-h-[92px]" disabled={savingProfile} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingProfile}>
                Cancelar
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
