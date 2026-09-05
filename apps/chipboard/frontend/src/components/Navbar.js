import React from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const NavbarComponent = ({ isDarkMode, onToggleTheme }) => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

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
