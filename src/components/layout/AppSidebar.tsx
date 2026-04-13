import { LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut, Flower2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { fetchPsychologistProfile } from '@/services/supabaseQueries';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Pacientes', url: '/pacientes', icon: Users },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

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

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<{ name: string; crp: string } | null>(null);
  const [avatarColor, setAvatarColor] = useState('bg-primary/20 text-primary');
  const [avatarInitials, setAvatarInitials] = useState('PP');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchPsychologistProfile();
        if (data) {
          const name = data.name ?? 'Profissional';
          setProfile({
            name: name,
            crp: data.crp ?? '-',
          });
          setAvatarInitials(getInitials(name));
          setAvatarColor(getAvatarColor(name));
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };

    loadProfile();

    // Listen for profile updates from settings page
    window.addEventListener('profileUpdated', loadProfile);
    return () => window.removeEventListener('profileUpdated', loadProfile);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Flower2 className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xl font-bold text-foreground tracking-tight">PsicoPlanner</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url || 
            (item.url !== '/' && location.pathname.startsWith(item.url));
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === '/'}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              activeClassName=""
            >
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-pink" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor}`}>
            {avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile?.name ?? 'Carregando...'}</p>
            <p className="text-xs text-muted-foreground">CRP {profile?.crp ?? '-'}</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
