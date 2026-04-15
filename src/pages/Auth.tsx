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
import { BrainCircuit, Eye, EyeOff } from 'lucide-react';

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
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        navigate('/');
      } else {
        // Validação de campos obrigatórios
        if (!fullName.trim()) {
          throw new Error('Por favor, preencha seu nome completo.');
        }
        if (!crp.trim()) {
          throw new Error('Por favor, informe seu CRP.');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedCrp = normalizeCrp(crp.trim());

        console.log('🔍 [Auth] Iniciando signup:', { normalizedEmail, normalizedCrp });

        // Step 1: Check for conflicts using RPC
        console.log('🔍 [Auth] Chamando RPC check_profile_conflict...');
        const { data: conflictData, error: conflictError } = await (supabase.rpc as any)('check_profile_conflict', {
          p_email: normalizedEmail,
          p_crp: normalizedCrp,
        });

        console.log('🔍 [Auth] Resultado RPC:', { conflictData, conflictError });

        if (conflictError) {
          console.error('❌ [Auth] Erro na RPC:', conflictError);
          throw new Error('Não conseguimos validar os dados. Tente novamente em alguns segundos.');
        }

        // RPC returns array with single row containing email_exists and crp_exists
        const conflict = Array.isArray(conflictData) && conflictData.length > 0 
          ? conflictData[0] 
          : {};
        
        console.log('🔍 [Auth] Verificando conflitos:', { 
          email_exists: conflict?.email_exists, 
          crp_exists: conflict?.crp_exists 
        });

        if (conflict?.email_exists) {
          console.warn('⚠️ [Auth] Email já existe:', normalizedEmail);
          throw new Error('Este e-mail já tem uma conta cadastrada.');
        }
        if (conflict?.crp_exists) {
          console.warn('⚠️ [Auth] CRP já existe:', normalizedCrp);
          throw new Error('Este CRP já tem uma conta cadastrada.');
        }

        // Step 2: Create auth user
        console.log('🔍 [Auth] Criando usuário de autenticação...');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { 
              name: fullName.trim(), 
              crp: normalizedCrp,
            },
          },
        });

        if (signUpError) {
          console.error('❌ [Auth] Erro ao fazer signup:', signUpError);
          if (signUpError.message?.toLowerCase().includes('already registered')) {
            throw new Error('Este e-mail já tem uma conta cadastrada.');
          }
          throw signUpError;
        }

        console.log('✅ [Auth] Usuário criado com sucesso:', data.user?.id);

        // Step 3: Profile creation is handled automatically by SQL trigger
        // No need to manually insert, as the trigger will create it
        console.log('✅ [Auth] Perfil será criado automaticamente pelo trigger SQL');

        console.log('✅ [Auth] Cadastro completado com sucesso!');
        toast({
          title: 'Cadastro realizado com sucesso! 🎉',
          description: 'Você será redirecionado para o login.',
        });

        // Limpar formulário
        setTimeout(() => {
          setIsLogin(true);
          setEmail('');
          setPassword('');
          setFullName('');
          setCrp('');
        }, 2000);
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Ocorreu um erro desconhecido. Tente novamente.';
      
      // Traduzir e melhorar mensagens de erro técnicas
      if (errorMessage.includes('Row-level security policy')) {
        errorMessage = 'Erro ao criar perfil. Por favor, contate o suporte.';
      } else if (errorMessage.includes('already registered')) {
        errorMessage = 'Este e-mail já está cadastrado.';
      } else if (errorMessage.includes('password should be at least')) {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = 'E-mail inválido. Verifique e tente novamente.';
      } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        errorMessage = 'E-mail ou senha inválidos.';
      } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
        errorMessage = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
      }

      toast({
        title: isLogin ? 'Erro no login' : 'Erro no cadastro',
        description: errorMessage,
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4 border border-border/60">
            <BrainCircuit className="w-8 h-8 text-primary" />
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
