import { useEffect, useState } from 'react';

interface SessionInfo {
  isRestoredSession: boolean;
  lastLoginTime: string | null;
  sessionDuration: number | null;
}

export function useSessionPersistence(): SessionInfo {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    isRestoredSession: false,
    lastLoginTime: null,
    sessionDuration: null,
  });

  useEffect(() => {
    try {
      const lastLoginTime = localStorage.getItem('userLoginTime');
      const lastActiveTime = localStorage.getItem('userLastActive');
      
      if (lastLoginTime) {
        const loginTime = new Date(lastLoginTime);
        const now = new Date();
        const duration = now.getTime() - loginTime.getTime();
        
        // Consider it a restored session if last login was more than 5 minutes ago
        const isRestored = duration > 5 * 60 * 1000;
        
        setSessionInfo({
          isRestoredSession: isRestored,
          lastLoginTime,
          sessionDuration: duration,
        });
      }
    } catch (error) {
      console.warn('Error reading session info from localStorage:', error);
    }
  }, []);

  return sessionInfo;
}

export function clearSessionInfo(): void {
  try {
    localStorage.removeItem('userLoginTime');
    localStorage.removeItem('userLastActive');
    localStorage.removeItem('userRole');
  } catch (error) {
    console.warn('Error clearing session info from localStorage:', error);
  }
}

export function updateLastActive(): void {
  try {
    localStorage.setItem('userLastActive', new Date().toISOString());
  } catch (error) {
    console.warn('Error updating last active time:', error);
  }
}