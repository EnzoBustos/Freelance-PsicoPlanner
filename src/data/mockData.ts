export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  age: number;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  legalGuardian?: string;
  healthPlan?: string;
  cardNumber?: string;
  notes: string;
  status: 'ativo' | 'em_pausa' | 'alta' | 'encaminhado';
  avatar: string;
  nextSession?: string;
  sessionValue: number;
  searchReason: string;
  mainComplaint: string;
  healthHistory: string;
  medications: string;
  diagnosticHypothesis: string;
  cid10: string;
  riskLevel: 'baixo' | 'medio' | 'alto';
  therapeuticGoals: TherapeuticGoal[];
}

export interface TherapeuticGoal {
  id: string;
  description: string;
  completed: boolean;
  dateSet: string;
}

export interface Session {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  startTime: string;
  duration: number;
  type: 'presencial' | 'online';
  status: 'confirmada' | 'pendente' | 'cancelada' | 'realizada' | 'falta';
  value: number;
  paymentStatus: 'pago' | 'pendente' | 'isento';
  paymentMethod?: string;
  onlineLink?: string;
  observations?: string;
  evolutionNote?: string;
  recurrencePattern?: 'weekly' | 'biweekly' | 'monthly';
  recurrenceIndex?: number;
}

export interface Transaction {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  type: 'sessao' | 'cancelamento' | 'outro';
  value: number;
  paymentMethod: string;
  status: 'pago' | 'pendente';
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'faltas' | 'evolucao' | 'inadimplencia';
  message: string;
}

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return formatDate(d); };
const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return formatDate(d); };

const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export const psychologist = {
  name: 'Dra. Camila Rodrigues',
  crp: '06/123456',
  specialties: ['Terapia Cognitivo-Comportamental', 'Psicologia Clínica', 'Neuropsicologia'],
  email: 'camila@psicare.com.br',
  phone: '(11) 98765-4321',
};

