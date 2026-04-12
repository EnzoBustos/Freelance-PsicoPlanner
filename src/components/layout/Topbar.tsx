import { Bell } from 'lucide-react';
import { psychologist, clinicalAlerts } from '@/data/mockData';

export function Topbar({ title }: { title: string }) {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-8 shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth">
          <Bell className="w-5 h-5" />
          {clinicalAlerts.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse-pink" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
            CR
          </div>
          <span className="text-sm font-medium text-foreground hidden md:block">{psychologist.name}</span>
        </div>
      </div>
    </header>
  );
}
