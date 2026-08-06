import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      const parsedAuth = JSON.parse(savedAuth);
      // Check if token is expired
      if (parsedAuth.token) {
        const tokenData = JSON.parse(atob(parsedAuth.token.split('.')[1]));
        if (tokenData.exp * 1000 < Date.now()) {
          localStorage.removeItem('auth');
          return { user: null, token: null };
        }
      }
      return parsedAuth;
    }
    return { user: null, token: null };
  });

  useEffect(() => {
    // Set up axios interceptor for auth headers
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (auth?.token) {
          config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      // Clean up interceptor on unmount
      axios.interceptors.request.eject(interceptor);
    };
  }, [auth]);

  useEffect(() => {
    if (auth?.token) {
      localStorage.setItem('auth', JSON.stringify(auth));
      
      // Set up token refresh check
      const tokenData = JSON.parse(atob(auth.token.split('.')[1]));
      const expiresIn = tokenData.exp * 1000 - Date.now();
      
      // If token is valid but close to expiring (less than 1 hour), refresh it
      if (expiresIn > 0 && expiresIn < 3600000) {
        // Implement token refresh logic here if your backend supports it
        console.log('Token will expire soon, consider implementing refresh logic');
      }
    } else {
      localStorage.removeItem('auth');
    }
  }, [auth]);

  const login = (authData) => {
    setAuth(authData);
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};