import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { Loader, Search, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStatusBadgeClass, getStatusLabel, formatDateBR } from '@/data/mockData';
import type { Patient } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createPatient, fetchPatients, fetchPsychologistProfile } from '@/services/supabaseQueries';

const statusFilters = ['todos', 'ativo', 'em_pausa', 'alta', 'encaminhado'] as const;

const patientStatuses = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'em_pausa', label: 'Em Pausa' },
  { value: 'alta', label: 'Alta' },
  { value: 'encaminhado', label: 'Encaminhado' },
] as const;

const emptyForm = {
  name: '',
  birthDate: '',
  status: 'ativo' as Patient['status'],
  phone: '',
  email: '',
  emergencyContact: '',
  mainComplaint: '',
  notes: '',
  address: '',
  useMedication: true,
  medications: [] as string[],
  sessionValue: 0,
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

export default function Patients() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [medicationDraft, setMedicationDraft] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [defaultSessionValue, setDefaultSessionValue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patientsData, profileData] = await Promise.all([
          fetchPatients(),
          fetchPsychologistProfile().catch(() => null),
        ]);

        setPatients(patientsData);
        const profileDefaultValue = Number(profileData?.default_session_value ?? 0);
        setDefaultSessionValue(profileDefaultValue > 0 ? profileDefaultValue : 250);
        setForm((prev) => ({
          ...prev,
          sessionValue: profileDefaultValue > 0 ? profileDefaultValue : 250,
        }));
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'todos' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  const resetForm = () => {
    setForm((prev) => ({
      ...emptyForm,
      sessionValue: defaultSessionValue > 0 ? defaultSessionValue : prev.sessionValue,
    }));
    setMedicationDraft('');
  };

  const handleAddMedication = () => {
    const medication = medicationDraft.trim();

    if (!medication) return;

    setForm((prev) => {
      if (prev.medications.some((item) => item.toLowerCase() === medication.toLowerCase())) {
        return prev;
      }

      return { ...prev, medications: [...prev.medications, medication] };
    });
    setMedicationDraft('');
  };

  const handleRemoveMedication = (medication: string) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications.filter((item) => item !== medication),
    }));
  };

  const handleSavePatient = async () => {
    if (!form.name.trim() || !form.birthDate) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome e a data de nascimento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingPatient(true);

      const age = calculateAge(form.birthDate);

      await createPatient({
        name: form.name.trim(),
        birthDate: form.birthDate,
        age,
        cpf: '',
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        emergencyContact: form.emergencyContact.trim(),
        legalGuardian: '',
        healthPlan: '',
        cardNumber: '',
        notes: form.notes.trim(),
        status: form.status,
        avatar: getInitials(form.name),
        nextSession: undefined,
        sessionValue: form.sessionValue,
        searchReason: '',
        mainComplaint: form.mainComplaint.trim(),
        healthHistory: '',
        medications: form.useMedication ? form.medications.join(', ') : '',
        diagnosticHypothesis: '',
        cid10: '',
        riskLevel: 'baixo',
      });

      const refreshedPatients = await fetchPatients();
      setPatients(refreshedPatients);

      toast({
        title: 'Paciente cadastrado com sucesso! ✅',
        description: 'O cadastro foi salvo no banco.',
      });

      setCreateOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar paciente',
        description: error?.message ?? 'Não foi possível salvar o paciente.',
        variant: 'destructive',
      });
    } finally {
      setSavingPatient(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Pacientes">
        <div className="flex items-center justify-center min-h-[360px]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Pacientes">
      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'todos' ? 'Todos' : getStatusLabel(s)}
            </button>
          ))}
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </Button>
      </div>

      {/* Patient list */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-4">Paciente</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-4">Idade</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-4">Próxima Sessão</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/pacientes/${p.id}`)}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-smooth"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">
                        {p.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{p.age} anos</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {p.nextSession ? formatDateBR(p.nextSession) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum paciente encontrado.</p>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados básicos, medicações e queixa principal para salvar o novo cadastro.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-secondary border-border"
                placeholder="Nome completo"
                disabled={savingPatient}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data de nascimento *</label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                className="bg-secondary border-border"
                disabled={savingPatient}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Idade calculada</label>
              <Input
                value={calculateAge(form.birthDate) || ''}
                readOnly
                className="bg-secondary/50 border-border opacity-80"
                placeholder="Calculada automaticamente"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor por sessão (R$)</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.sessionValue}
                onChange={(e) => setForm((prev) => ({ ...prev, sessionValue: Number(e.target.value) || 0 }))}
                className="bg-secondary border-border"
                disabled={savingPatient}
                placeholder="250"
              />
              <p className="text-xs text-muted-foreground mt-1">Valor padrão do psicólogo: R$ {defaultSessionValue.toFixed(2).replace('.', ',')}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as Patient['status'] }))}
                disabled={savingPatient}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {patientStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-secondary border-border"
                placeholder="(11) 99999-9999"
                disabled={savingPatient}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-secondary border-border"
                placeholder="email@dominio.com"
                disabled={savingPatient}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Contato de emergência</label>
              <Input
                value={form.emergencyContact}
                onChange={(e) => setForm((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                className="bg-secondary border-border"
                placeholder="Nome e telefone"
                disabled={savingPatient}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Endereço</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="bg-secondary border-border"
                placeholder="Endereço completo"
                disabled={savingPatient}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Queixa principal</label>
              <Textarea
                value={form.mainComplaint}
                onChange={(e) => setForm((prev) => ({ ...prev, mainComplaint: e.target.value }))}
                className="bg-secondary border-border min-h-[96px]"
                placeholder="Descreva brevemente a principal queixa"
                disabled={savingPatient}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Observações iniciais</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="bg-secondary border-border min-h-[96px]"
                placeholder="Anotações curtas do cadastro"
                disabled={savingPatient}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <p className="text-sm font-medium text-foreground">Faz uso de medicação?</p>
                <p className="text-xs text-muted-foreground">Adicione e remova as medicações em uso.</p>
              </div>
              <Switch
                checked={form.useMedication}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    useMedication: checked,
                    medications: checked ? prev.medications : [],
                  }))
                }
                className="data-[state=checked]:bg-primary"
                disabled={savingPatient}
              />
            </div>

            {form.useMedication && (
              <div className="md:col-span-2 space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={medicationDraft}
                    onChange={(e) => setMedicationDraft(e.target.value)}
                    className="bg-secondary border-border"
                    placeholder="Ex: Sertralina 50mg"
                    disabled={savingPatient}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMedication();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddMedication} disabled={savingPatient}>
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-2">
                  {form.medications.length > 0 ? (
                    form.medications.map((medication) => (
                      <div key={medication} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <span className="text-sm text-foreground">{medication}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(medication)}
                          className="text-muted-foreground hover:text-foreground transition-smooth"
                          disabled={savingPatient}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma medicação adicionada.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
              disabled={savingPatient}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSavePatient}
              disabled={savingPatient}
            >
              {savingPatient ? 'Salvando...' : 'Salvar Paciente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
