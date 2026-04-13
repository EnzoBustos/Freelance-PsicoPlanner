import { supabase } from '@/integrations/client';
import type { 
  Patient, 
  Session, 
  Transaction, 
  ClinicalAlert 
} from '@/data/mockData';

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

  return (data || []).map((session: any) => ({
    id: session.id,
    patientId: session.patient_id,
    patientName: session.patient_name,
    date: session.date,
    startTime: session.start_time,
    duration: session.duration,
    type: session.type,
    status: session.status,
    value: session.value,
    paymentStatus: session.payment_status,
    paymentMethod: session.payment_method,
    onlineLink: session.online_link,
    observations: session.observations,
    evolutionNote: session.evolution_note,
  }));
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
  const { data, error } = await supabase
    .from('patients')
    .insert([
      {
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

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
};
