import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchClinicalAlerts, fetchPsychologistProfile } from '@/services/supabaseQueries';

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
  const [profileName, setProfileName] = useState('Carregando...');
  const [profileInitials, setProfileInitials] = useState('PP');
  const [avatarColor, setAvatarColor] = useState('bg-primary/20 text-primary');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [alerts, profile] = await Promise.all([
          fetchClinicalAlerts().catch(() => []),
          fetchPsychologistProfile().catch(() => null),
        ]);
        setAlertsCount(alerts.length);
        if (profile?.name) {
          setProfileName(profile.name);
          const initials = getInitials(profile.name);
          setProfileInitials(initials);
          setAvatarColor(getAvatarColor(profile.name));
        }
      } catch (error) {
        console.error('Erro ao carregar topbar:', error);
      }
    };

    loadData();

    // Listen for profile updates from settings page
    window.addEventListener('profileUpdated', loadData);
    return () => window.removeEventListener('profileUpdated', loadData);
  }, []);

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
          {alertsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse-pink" />
          )}
        </button>
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
