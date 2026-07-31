import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tokenService } from '../services/tokenService';

interface UserProfile {
  id?: number;
  name: string;
  email: string;
  role: string;
  role_id?: number | null;
  employee_code?: string | null;
  avatar_url?: string | null;
  full_name?: string;
  job_title?: string | null;
}


interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  login: (token: string, refreshToken: string, userProfile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUserState] = React.useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = tokenService.getAccessToken();

      if (savedUser && token) {
        return JSON.parse(savedUser);
      }
      tokenService.clear();
      localStorage.removeItem('user');
      return null;
    } catch {
      tokenService.clear();
      localStorage.removeItem('user');
      return null;
    }
  });

  const setUser = React.useCallback((newUser: UserProfile | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const isAuthenticated = Boolean(user && tokenService.getAccessToken());

  const login = (token: string, refreshToken: string, userProfile: UserProfile) => {
    queryClient.clear();
    tokenService.setTokens(token, refreshToken);
    setUser(userProfile);
  };

  const logout = React.useCallback(() => {
    queryClient.clear();
    tokenService.clear();
    setUser(null);
  }, [queryClient, setUser]);

  React.useEffect(() => {
    const handleSessionExpired = () => {
      logout();
    };
    window.addEventListener('tasksync:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('tasksync:session-expired', handleSessionExpired);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
