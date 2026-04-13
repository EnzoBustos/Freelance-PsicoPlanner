import { supabase } from '@/integrations/client';
import type { 
  Patient, 
  Session, 
  Transaction, 
  ClinicalAlert 
} from '@/data/mockData';

type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly';

type AgendaSessionInput = {
  patientId: string;
  patientName: string;
  date: string;
  startTime: string;
  duration: number;
  type: 'presencial' | 'online';
  status: 'confirmada' | 'pendente' | 'cancelada' | 'realizada' | 'falta';
  value: number;
};

type AgendaRecurrenceInput = {
  pattern: RecurrencePattern;
  count: number;
};

const addMonthsClamped = (date: Date, months: number) => {
  const next = new Date(date);
  const dayOfMonth = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, daysInTargetMonth));
  return next;
};

const buildRecurrenceDates = (startDate: string, recurrence: AgendaRecurrenceInput) => {
  const baseDate = new Date(`${startDate}T00:00:00`);

  return Array.from({ length: recurrence.count }, (_, index) => {
    if (index === 0) return startDate;

    if (recurrence.pattern === 'monthly') {
      return addMonthsClamped(baseDate, index).toISOString().split('T')[0];
    }

    const stepDays = recurrence.pattern === 'weekly' ? 7 : 14;
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + index * stepDays);
    return nextDate.toISOString().split('T')[0];
  });
};

const mapSessionRecord = (session: any, recurrencePattern?: RecurrencePattern, recurrenceIndex?: number): Session => ({
  id: session.id,
  patientId: session.patient_id,
  patientName: session.patient_name,
  date: session.date,
  startTime: String(session.start_time || '').slice(0, 5),
  duration: session.duration,
  type: session.type,
  status: session.status,
  value: session.value,
  paymentStatus: session.payment_status,
  paymentMethod: session.payment_method,
  onlineLink: session.online_link,
  observations: session.observations,
  evolutionNote: session.evolution_note,
  recurrencePattern: session.recurrence_pattern ?? recurrencePattern,
  recurrenceIndex:
    typeof session.recurrence_index === 'number' ? session.recurrence_index : recurrenceIndex,
});

/**
 * Fetch all patients for the logged-in psychologist
 */
export const fetchPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }

  // Transform database format to app format
  return (data || []).map((patient: any) => ({
    id: patient.id,
    name: patient.name,
    birthDate: patient.birth_date,
    age: patient.age,
    cpf: patient.cpf,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    emergencyContact: patient.emergency_contact,
    legalGuardian: patient.legal_guardian,
    healthPlan: patient.health_plan,
    cardNumber: patient.card_number,
    notes: patient.notes,
    status: patient.status,
    avatar: patient.avatar,
    nextSession: patient.next_session,
    sessionValue: patient.session_value,
    searchReason: patient.search_reason,
    mainComplaint: patient.main_complaint,
    healthHistory: patient.health_history,
    medications: patient.medications,
    diagnosticHypothesis: patient.diagnostic_hypothesis,
    cid10: patient.cid10,
    riskLevel: patient.risk_level,
    therapeuticGoals: [],
  }));
};

/**
 * Fetch a single patient with therapeutic goals
 */
export const fetchPatientWithGoals = async (patientId: string): Promise<Patient | null> => {
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (patientError) {
    console.error('Error fetching patient:', patientError);
    throw patientError;
  }

  // Fetch therapeutic goals
  const { data: goals, error: goalsError } = await supabase
    .from('therapeutic_goals')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_set', { ascending: false });

  if (goalsError) {
    console.error('Error fetching goals:', goalsError);
  }

  return {
    id: patient.id,
    name: patient.name,
    birthDate: patient.birth_date,
    age: patient.age,
    cpf: patient.cpf,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    emergencyContact: patient.emergency_contact,
    legalGuardian: patient.legal_guardian,
    healthPlan: patient.health_plan,
    cardNumber: patient.card_number,
    notes: patient.notes,
    status: patient.status,
    avatar: patient.avatar,
    nextSession: patient.next_session,
    sessionValue: patient.session_value,
    searchReason: patient.search_reason,
    mainComplaint: patient.main_complaint,
    healthHistory: patient.health_history,
    medications: patient.medications,
    diagnosticHypothesis: patient.diagnostic_hypothesis,
    cid10: patient.cid10,
    riskLevel: patient.risk_level,
    therapeuticGoals: (goals || []).map((g: any) => ({
      id: g.id,
      description: g.description,
      completed: g.completed,
      dateSet: g.date_set,
    })),
  };
};