export const patients: Patient[] = [
  {
    id: '1', name: 'Ana Beatriz Silva', birthDate: '1990-03-15', age: 36, cpf: '123.456.789-00',
    phone: '(11) 91234-5678', email: 'ana.silva@email.com', address: 'Rua das Flores, 123 - São Paulo/SP',
    emergencyContact: 'Carlos Silva - (11) 99876-5432', notes: 'Prefere sessões no período da manhã',
    status: 'ativo', avatar: initials('Ana Beatriz Silva'), nextSession: formatDate(today),
    sessionValue: 250, searchReason: 'Ansiedade e ataques de pânico', mainComplaint: 'Crises de ansiedade frequentes, dificuldade para dormir',
    healthHistory: 'Sem histórico psiquiátrico prévio. Rinite alérgica.', medications: 'Escitalopram 10mg',
    diagnosticHypothesis: 'Transtorno de Ansiedade Generalizada', cid10: 'F41.1', riskLevel: 'medio',
    therapeuticGoals: [
      { id: 'g1', description: 'Reduzir frequência de ataques de pânico', completed: false, dateSet: daysAgo(60) },
      { id: 'g2', description: 'Desenvolver técnicas de respiração', completed: true, dateSet: daysAgo(60) },
      { id: 'g3', description: 'Melhorar qualidade do sono', completed: false, dateSet: daysAgo(30) },
    ],
  },
  {
    id: '2', name: 'Bruno Costa Oliveira', birthDate: '1985-07-22', age: 40, cpf: '234.567.890-11',
    phone: '(11) 92345-6789', email: 'bruno.costa@email.com', address: 'Av. Paulista, 1500 - São Paulo/SP',
    emergencyContact: 'Maria Costa - (11) 98765-1234', notes: 'Empresário, agenda variável',
    status: 'ativo', avatar: initials('Bruno Costa Oliveira'), nextSession: formatDate(today),
    sessionValue: 300, searchReason: 'Burnout e estresse ocupacional', mainComplaint: 'Esgotamento profissional, irritabilidade e insônia',
    healthHistory: 'Hipertensão controlada. Episódio depressivo em 2019.', medications: 'Losartana 50mg',
    diagnosticHypothesis: 'Síndrome de Burnout', cid10: 'Z73.0', riskLevel: 'medio',
    therapeuticGoals: [
      { id: 'g4', description: 'Estabelecer limites no trabalho', completed: false, dateSet: daysAgo(45) },
      { id: 'g5', description: 'Retomar atividades de lazer', completed: true, dateSet: daysAgo(45) },
    ],
  },
  {
    id: '3', name: 'Carla Mendes', birthDate: '1998-11-08', age: 27, cpf: '345.678.901-22',
    phone: '(11) 93456-7890', email: 'carla.mendes@email.com', address: 'Rua Augusta, 800 - São Paulo/SP',
    emergencyContact: 'José Mendes - (11) 97654-3210', notes: 'Estudante universitária',
    status: 'ativo', avatar: initials('Carla Mendes'), nextSession: daysFromNow(1),
    sessionValue: 200, searchReason: 'Depressão e baixa autoestima', mainComplaint: 'Tristeza persistente, isolamento social, dificuldade de concentração',
    healthHistory: 'Depressão diagnosticada aos 22 anos. Tentativa de suicídio em 2021.', medications: 'Sertralina 100mg, Clonazepam 0.5mg',
    diagnosticHypothesis: 'Transtorno Depressivo Recorrente', cid10: 'F33.1', riskLevel: 'alto',
    therapeuticGoals: [
      { id: 'g6', description: 'Aumentar atividades prazerosas semanais', completed: false, dateSet: daysAgo(30) },
      { id: 'g7', description: 'Reestruturação cognitiva de crenças negativas', completed: false, dateSet: daysAgo(30) },
    ],
  },
  {
    id: '4', name: 'Daniel Ferreira Santos', birthDate: '1978-01-30', age: 48, cpf: '456.789.012-33',
    phone: '(11) 94567-8901', email: 'daniel.santos@email.com', address: 'Rua Oscar Freire, 200 - São Paulo/SP',
    emergencyContact: 'Patrícia Santos - (11) 96543-2109', notes: 'Casado, 2 filhos',
    status: 'em_pausa', avatar: initials('Daniel Ferreira Santos'), 
    sessionValue: 280, searchReason: 'Conflitos conjugais', mainComplaint: 'Dificuldade de comunicação com a esposa, crises frequentes',
    healthHistory: 'Sem histórico relevante.', medications: 'Nenhuma',
    diagnosticHypothesis: 'Problemas de relacionamento', cid10: 'Z63.0', riskLevel: 'baixo',
    therapeuticGoals: [
      { id: 'g8', description: 'Melhorar comunicação assertiva', completed: true, dateSet: daysAgo(90) },
    ],
  },
  {
    id: '5', name: 'Elisa Nakamura', birthDate: '2001-05-14', age: 25, cpf: '567.890.123-44',
    phone: '(11) 95678-9012', email: 'elisa.n@email.com', address: 'Rua Liberdade, 500 - São Paulo/SP',
    emergencyContact: 'Yuki Nakamura - (11) 95432-1098', notes: 'Artista, muito criativa',
    status: 'ativo', avatar: initials('Elisa Nakamura'), nextSession: daysFromNow(2),
    sessionValue: 220, searchReason: 'TDAH e dificuldade de organização', mainComplaint: 'Desatenção, procrastinação, dificuldade em manter rotinas',
    healthHistory: 'TDAH diagnosticado na infância.', medications: 'Metilfenidato 20mg',
    diagnosticHypothesis: 'TDAH tipo combinado', cid10: 'F90.0', riskLevel: 'baixo',
    therapeuticGoals: [
      { id: 'g9', description: 'Criar sistema de organização pessoal', completed: false, dateSet: daysAgo(20) },
      { id: 'g10', description: 'Reduzir procrastinação acadêmica', completed: false, dateSet: daysAgo(20) },
    ],
  },
  {
    id: '6', name: 'Felipe Araújo Lima', birthDate: '1995-09-03', age: 30, cpf: '678.901.234-55',
    phone: '(11) 96789-0123', email: 'felipe.lima@email.com', address: 'Rua Consolação, 350 - São Paulo/SP',
    emergencyContact: 'Rosa Lima - (11) 94321-0987', notes: 'Programador, trabalho remoto',
    status: 'ativo', avatar: initials('Felipe Araújo Lima'), nextSession: formatDate(today),
    sessionValue: 250, searchReason: 'Fobia social', mainComplaint: 'Medo intenso de falar em público e situações sociais',
    healthHistory: 'Tratamento anterior interrompido em 2020.', medications: 'Paroxetina 20mg',
    diagnosticHypothesis: 'Transtorno de Ansiedade Social', cid10: 'F40.1', riskLevel: 'medio',
    therapeuticGoals: [
      { id: 'g11', description: 'Exposição gradual a situações sociais', completed: false, dateSet: daysAgo(40) },
      { id: 'g12', description: 'Participar de uma reunião sem evitação', completed: false, dateSet: daysAgo(40) },
    ],
  },
  {
    id: '7', name: 'Gabriela Rocha', birthDate: '1988-12-20', age: 37, cpf: '789.012.345-66',
    phone: '(11) 97890-1234', email: 'gabi.rocha@email.com', address: 'Alameda Santos, 900 - São Paulo/SP',
    emergencyContact: 'Pedro Rocha - (11) 93210-9876', notes: 'Médica, horários noturnos',
    status: 'alta', avatar: initials('Gabriela Rocha'),
    sessionValue: 280, searchReason: 'Luto', mainComplaint: 'Perda do pai, dificuldade de elaboração do luto',
    healthHistory: 'Sem histórico prévio.', medications: 'Nenhuma',
    diagnosticHypothesis: 'Luto não complicado', cid10: 'Z63.4', riskLevel: 'baixo',
    therapeuticGoals: [
      { id: 'g13', description: 'Elaboração saudável do luto', completed: true, dateSet: daysAgo(120) },
      { id: 'g14', description: 'Retomar rotina profissional plena', completed: true, dateSet: daysAgo(90) },
    ],
  },
  {
    id: '8', name: 'Henrique Barbosa', birthDate: '2010-06-18', age: 15, cpf: '890.123.456-77',
    phone: '(11) 98901-2345', email: 'henrique.b@email.com', address: 'Rua Haddock Lobo, 150 - São Paulo/SP',
    emergencyContact: 'Mariana Barbosa - (11) 92109-8765', legalGuardian: 'Mariana Barbosa (mãe)',
    notes: 'Adolescente, cursa 9º ano', status: 'ativo', avatar: initials('Henrique Barbosa'),
    nextSession: daysFromNow(3), sessionValue: 200,
    searchReason: 'Bullying escolar e ansiedade', mainComplaint: 'Vítima de bullying, recusa escolar, crises de choro',
    healthHistory: 'Asma na infância, controlada.', medications: 'Nenhuma',
    diagnosticHypothesis: 'Transtorno de Adaptação', cid10: 'F43.2', riskLevel: 'medio',
    therapeuticGoals: [
      { id: 'g15', description: 'Desenvolver habilidades de enfrentamento', completed: false, dateSet: daysAgo(15) },
      { id: 'g16', description: 'Retomar frequência escolar regular', completed: false, dateSet: daysAgo(15) },
    ],
  },
];

