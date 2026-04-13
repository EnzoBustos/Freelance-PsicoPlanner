import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Flower2 } from 'lucide-react';

export default function Auth() {
  const { session, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [crp, setCrp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const normalizeCrp = (value: string) => value.replace(/\s+/g, '').toLowerCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        // Validação de campos obrigatórios
        if (!fullName.trim()) {
          throw new Error('Nome completo é obrigatório');
        }
        if (!crp.trim()) {
          throw new Error('CRP é obrigatório');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedCrp = normalizeCrp(crp.trim());

        const { data: conflictData, error: conflictError } = await supabase.rpc('check_profile_conflict', {
          p_email: normalizedEmail,
          p_crp: normalizedCrp,
        });

        if (conflictError) {
          throw new Error('Não foi possível validar duplicidade de e-mail/CRP.');
        }

        const conflict = Array.isArray(conflictData) ? conflictData[0] : conflictData;
        if (conflict?.email_exists) {
          throw new Error('Este e-mail já está cadastrado.');
        }
        if (conflict?.crp_exists) {
          throw new Error('Este CRP já está cadastrado.');
        }

        // Sign up com metadata
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { 
              name: fullName, 
              crp: normalizedCrp,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message?.toLowerCase().includes('already registered')) {
            throw new Error('Este e-mail já está cadastrado.');
          }
          throw signUpError;
        }

        // Insert adicional em profiles como fallback
        // (o trigger SQL fará isso automaticamente, mas como backup)
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([
              {
                id: data.user.id,
                email: normalizedEmail,
                name: fullName.trim(),
                crp: normalizedCrp,
              }
            ], { onConflict: 'id' });

          // Se der erro de duplicata, ignora (significa que o trigger já criou)
          if (profileError && !profileError.message.includes('duplicate')) {
            console.warn('Aviso ao criar perfil:', profileError);
          }
        }

        toast({
          title: 'Cadastro realizado com sucesso! 🎉',
          description: 'Você será redirecionado para o login.',
        });

        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          setIsLogin(true);
          setEmail('');
          setPassword('');
          setFullName('');
          setCrp('');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mb-4">
            <Flower2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">PsicoPlanner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? 'Acesse sua conta' : 'Crie sua conta profissional'}
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground text-sm">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Dra. Maria Silva"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required={!isLogin}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crp" className="text-foreground text-sm">CRP</Label>
                  <Input
                    id="crp"
                    type="text"
                    placeholder="06/123456"
                    value={crp}
                    onChange={e => setCrp(e.target.value)}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-sm">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground text-sm">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {submitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-smooth"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
