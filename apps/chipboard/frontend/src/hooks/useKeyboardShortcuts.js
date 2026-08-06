import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = ({ 
  setSearchTerm, 
  setIsEditFormOpen, 
  setEditingSale 
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + / to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        document.querySelector('input[type="text"]')?.focus();
      }

      // Escape to close modals/forms
      if (e.key === 'Escape') {
        setIsEditFormOpen(false);
        setEditingSale(null);
      }

      // Ctrl/Cmd + H to go home
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        navigate('/');
      }

      // Ctrl/Cmd + N for new sale
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/add-sale');
      }

      // Ctrl/Cmd + L to clear search
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, setSearchTerm, setIsEditFormOpen, setEditingSale]);
};
