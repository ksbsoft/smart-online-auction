import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

const ADMIN_TOKEN_KEY = 'token';
const ADMIN_USER_KEY = 'user';
const BIDDER_TOKEN_KEY = 'bidder_token';
const BIDDER_USER_KEY = 'bidder_user';

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [bidderUser, setBidderUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const savedAdminUser = localStorage.getItem(ADMIN_USER_KEY);
    if (adminToken && savedAdminUser) {
      try {
        setAdminUser(JSON.parse(savedAdminUser));
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
      }
    }

    const bidderToken = localStorage.getItem(BIDDER_TOKEN_KEY);
    const savedBidderUser = localStorage.getItem(BIDDER_USER_KEY);
    if (bidderToken && savedBidderUser) {
      try {
        setBidderUser(JSON.parse(savedBidderUser));
      } catch {
        localStorage.removeItem(BIDDER_TOKEN_KEY);
        localStorage.removeItem(BIDDER_USER_KEY);
      }
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
    setAdminUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setAdminUser(null);
  };

  const registerBidder = async (fullName, email, password) => {
    const { data } = await api.post('/auth/user/register', { fullName, email, password });
    localStorage.setItem(BIDDER_TOKEN_KEY, data.token);
    localStorage.setItem(BIDDER_USER_KEY, JSON.stringify(data.user));
    setBidderUser(data.user);
    return data;
  };

  const loginBidder = async (email, password) => {
    const { data } = await api.post('/auth/user/login', { email, password });
    localStorage.setItem(BIDDER_TOKEN_KEY, data.token);
    localStorage.setItem(BIDDER_USER_KEY, JSON.stringify(data.user));
    setBidderUser(data.user);
    return data;
  };

  const logoutBidder = () => {
    localStorage.removeItem(BIDDER_TOKEN_KEY);
    localStorage.removeItem(BIDDER_USER_KEY);
    setBidderUser(null);
  };

  const requestBidderPasswordReset = async (email) => {
    const { data } = await api.post('/auth/user/forgot-password', { email });
    return data;
  };

  const resetBidderPassword = async (token, password) => {
    const { data } = await api.post('/auth/user/reset-password', { token, password });
    return data;
  };

  const isAuthenticated = !!adminUser;
  const isBidderAuthenticated = !!bidderUser;
  const bidderToken = localStorage.getItem(BIDDER_TOKEN_KEY);

  return (
    <AuthContext.Provider
      value={{
        user: adminUser,
        adminUser,
        bidderUser,
        login,
        logout,
        registerBidder,
        loginBidder,
        logoutBidder,
        requestBidderPasswordReset,
        resetBidderPassword,
        isAuthenticated,
        isBidderAuthenticated,
        bidderToken,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
