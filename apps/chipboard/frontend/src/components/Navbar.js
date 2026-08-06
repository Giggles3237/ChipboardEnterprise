import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const NavbarComponent = ({ isDarkMode, onToggleTheme }) => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [contestAvailability, setContestAvailability] = useState({ enabled: false, name: 'Mission 250' });
  const canViewDisabledContest = auth?.user?.role === 'Admin';

  const fetchContestAvailability = useCallback(async () => {
    if (!auth?.token) {
      setContestAvailability({ enabled: false, name: 'Mission 250' });
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/contests/status`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setContestAvailability(response.data);
    } catch (error) {
      console.error('Unable to load contest availability:', error);
      setContestAvailability({ enabled: false, name: 'Mission 250' });
    }
  }, [auth?.token]);

  useEffect(() => {
    fetchContestAvailability();
    window.addEventListener('contest-availability-changed', fetchContestAvailability);
    return () => window.removeEventListener('contest-availability-changed', fetchContestAvailability);
  }, [fetchContestAvailability]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="light" expand="lg" className="mb-3">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <img
            src="/assets/images/logo.png?v=1"
            alt="BOP Chips Logo"
            className="navbar-logo"
          />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {auth?.user && <Nav.Link as={Link} to="/">Home</Nav.Link>}
            {auth?.user && (contestAvailability.enabled || canViewDisabledContest) && (
              <Nav.Link as={Link} to="/mission-250">{contestAvailability.name || 'Mission 250'}</Nav.Link>
            )}
            {auth?.user && <Nav.Link as={Link} to="/loaners">Loaners</Nav.Link>}
            {auth?.user?.role === 'Admin' && (
              <Nav.Link as={Link} to="/admin">Admin</Nav.Link>
            )}
            {auth?.user?.role === 'Admin' && (
              <Nav.Link as={Link} to="/tv">TV</Nav.Link>
            )}
          </Nav>
          <Nav>
            <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />
            {!auth?.user ? (
              <>
                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                <Nav.Link as={Link} to="/register">Register</Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/change-password">Change Password</Nav.Link>
                <Navbar.Text className="me-3">
                  Logged in as: {auth.user.email} ({auth.user.role})
                </Navbar.Text>
                <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavbarComponent; 
