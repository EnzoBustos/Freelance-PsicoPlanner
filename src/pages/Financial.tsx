import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, AlertTriangle, Download, Loader } from 'lucide-react';
import { formatCurrency, formatDateBR, getStatusBadgeClass, getStatusLabel } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '@/data/mockData';
import { fetchTransactions } from '@/services/supabaseQueries';

export default function Financial() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await fetchTransactions();
        setTransactions(data);
      } catch (error) {
        console.error('Erro ao carregar financeiro:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const totalReceived = transactions.filter((t) => t.status === 'pago').reduce((s, t) => s + t.value, 0);
  const totalPending = transactions.filter((t) => t.status === 'pendente').reduce((s, t) => s + t.value, 0);
  const totalSessions = transactions.length;

  const weekData = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weeks = [0, 0, 0, 0, 0];

    transactions
      .filter((t) => t.status === 'pago')
      .forEach((t) => {
        const d = new Date(t.date);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const weekIndex = Math.min(4, Math.floor((d.getDate() - monthStart.getDate()) / 7));
          weeks[weekIndex] += t.value;
        }
      });

    return weeks.map((receita, i) => ({ name: `Sem ${i + 1}`, receita }));
  }, [transactions]);

  const defaulters = useMemo(() => {
    const pendingByPatient = new Map<string, { amount: number; days: number }>();
    const today = new Date();

    transactions
      .filter((t) => t.status === 'pendente' && t.patientName)
      .forEach((t) => {
        const key = t.patientName;
        const txDate = new Date(t.date);
        const days = Math.max(0, Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)));
        const current = pendingByPatient.get(key) ?? { amount: 0, days: 0 };
        pendingByPatient.set(key, {
          amount: current.amount + t.value,
          days: Math.max(current.days, days),
        });
      });

    return Array.from(pendingByPatient.entries())
      .map(([name, v]) => ({ name, amount: v.amount, days: v.days }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  if (loading) {
    return (
      <AppLayout title="Financeiro">
        <div className="flex items-center justify-center min-h-[360px]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Financeiro">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Recebido', value: formatCurrency(totalReceived), icon: DollarSign, color: 'text-success' },
          { label: 'Total Pendente', value: formatCurrency(totalPending), icon: Clock, color: 'text-warning' },
          { label: 'Sessões no Mês', value: totalSessions, icon: TrendingUp, color: 'text-primary' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita por Semana</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 22%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(240 5% 58%)', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: 'hsl(240 5% 58%)', fontSize: 12 }} axisLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(240 4% 16%)', border: '1px solid hsl(240 4% 22%)', borderRadius: 8, color: 'hsl(240 5% 96%)' }}
                formatter={(value: number) => [formatCurrency(value), 'Receita']}
              />
              <Bar dataKey="receita" fill="hsl(270 76% 62%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Defaulters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Inadimplentes</h3>
          </div>
          <div className="space-y-3">
            {defaulters.map(d => (
              <div key={d.name} className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-destructive font-medium">{formatCurrency(d.amount)}</span>
                  <span className="text-xs text-muted-foreground">{d.days} dias</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Transactions table */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Transações do Mês</h3>
        <Button size="sm" variant="outline" className="gap-2 border-border text-foreground hover:bg-secondary">
          <Download className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Data', 'Paciente', 'Tipo', 'Valor', 'Método', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-smooth">
                  <td className="px-6 py-3 text-sm text-foreground">{formatDateBR(t.date)}</td>
                  <td className="px-6 py-3 text-sm text-foreground">{t.patientName}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{getStatusLabel(t.type)}</td>
                  <td className="px-6 py-3 text-sm text-foreground font-medium">{formatCurrency(t.value)}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{t.paymentMethod || '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(t.status)}`}>
                      {getStatusLabel(t.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
