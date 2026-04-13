import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { User, Clock, DollarSign, Bell, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchPsychologistProfile, updatePsychologistProfile, fetchSchedulePreferences, updateSchedulePreference, updateNotificationPreferences, changePassword } from '@/services/supabaseQueries';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScheduleDay {
  id: string;
  dayOfWeek: number;
  dayName: string;
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profile, setProfile] = useState({
    name: '',
    crp: '',
    email: '',
    phone: '',
    specialties: '',
    defaultSessionValue: 250.00,
    defaultSessionDuration: 50,
    cancellationPolicy: '24h',
  });
  const [notifications, setNotifications] = useState({
    notification_session_reminder: true,
    notification_patient_absences: true,
    notification_pending_payment: true,
    notification_missing_evolution: true,
  });
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleDay[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchPsychologistProfile();
        if (data) {
          setProfile({
            name: data.name ?? '',
            crp: data.crp ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            specialties: Array.isArray(data.specialties) ? data.specialties.join(', ') : '',
            defaultSessionValue: data.default_session_value ?? 250.00,
            defaultSessionDuration: data.default_session_duration ?? 50,
            cancellationPolicy: data.cancellation_policy ?? '24h',
          });
          // Load notification preferences
          setNotifications({
            notification_session_reminder: data.notification_session_reminder ?? true,
            notification_patient_absences: data.notification_patient_absences ?? true,
            notification_pending_payment: data.notification_pending_payment ?? true,
            notification_missing_evolution: data.notification_missing_evolution ?? true,
          });
        }
      } catch (error: any) {
        toast({
          title: 'Erro ao carregar perfil',
          description: error?.message ?? 'Não foi possível carregar seus dados.',
          variant: 'destructive',
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [toast]);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await fetchSchedulePreferences();
        setSchedule(data);
        setOriginalSchedule(JSON.parse(JSON.stringify(data))); // Deep copy
      } catch (error: any) {
        console.error('Erro ao carregar horários:', error);
        // Set default schedule if fetch fails
        const defaultSchedule = [
          { id: '1', dayOfWeek: 0, dayName: 'Domingo', isActive: false, startTime: null, endTime: null },
          { id: '2', dayOfWeek: 1, dayName: 'Segunda', isActive: true, startTime: '08:00', endTime: '18:00' },
          { id: '3', dayOfWeek: 2, dayName: 'Terça', isActive: true, startTime: '08:00', endTime: '18:00' },
          { id: '4', dayOfWeek: 3, dayName: 'Quarta', isActive: true, startTime: '08:00', endTime: '18:00' },
          { id: '5', dayOfWeek: 4, dayName: 'Quinta', isActive: true, startTime: '08:00', endTime: '18:00' },
          { id: '6', dayOfWeek: 5, dayName: 'Sexta', isActive: true, startTime: '08:00', endTime: '16:00' },
          { id: '7', dayOfWeek: 6, dayName: 'Sábado', isActive: false, startTime: null, endTime: null },
        ];
        setSchedule(defaultSchedule);
        setOriginalSchedule(defaultSchedule);
      } finally {
        setLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Only send editable fields to database
      const updateData = {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        specialties: profile.specialties
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
        default_session_value: parseFloat(String(profile.defaultSessionValue)),
        default_session_duration: Number(profile.defaultSessionDuration) || 50,
        cancellation_policy: profile.cancellationPolicy,
      };
      
      await updatePsychologistProfile(updateData);

      // Dispatch custom event to notify other components to refetch profile
      window.dispatchEvent(new Event('profileUpdated'));

      toast({
        title: 'Perfil atualizado com sucesso! ✅',
        description: 'Suas alterações foram salvas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar perfil',
        description: error?.message ?? 'Não foi possível salvar seus dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScheduleDay = async (daySchedule: ScheduleDay) => {
    try {
      setSavingSchedule(true);
      
      await updateSchedulePreference(daySchedule.id, {
        isActive: daySchedule.isActive,
        startTime: daySchedule.isActive ? daySchedule.startTime : null,
        endTime: daySchedule.isActive ? daySchedule.endTime : null,
      });

      toast({
        title: `${daySchedule.dayName} atualizado com sucesso! ✅`,
        description: daySchedule.isActive 
          ? `${daySchedule.startTime} às ${daySchedule.endTime}`
          : 'Dia marcado como fechado',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar horário',
        description: error?.message ?? 'Não foi possível salvar.',
        variant: 'destructive',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveAllSchedule = async () => {
    try {
      setSavingSchedule(true);
      
      // Save all days that were modified
      const promises = schedule.map((day) =>
        updateSchedulePreference(day.id, {
          isActive: day.isActive,
          startTime: day.isActive ? day.startTime : null,
          endTime: day.isActive ? day.endTime : null,
        })
      );

      await Promise.all(promises);
      
      // Update original schedule to track changes
      setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));

      toast({
        title: 'Agenda atualizada com sucesso! ✅',
        description: 'Todos os horários foram salvos.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar agenda',
        description: error?.message ?? 'Não foi possível salvar alguns horários.',
        variant: 'destructive',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const updateScheduleDay = (dayId: string, field: string, value: any) => {
    setSchedule((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? { ...day, [field]: value }
          : day
      )
    );
  };

  const handleSaveNotifications = async () => {
    try {
      setSavingNotifications(true);
      await updateNotificationPreferences(notifications);
      
      window.dispatchEvent(new Event('profileUpdated'));

      toast({
        title: 'Notificações atualizadas com sucesso! ✅',
        description: 'Suas preferências foram salvas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar notificações',
        description: error?.message ?? 'Não foi possível salvar suas preferências.',
        variant: 'destructive',
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: 'Erro de validação',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Erro de validação',
        description: 'As senhas não conferem.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await changePassword(passwordForm.newPassword);

      toast({
        title: 'Senha alterada com sucesso! ✅',
        description: 'sua nova senha foi salva.',
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordDialog(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: error?.message ?? 'Não foi possível alterar sua senha.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Configurações">
      <div className="max-w-3xl space-y-6">
        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Dados Profissionais</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-secondary border-border"
                disabled={loadingProfile || saving}
                placeholder="Digite seu nome"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">CRP (Não editável)</label>
              <Input
                value={profile.crp}
                className="bg-secondary/50 border-border opacity-60"
                disabled={true}
                placeholder="CRP"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">E-mail (Não editável)</label>
              <Input
                value={profile.email}
                className="bg-secondary/50 border-border opacity-60"
                disabled={true}
                placeholder="E-mail"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-secondary border-border"
                disabled={loadingProfile || saving}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Especialidades</label>
              <Input
                value={profile.specialties}
                onChange={(e) => setProfile((prev) => ({ ...prev, specialties: e.target.value }))}
                className="bg-secondary border-border"
                disabled={loadingProfile || saving}
                placeholder="Ex: Psicologia Clínica, Terapia Cognitivo-comportamental"
              />
              <p className="text-xs text-muted-foreground mt-1">Separe por vírgula</p>
            </div>
          </div>
          <Button
            className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSaveProfile}
            disabled={loadingProfile || saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </motion.div>

        {/* Schedule */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Configurações de Agenda</h2>
          </div>
          {loadingSchedule ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {schedule.map((day) => (
                  <div key={day.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                    <Switch
                      checked={day.isActive}
                      onCheckedChange={(checked) => updateScheduleDay(day.id, 'isActive', checked)}
                      className="data-[state=checked]:bg-primary"
                      disabled={savingSchedule}
                    />
                    <span className="text-sm font-medium text-foreground w-20">{day.dayName}</span>
                    {day.isActive ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={day.startTime || '08:00'}
                          onChange={(e) => updateScheduleDay(day.id, 'startTime', e.target.value)}
                          className="w-24 bg-card border-border text-sm"
                          disabled={savingSchedule}
                        />
                        <span className="text-muted-foreground text-sm">até</span>
                        <Input
                          type="time"
                          value={day.endTime || '18:00'}
                          onChange={(e) => updateScheduleDay(day.id, 'endTime', e.target.value)}
                          className="w-24 bg-card border-border text-sm"
                          disabled={savingSchedule}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground flex-1">Fechado</span>
                    )}
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => handleSaveAllSchedule()}
                disabled={savingSchedule || loadingSchedule}
              >
                {savingSchedule ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </>
          )}
        </motion.div>

        {/* Values */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Valores Padrão</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor Padrão por Sessão (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-medium text-foreground">R$</span>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={profile.defaultSessionValue}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setProfile((prev) => ({ ...prev, defaultSessionValue: isNaN(value) ? 0 : value }));
                  }}
                  className="bg-secondary border-border pl-10"
                  disabled={loadingProfile || saving}
                  placeholder="250"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Política de Cancelamento</label>
              <Select
                value={profile.cancellationPolicy}
                onValueChange={(value) => setProfile((prev) => ({ ...prev, cancellationPolicy: value }))}
                disabled={loadingProfile || saving}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione uma política" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Até 1 hora antes</SelectItem>
                  <SelectItem value="24h">24 horas de antecedência</SelectItem>
                  <SelectItem value="1w">1 semana de antecedência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duração Padrão da Sessão (min)</label>
              <Input
                type="number"
                min="10"
                step="5"
                value={profile.defaultSessionDuration}
                onChange={(e) => {
                  const value = Number(e.target.value) || 50;
                  setProfile((prev) => ({ ...prev, defaultSessionDuration: value }));
                }}
                className="bg-secondary border-border"
                disabled={loadingProfile || saving}
                placeholder="50"
              />
            </div>
          </div>
          <Button
            className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSaveProfile}
            disabled={loadingProfile || saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Lembrete de sessão</span>
                <p className="text-xs text-muted-foreground">10 minutos antes da sessão</p>
              </div>
              <Switch
                checked={notifications.notification_session_reminder}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, notification_session_reminder: checked }))}
                className="data-[state=checked]:bg-primary"
                disabled={savingNotifications}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Paciente com faltas</span>
                <p className="text-xs text-muted-foreground">Padrão de ausências detectado</p>
              </div>
              <Switch
                checked={notifications.notification_patient_absences}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, notification_patient_absences: checked }))}
                className="data-[state=checked]:bg-primary"
                disabled={savingNotifications}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Pagamento pendente</span>
                <p className="text-xs text-muted-foreground">Há mais de 15 dias</p>
              </div>
              <Switch
                checked={notifications.notification_pending_payment}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, notification_pending_payment: checked }))}
                className="data-[state=checked]:bg-primary"
                disabled={savingNotifications}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Evolução não registrada</span>
                <p className="text-xs text-muted-foreground">Há mais de 14 dias</p>
              </div>
              <Switch
                checked={notifications.notification_missing_evolution}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, notification_missing_evolution: checked }))}
                className="data-[state=checked]:bg-primary"
                disabled={savingNotifications}
              />
            </div>
          </div>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSaveNotifications}
            disabled={savingNotifications || loadingProfile}
          >
            {savingNotifications ? 'Salvando...' : 'Salvar Preferências'}
          </Button>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Segurança</h2>
          </div>
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-secondary"
            onClick={() => setShowPasswordDialog(true)}
          >
            Alterar Senha
          </Button>
        </motion.div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Alterar Senha</DialogTitle>
            <DialogDescription>Digite sua nova senha (mínimo 8 caracteres)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nova Senha</label>
              <Input
                type="password"
                placeholder="Digite sua nova senha"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="bg-secondary border-border"
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirmar Senha</label>
              <Input
                type="password"
                placeholder="Confirme sua nova senha"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-secondary border-border"
                disabled={saving}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
