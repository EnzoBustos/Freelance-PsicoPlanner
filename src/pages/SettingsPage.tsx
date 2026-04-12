import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { User, Clock, DollarSign, Bell, Shield } from 'lucide-react';
import { psychologist } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const schedule = [
  { day: 'Segunda', start: '08:00', end: '18:00', active: true },
  { day: 'Terça', start: '08:00', end: '18:00', active: true },
  { day: 'Quarta', start: '08:00', end: '18:00', active: true },
  { day: 'Quinta', start: '08:00', end: '18:00', active: true },
  { day: 'Sexta', start: '08:00', end: '16:00', active: true },
  { day: 'Sábado', start: '09:00', end: '12:00', active: false },
  { day: 'Domingo', start: '', end: '', active: false },
];

export default function SettingsPage() {
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
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input defaultValue={psychologist.name} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">CRP</label>
              <Input defaultValue={psychologist.crp} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
              <Input defaultValue={psychologist.email} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <Input defaultValue={psychologist.phone} className="bg-secondary border-border" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Especialidades</label>
              <Input defaultValue={psychologist.specialties.join(', ')} className="bg-secondary border-border" />
            </div>
          </div>
          <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">Salvar Alterações</Button>
        </motion.div>

        {/* Schedule */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Configurações de Agenda</h2>
          </div>
          <div className="space-y-3">
            {schedule.map(s => (
              <div key={s.day} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                <Switch checked={s.active} className="data-[state=checked]:bg-primary" />
                <span className="text-sm font-medium text-foreground w-24">{s.day}</span>
                {s.active ? (
                  <div className="flex items-center gap-2">
                    <Input defaultValue={s.start} className="w-24 bg-card border-border text-sm" />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input defaultValue={s.end} className="w-24 bg-card border-border text-sm" />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Fechado</span>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duração Padrão (min)</label>
              <Input defaultValue="50" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Intervalo entre Sessões (min)</label>
              <Input defaultValue="10" className="bg-secondary border-border" />
            </div>
          </div>
        </motion.div>

        {/* Values */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Valores Padrão</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor Padrão por Sessão</label>
              <Input defaultValue="250,00" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Política de Cancelamento</label>
              <Input defaultValue="24h de antecedência" className="bg-secondary border-border" />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
          </div>
          <div className="space-y-3">
            {[
              'Lembrete de sessão (30min antes)',
              'Paciente com faltas consecutivas',
              'Pagamento pendente há mais de 15 dias',
              'Evolução não registrada há 14+ dias',
            ].map(n => (
              <div key={n} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-foreground">{n}</span>
                <Switch defaultChecked className="data-[state=checked]:bg-primary" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Segurança</h2>
          </div>
          <Button variant="outline" className="border-border text-foreground hover:bg-secondary">Alterar Senha</Button>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Acessos Recentes</p>
            <div className="space-y-2">
              {['Hoje, 08:32 - São Paulo/SP', 'Ontem, 14:15 - São Paulo/SP', '10/04/2026, 09:00 - São Paulo/SP'].map(a => (
                <p key={a} className="text-sm text-foreground/70">{a}</p>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
