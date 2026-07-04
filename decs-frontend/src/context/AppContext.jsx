// src/context/AppContext.jsx  — UPDATED VERSION (connects to real backend)
// Replace your existing AppContext.jsx with this file

import { createContext, useContext, useState, useCallback } from 'react';
import { authAPI, evidenceAPI, usersAPI, reportsAPI, auditAPI, teamsAPI, setToken, clearToken } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── AUTH ───────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      setToken(data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    clearToken();
    setCurrentUser(null);
  }, []);

  // ── EVIDENCE ───────────────────────────────────────────────────────────
  const getEvidence = useCallback(async (params = {}) => {
    const data = await evidenceAPI.list(params);
    return data; // { evidence, total, pages }
  }, []);

  const getEvidenceById = useCallback(async (id) => {
    const data = await evidenceAPI.getById(id);
    return data; // { evidence, custodyLogs, integrityLogs }
  }, []);

  const uploadEvidence = useCallback(async (formFields, file) => {
    // Build FormData for multipart upload
    const formData = new FormData();
    formData.append('files', file);
    formData.append('name', formFields.name);
    formData.append('description', formFields.description || '');
    formData.append('caseId', formFields.caseId);
    formData.append('acquisitionDate', formFields.acquisitionDate);
    formData.append('fileType', formFields.fileType);

    const data = await evidenceAPI.upload(formData);
    return data;
  }, []);

  const transferCustody = useCallback(async (evidenceId, toUserId, reason) => {
    const data = await evidenceAPI.transfer(evidenceId, toUserId, reason);
    return data;
  }, []);

  const verifyIntegrity = useCallback(async (evidenceId) => {
    const data = await evidenceAPI.verify(evidenceId);
    return data;
  }, []);

  const batchVerify = useCallback(async (evidenceIds) => {
    const data = await evidenceAPI.batchVerify(evidenceIds);
    return data;
  }, []);

  // ── USERS ──────────────────────────────────────────────────────────────
  const getUsers = useCallback(async (params = {}) => {
    const data = await usersAPI.list(params);
    return data;
  }, []);

  const createUser = useCallback(async (userData) => {
    const data = await usersAPI.create(userData);
    return data;
  }, []);

  const updateUser = useCallback(async (id, updates) => {
    const data = await usersAPI.update(id, updates);
    return data;
  }, []);

  const deleteUser = useCallback(async (id) => {
    const data = await usersAPI.delete(id);
    return data;
  }, []);

  const unlockUser = useCallback(async (id) => {
    const data = await usersAPI.unlock(id);
    return data;
  }, []);

  // ── REPORTS ────────────────────────────────────────────────────────────
  const generateReport = useCallback(async (params) => {
    const blob = await reportsAPI.generate(params);
    // Auto-trigger browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic_report_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  }, []);

  // ── AUDIT ──────────────────────────────────────────────────────────────
  const getAuditLogs = useCallback(async (params = {}) => {
    const data = await auditAPI.list(params);
    return data;
  }, []);

  // ── TEAMS ──────────────────────────────────────────────────────────────
  const getTeams = useCallback(async (params = {}) => {
    const data = await teamsAPI.list(params);
    return data;
  }, []);

  const getTeamById = useCallback(async (id) => {
    const data = await teamsAPI.getById(id);
    return data;
  }, []);

  const createTeam = useCallback(async (teamData) => {
    const data = await teamsAPI.create(teamData);
    return data;
  }, []);

  const updateTeam = useCallback(async (id, updates) => {
    const data = await teamsAPI.update(id, updates);
    return data;
  }, []);

  const deleteTeam = useCallback(async (id) => {
    const data = await teamsAPI.delete(id);
    return data;
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser,
      loading,
      login,
      logout,
      getEvidence,
      getEvidenceById,
      uploadEvidence,
      transferCustody,
      verifyIntegrity,
      batchVerify,
      getUsers,
      createUser,
      updateUser,
      deleteUser,
      unlockUser,
      generateReport,
      getAuditLogs,
      getTeams,
      getTeamById,
      createTeam,
      updateTeam,
      deleteTeam,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