/**
 * Fetch all sessions for the logged-in psychologist
 */
export const fetchSessions = async (): Promise<Session[]> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }

  return (data || []).map((session: any) => mapSessionRecord(session));
};

/**
 * Create one or more sessions from Agenda and associate them with a patient
 */
export const createAgendaSessions = async (
  input: AgendaSessionInput & {
    recurrence?: AgendaRecurrenceInput;
  }
): Promise<Session[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const recurrenceDates = input.recurrence
    ? buildRecurrenceDates(input.date, input.recurrence)
    : [input.date];

  const sessionsPayload = recurrenceDates.map((date, index) => ({
    psychologist_id: user.id,
    patient_id: input.patientId,
    patient_name: input.patientName,
    date,
    start_time: input.startTime,
    duration: input.duration,
    type: input.type,
    status: input.status,
    value: input.value,
    payment_status: 'pendente',
    recurrence_pattern: input.recurrence?.pattern ?? null,
    recurrence_index: input.recurrence ? index : null,
  }));

  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionsPayload)
    .select();

  if (error) {
    console.error('Error creating agenda session:', error);
    throw error;
  }

  return (data || []).map((session: any, index: number) =>
    mapSessionRecord(session, input.recurrence?.pattern, input.recurrence ? index : undefined)
  );
};

export const createAgendaSession = async (input: AgendaSessionInput) => {
  const sessions = await createAgendaSessions(input);
  return sessions[0];
};

/**
 * Update a session fields (status, date, time, etc)
 */
export const updateAgendaSession = async (
  sessionId: string,
  updates: {
    date?: string;
    startTime?: string;
    status?: 'confirmada' | 'pendente' | 'cancelada' | 'realizada' | 'falta';
  }
) => {
  const payload: Record<string, any> = {};

  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.startTime !== undefined) payload.start_time = updates.startTime;
  if (updates.status !== undefined) payload.status = updates.status;

  const { data, error } = await supabase
    .from('sessions')
    .update(payload)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating agenda session:', error);
    throw error;
  }

  return mapSessionRecord(data);
};

/**
 * Delete a session from agenda
 */
export const deleteAgendaSession = async (sessionId: string) => {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting agenda session:', error);
    throw error;
  }
};

/**
 * Fetch all transactions for the logged-in psychologist
 */
export const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }

  return (data || []).map((transaction: any) => ({
    id: transaction.id,
    date: transaction.date,
    patientId: transaction.patient_id,
    patientName: transaction.patient_name,
    type: transaction.type,
    value: transaction.value,
    paymentMethod: transaction.payment_method,
    status: transaction.status,
  }));
};

/**
 * Fetch all clinical alerts for the logged-in psychologist
 */