const todayStr = formatDate(today);
const dayOfWeek = today.getDay();

export const sessions: Session[] = [
  // Today's sessions
  { id: 's1', patientId: '1', patientName: 'Ana Beatriz Silva', date: todayStr, startTime: '08:00', duration: 50, type: 'presencial', status: 'confirmada', value: 250, paymentStatus: 'pendente' },
  { id: 's2', patientId: '2', patientName: 'Bruno Costa Oliveira', date: todayStr, startTime: '09:00', duration: 50, type: 'online', status: 'confirmada', value: 300, paymentStatus: 'pendente', onlineLink: 'https://meet.google.com/abc-defg-hij' },
  { id: 's3', patientId: '6', patientName: 'Felipe Araújo Lima', date: todayStr, startTime: '10:00', duration: 50, type: 'presencial', status: 'pendente', value: 250, paymentStatus: 'pendente' },
  { id: 's4', patientId: '5', patientName: 'Elisa Nakamura', date: todayStr, startTime: '14:00', duration: 50, type: 'online', status: 'confirmada', value: 220, paymentStatus: 'pendente', onlineLink: 'https://meet.google.com/xyz-uvwx-yz' },
  // This week
  { id: 's5', patientId: '3', patientName: 'Carla Mendes', date: daysFromNow(1), startTime: '09:00', duration: 50, type: 'presencial', status: 'confirmada', value: 200, paymentStatus: 'pendente' },
  { id: 's6', patientId: '8', patientName: 'Henrique Barbosa', date: daysFromNow(3), startTime: '15:00', duration: 50, type: 'presencial', status: 'pendente', value: 200, paymentStatus: 'pendente' },
  { id: 's7', patientId: '1', patientName: 'Ana Beatriz Silva', date: daysFromNow(2), startTime: '08:00', duration: 50, type: 'presencial', status: 'confirmada', value: 250, paymentStatus: 'pendente' },
  // Past sessions (this month)
  { id: 's8', patientId: '1', patientName: 'Ana Beatriz Silva', date: daysAgo(7), startTime: '08:00', duration: 50, type: 'presencial', status: 'realizada', value: 250, paymentStatus: 'pago', paymentMethod: 'PIX', evolutionNote: 'Paciente relatou melhora nas crises de ansiedade. Praticou técnicas de respiração diafragmática com sucesso durante a semana. Mantém dificuldade para dormir.' },
  { id: 's9', patientId: '2', patientName: 'Bruno Costa Oliveira', date: daysAgo(7), startTime: '09:00', duration: 50, type: 'online', status: 'realizada', value: 300, paymentStatus: 'pago', paymentMethod: 'Cartão', evolutionNote: 'Discutimos estratégias de delegação no trabalho. Bruno conseguiu tirar um final de semana sem trabalhar pela primeira vez em meses.' },
  { id: 's10', patientId: '3', patientName: 'Carla Mendes', date: daysAgo(5), startTime: '09:00', duration: 50, type: 'presencial', status: 'realizada', value: 200, paymentStatus: 'pago', paymentMethod: 'PIX', evolutionNote: 'Carla apresentou humor mais estável. Registro de pensamentos mostrou padrões de autossabotagem. Trabalhamos reestruturação cognitiva.' },
  { id: 's11', patientId: '6', patientName: 'Felipe Araújo Lima', date: daysAgo(6), startTime: '10:00', duration: 50, type: 'presencial', status: 'falta', value: 250, paymentStatus: 'pendente' },
  { id: 's12', patientId: '6', patientName: 'Felipe Araújo Lima', date: daysAgo(13), startTime: '10:00', duration: 50, type: 'presencial', status: 'falta', value: 250, paymentStatus: 'pendente' },
  { id: 's13', patientId: '5', patientName: 'Elisa Nakamura', date: daysAgo(3), startTime: '14:00', duration: 50, type: 'online', status: 'realizada', value: 220, paymentStatus: 'pendente', paymentMethod: '', evolutionNote: 'Elisa trouxe avanços no uso do planner. Discutimos técnicas de pomodoro adaptadas ao seu estilo criativo.' },
  { id: 's14', patientId: '8', patientName: 'Henrique Barbosa', date: daysAgo(4), startTime: '15:00', duration: 50, type: 'presencial', status: 'realizada', value: 200, paymentStatus: 'pago', paymentMethod: 'PIX', evolutionNote: 'Henrique relata que voltou a almoçar com colegas na escola. Trabalhamos assertividade com role-play.' },
  { id: 's15', patientId: '1', patientName: 'Ana Beatriz Silva', date: daysAgo(14), startTime: '08:00', duration: 50, type: 'presencial', status: 'realizada', value: 250, paymentStatus: 'pago', paymentMethod: 'PIX', evolutionNote: 'Sessão focada em psicoeducação sobre ansiedade. Aplicação da escala BAI - resultado moderado (22 pontos).' },
  { id: 's16', patientId: '2', patientName: 'Bruno Costa Oliveira', date: daysAgo(14), startTime: '09:00', duration: 50, type: 'online', status: 'realizada', value: 300, paymentStatus: 'pago', paymentMethod: 'Cartão' },
  { id: 's17', patientId: '3', patientName: 'Carla Mendes', date: daysAgo(12), startTime: '09:00', duration: 50, type: 'presencial', status: 'realizada', value: 200, paymentStatus: 'pendente' },
];

