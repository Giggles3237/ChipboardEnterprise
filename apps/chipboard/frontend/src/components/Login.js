import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import './Login.css';
import { API_BASE_URL } from '../config';

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    console.log('Attempting login with URL:', `${API_BASE_URL}/auth/login`);
    console.log('Credentials:', { email: credentials.email, password: '***' });
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      console.log('Login response:', response.data);
      
      if (response.data.token && response.data.user) {
        console.log('Login successful, user:', response.data.user);
        login({
          token: response.data.token,
          user: response.data.user
        });
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input 
              type="email" 
              value={credentials.email} 
              onChange={(e) => setCredentials(prev => ({...prev, email: e.target.value}))} 
              disabled={isLoading}
              required 
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input 
              type="password" 
              value={credentials.password} 
              onChange={(e) => setCredentials(prev => ({...prev, password: e.target.value}))} 
              disabled={isLoading}
              required 
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;