export const fetchClinicalAlerts = async (): Promise<ClinicalAlert[]> => {
  const { data, error } = await supabase
    .from('clinical_alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }

  return (data || []).map((alert: any) => ({
    id: alert.id,
    patientId: alert.patient_id,
    patientName: alert.patient_name,
    type: alert.type,
    message: alert.message,
  }));
};

/**
 * Create a new patient
 */
export const createPatient = async (patient: Omit<Patient, 'id'>) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('patients')
    .insert([
      {
        psychologist_id: user.id,
        name: patient.name,
        birth_date: patient.birthDate,
        age: patient.age,
        cpf: patient.cpf,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        emergency_contact: patient.emergencyContact,
        legal_guardian: patient.legalGuardian,
        health_plan: patient.healthPlan,
        card_number: patient.cardNumber,
        notes: patient.notes,
        status: patient.status,
        avatar: patient.avatar,
        next_session: patient.nextSession,
        session_value: patient.sessionValue,
        search_reason: patient.searchReason,
        main_complaint: patient.mainComplaint,
        health_history: patient.healthHistory,
        medications: patient.medications,
        diagnostic_hypothesis: patient.diagnosticHypothesis,
        cid10: patient.cid10,
        risk_level: patient.riskLevel,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating patient:', error);
    throw error;
  }

  return data;
};

/**
 * Update a session evolution note
 */
export const updateSessionEvolution = async (sessionId: string, evolutionNote: string) => {
  const { error } = await supabase
    .from('sessions')
    .update({ evolution_note: evolutionNote })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session evolution:', error);
    throw error;
  }
};

/**
 * Create a new evolution entry for a patient
 */
export const createPatientEvolution = async (input: {
  patientId: string;
  patientName: string;
  date: string;
  evolutionNote: string;
  value?: number;
}) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const now = new Date();
  const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('sessions')
    .insert([
      {
        psychologist_id: user.id,
        patient_id: input.patientId,
        patient_name: input.patientName,
        date: input.date,
        start_time: startTime,
        duration: 50,
        type: 'presencial',
        status: 'realizada',
        value: input.value ?? 0,
        payment_status: 'isento',
        evolution_note: input.evolutionNote,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating patient evolution:', error);
    throw error;
  }

  return {
    id: data.id,
    patientId: data.patient_id,
    patientName: data.patient_name,
    date: data.date,
    startTime: data.start_time,
    duration: data.duration,
    type: data.type,
    status: data.status,
    value: data.value,
    paymentStatus: data.payment_status,
    paymentMethod: data.payment_method,
    onlineLink: data.online_link,
    observations: data.observations,
    evolutionNote: data.evolution_note,
  } as Session;
};

/**
 * Create a financial session and matching transaction for a patient
 */
export const createPatientFinancialSession = async (input: {
  patientId: string;
  patientName: string;
  date: string;
  value: number;
  paymentMethod?: string;
  paymentStatus: 'pago' | 'pendente';
}) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const normalizedPaymentMethod =
    input.paymentStatus === 'pendente' ? null : input.paymentMethod || null;

  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .insert([
      {
        psychologist_id: user.id,
        patient_id: input.patientId,
        patient_name: input.patientName,
        date: input.date,
        start_time: '09:00',
        duration: 50,
        type: 'presencial',
        status: 'realizada',
        value: input.value,
        payment_status: input.paymentStatus,
        payment_method: normalizedPaymentMethod,
      },
    ])
    .select()
    .single();

  if (sessionError) {
    console.error('Error creating financial session:', sessionError);
    throw sessionError;
  }

  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .insert([
      {
        psychologist_id: user.id,
        patient_id: input.patientId,
        patient_name: input.patientName,
        date: input.date,
        type: 'sessao',
        value: input.value,
        payment_method: normalizedPaymentMethod,
        status: input.paymentStatus,
      },
    ])
    .select()
    .single();

  if (transactionError) {
    console.error('Error creating transaction for session:', transactionError);
    throw transactionError;
  }

  return {
    session: {
      id: sessionData.id,
      patientId: sessionData.patient_id,
      patientName: sessionData.patient_name,
      date: sessionData.date,
      startTime: String(sessionData.start_time || '').slice(0, 5),
      duration: sessionData.duration,
      type: sessionData.type,
      status: sessionData.status,
      value: sessionData.value,
      paymentStatus: sessionData.payment_status,
      paymentMethod: sessionData.payment_method,
      onlineLink: sessionData.online_link,
      observations: sessionData.observations,
      evolutionNote: sessionData.evolution_note,
    } as Session,
    transaction: {
      id: transactionData.id,
      date: transactionData.date,
      patientId: transactionData.patient_id,
      patientName: transactionData.patient_name,
      type: transactionData.type,
      value: transactionData.value,
      paymentMethod: transactionData.payment_method,
      status: transactionData.status,
    } as Transaction,
  };
};

/**
 * Register a payment for a pending transaction
 */
export const registerTransactionPayment = async (
  transactionId: string,
  paymentMethod: string
) => {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'pago',
      payment_method: paymentMethod || null,
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    console.error('Error registering transaction payment:', error);
    throw error;
  }

  return {
    id: data.id,
    date: data.date,
    patientId: data.patient_id,
    patientName: data.patient_name,
    type: data.type,
    value: data.value,
    paymentMethod: data.payment_method,
    status: data.status,
  } as Transaction;
};

