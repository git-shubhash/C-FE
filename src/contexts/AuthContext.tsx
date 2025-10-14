import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  username: string;
  role: 'pharmacy' | 'laboratory' | 'radiology';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: User['role']) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Check localStorage for existing user session
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = (username: string, password: string, role: User['role']): boolean => {
    // Hardcoded authentication
    if (username === 'admin' && password === 'password123') {
      const userData = { username, role };
      setUser(userData);
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    // Clear user session and any stored tab state
    localStorage.removeItem('user');
    localStorage.removeItem('pharmaActiveTab');
    localStorage.removeItem('labActiveTab');
    localStorage.removeItem('radiologyActiveTab');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};