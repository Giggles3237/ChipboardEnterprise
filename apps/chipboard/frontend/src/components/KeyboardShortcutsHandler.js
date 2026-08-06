import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const KeyboardShortcutsHandler = ({ setSearchTerm, setIsEditFormOpen, setEditingSale }) => {
  useKeyboardShortcuts({
    setSearchTerm,
    setIsEditFormOpen,
    setEditingSale
  });
  
  return null;
};

export default KeyboardShortcutsHandler;
