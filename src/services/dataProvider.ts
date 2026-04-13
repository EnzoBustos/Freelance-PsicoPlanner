/**
 * Data Provider - Usa dados do Supabase, com fallback para mock data
 * Este arquivo centraliza a lógica de busca de dados
 */

import {
  fetchSessions as fetchSessionsReal,
  fetchPatients as fetchPatientsReal,
  fetchTransactions as fetchTransactionsReal,
  fetchClinicalAlerts as fetchClinicalAlertsReal,
} from './supabaseQueries';

import {
  sessions as mockSessions,
  patients as mockPatients,
  transactions as mockTransactions,
  clinicalAlerts as mockClinicalAlerts,
} from '@/data/mockData';

/**
 * Fetch sessions - tenta Supabase primeiro, fallback para mock
 */
export const fetchSessionsData = async () => {
  try {
    const data = await fetchSessionsReal();
    return data && data.length > 0 ? data : mockSessions;
  } catch (error) {
    console.warn('Usando mock sessions (erro ao carregar do Supabase):', error);
    return mockSessions;
  }
};

/**
 * Fetch patients - tenta Supabase primeiro, fallback para mock
 */
export const fetchPatientsData = async () => {
  try {
    const data = await fetchPatientsReal();
    return data && data.length > 0 ? data : mockPatients;
  } catch (error) {
    console.warn('Usando mock patients (erro ao carregar do Supabase):', error);
    return mockPatients;
  }
};

/**
 * Fetch transactions - tenta Supabase primeiro, fallback para mock
 */
export const fetchTransactionsData = async () => {
  try {
    const data = await fetchTransactionsReal();
    return data && data.length > 0 ? data : mockTransactions;
  } catch (error) {
    console.warn('Usando mock transactions (erro ao carregar do Supabase):', error);
    return mockTransactions;
  }
};

/**
 * Fetch clinical alerts - tenta Supabase primeiro, fallback para mock
 */
export const fetchClinicalAlertsData = async () => {
  try {
    const data = await fetchClinicalAlertsReal();
    return data && data.length > 0 ? data : mockClinicalAlerts;
  } catch (error) {
    console.warn('Usando mock alerts (erro ao carregar do Supabase):', error);
    return mockClinicalAlerts;
  }
};

/**
 * Fetch todos os dados juntos (otimizado com Promise.all)
 */
export const fetchAllData = async () => {
  const [sessions, patients, transactions, alerts] = await Promise.all([
    fetchSessionsData(),
    fetchPatientsData(),
    fetchTransactionsData(),
    fetchClinicalAlertsData(),
  ]);

  return { sessions, patients, transactions, alerts };
};
