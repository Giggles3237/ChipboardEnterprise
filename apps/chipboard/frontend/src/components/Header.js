import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { AuthContext } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import './Header.css';

function Header({ isDarkMode, onToggleTheme }) {
  const { auth, logout } = useContext(AuthContext);
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
            className="header-logo"
          />
          BOP Chipboard
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {auth?.user && <Nav.Link as={Link} to="/">Home</Nav.Link>}
            {auth?.user?.role === 'Admin' && (
              <Nav.Link as={Link} to="/admin">Admin Dashboard</Nav.Link>
            )}
            {(auth?.user?.role === 'Admin' || auth?.user?.role === 'Manager') && (
              <Nav.Link as={Link} to="/manager">Manager Dashboard</Nav.Link>
            )}
            {auth?.user?.role === 'Salesperson' && (
              <Nav.Link as={Link} to="/salesperson">Sales Dashboard</Nav.Link>
            )}
          </Nav>
          <Nav>
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
                <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