export const transactions: Transaction[] = [
  { id: 't1', date: daysAgo(7), patientId: '1', patientName: 'Ana Beatriz Silva', type: 'sessao', value: 250, paymentMethod: 'PIX', status: 'pago' },
  { id: 't2', date: daysAgo(7), patientId: '2', patientName: 'Bruno Costa Oliveira', type: 'sessao', value: 300, paymentMethod: 'Cartão', status: 'pago' },
  { id: 't3', date: daysAgo(5), patientId: '3', patientName: 'Carla Mendes', type: 'sessao', value: 200, paymentMethod: 'PIX', status: 'pago' },
  { id: 't4', date: daysAgo(4), patientId: '8', patientName: 'Henrique Barbosa', type: 'sessao', value: 200, paymentMethod: 'PIX', status: 'pago' },
  { id: 't5', date: daysAgo(14), patientId: '1', patientName: 'Ana Beatriz Silva', type: 'sessao', value: 250, paymentMethod: 'PIX', status: 'pago' },
  { id: 't6', date: daysAgo(14), patientId: '2', patientName: 'Bruno Costa Oliveira', type: 'sessao', value: 300, paymentMethod: 'Cartão', status: 'pago' },
  { id: 't7', date: daysAgo(6), patientId: '6', patientName: 'Felipe Araújo Lima', type: 'sessao', value: 250, paymentMethod: '', status: 'pendente' },
  { id: 't8', date: daysAgo(13), patientId: '6', patientName: 'Felipe Araújo Lima', type: 'sessao', value: 250, paymentMethod: '', status: 'pendente' },
  { id: 't9', date: daysAgo(3), patientId: '5', patientName: 'Elisa Nakamura', type: 'sessao', value: 220, paymentMethod: '', status: 'pendente' },
  { id: 't10', date: daysAgo(12), patientId: '3', patientName: 'Carla Mendes', type: 'sessao', value: 200, paymentMethod: '', status: 'pendente' },
];