/**
 * Update an existing patient
 */
export const updatePatient = async (patientId: string, updates: Partial<Patient>) => {
  const { data, error } = await supabase
    .from('patients')
    .update({
      name: updates.name,
      birth_date: updates.birthDate,
      age: updates.age,
      cpf: updates.cpf,
      phone: updates.phone,
      email: updates.email,
      address: updates.address,
      emergency_contact: updates.emergencyContact,
      legal_guardian: updates.legalGuardian,
      health_plan: updates.healthPlan,
      card_number: updates.cardNumber,
      notes: updates.notes,
      status: updates.status,
      avatar: updates.avatar,
      next_session: updates.nextSession,
      session_value: updates.sessionValue,
      search_reason: updates.searchReason,
      main_complaint: updates.mainComplaint,
      health_history: updates.healthHistory,
      medications: updates.medications,
      diagnostic_hypothesis: updates.diagnosticHypothesis,
      cid10: updates.cid10,
      risk_level: updates.riskLevel,
    })
    .eq('id', patientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a patient
 */
export const deletePatient = async (patientId: string) => {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId);

  if (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
};

/**
 * Fetch psychologist profile
 */
export const fetchPsychologistProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
};

/**
 * Update psychologist profile
 */
export const updatePsychologistProfile = async (updates: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

/**
 * Fetch schedule preferences for the logged-in psychologist
 */
export const fetchSchedulePreferences = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('schedule_preferences')
    .select('*')
    .eq('psychologist_id', user.id)
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('Error fetching schedule preferences:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    dayOfWeek: item.day_of_week,
    dayName: item.day_name,
    isActive: item.is_active,
    startTime: item.start_time,
    endTime: item.end_time,
  }));
};

/**
 * Update a single day schedule preference
 */
export const updateSchedulePreference = async (scheduleId: string, updates: {
  isActive: boolean;
  startTime?: string | null;
  endTime?: string | null;
}) => {
  const { error } = await supabase
    .from('schedule_preferences')
    .update({
      is_active: updates.isActive,
      start_time: updates.startTime,
      end_time: updates.endTime,
    })
    .eq('id', scheduleId);

  if (error) {
    console.error('Error updating schedule preference:', error);
    throw error;
  }
};

/**
 * Update notification preferences for the logged-in psychologist
 */
export const updateNotificationPreferences = async (preferences: {
  notification_session_reminder: boolean;
  notification_patient_absences: boolean;
  notification_pending_payment: boolean;
  notification_missing_evolution: boolean;
}) => {
  const { error } = await supabase
    .from('profiles')
    .update(preferences)
    .eq('id', (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

export interface PatientDocumentItem {
  name: string;
  path: string;
  createdAt: string | null;
  size: number | null;
}

const PATIENT_DOCUMENTS_BUCKET = 'patient-documents';

/**
 * List patient documents from Supabase Storage
 */
export const fetchPatientDocuments = async (patientId: string): Promise<PatientDocumentItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const folder = `${user.id}/${patientId}`;
  const { data, error } = await supabase
    .storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('Error listing patient documents:', error);
    throw error;
  }

  return (data || [])
    .filter((item: any) => item.name)
    .map((item: any) => ({
      name: item.name,
      path: `${folder}/${item.name}`,
      createdAt: item.created_at ?? null,
      size: item.metadata?.size ?? null,
    }));
};

/**
 * Upload a document for a patient to Supabase Storage
 */
export const uploadPatientDocument = async (patientId: string, file: File) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const sanitizedName = file.name.replace(/\s+/g, '_');
  const fileName = `${Date.now()}_${sanitizedName}`;
  const filePath = `${user.id}/${patientId}/${fileName}`;

  const { error } = await supabase
    .storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading patient document:', error);
    throw error;
  }

  return filePath;
};

/**
 * Get signed download URL for a patient document
 */
export const getPatientDocumentDownloadUrl = async (filePath: string) => {
  const { data, error } = await supabase
    .storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 60);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }

  return data.signedUrl;
};

/**
 * Change password for the logged-in user
 */
export const changePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};
