import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('zentara_token');
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('zentara_token');
          localStorage.removeItem('zentara_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Auto logout เมื่อ token หมดอายุ (event จาก api.js)
    const handleAutoLogout = () => setUser(null);
    window.addEventListener('zentara_logout', handleAutoLogout);

    // Refresh user after profile update (event จาก MemberPage)
    const handleProfileUpdated = () => {
      authApi.me().then(setUser).catch(() => {});
    };
    window.addEventListener('zentara_profile_updated', handleProfileUpdated);

    return () => {
      window.removeEventListener('zentara_logout', handleAutoLogout);
      window.removeEventListener('zentara_profile_updated', handleProfileUpdated);
    };
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('zentara_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (fields) => {
    await authApi.register(fields);
  };

  const logout = () => {
    localStorage.removeItem('zentara_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