export const clinicalAlerts: ClinicalAlert[] = [
  { id: 'a1', patientId: '6', patientName: 'Felipe Araújo Lima', type: 'faltas', message: '2 faltas consecutivas nas últimas sessões' },
  { id: 'a2', patientId: '4', patientName: 'Daniel Ferreira Santos', type: 'evolucao', message: 'Sem evolução registrada há mais de 14 dias' },
  { id: 'a3', patientId: '6', patientName: 'Felipe Araújo Lima', type: 'inadimplencia', message: 'Pagamentos pendentes há mais de 30 dias (R$ 500,00)' },
];

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'ativo': case 'pago': case 'confirmada': case 'realizada': return 'badge-success';
    case 'pendente': case 'em_pausa': return 'badge-warning';
    case 'falta': case 'cancelada': case 'alto': return 'badge-danger';
    case 'encaminhado': case 'online': case 'baixo': return 'badge-info';
    case 'alta': case 'medio': return 'badge-warning';
    default: return 'badge-info';
  }
};

export const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ativo: 'Ativo', em_pausa: 'Em Pausa', alta: 'Alta', encaminhado: 'Encaminhado',
    pago: 'Pago', pendente: 'Pendente', isento: 'Isento',
    confirmada: 'Confirmada', cancelada: 'Cancelada', realizada: 'Realizada', falta: 'Falta',
    presencial: 'Presencial', online: 'Online',
    baixo: 'Baixo', medio: 'Médio', alto: 'Alto',
    sessao: 'Sessão', cancelamento: 'Cancelamento', outro: 'Outro',
  };
  return labels[status] || status;
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDateBR = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};
