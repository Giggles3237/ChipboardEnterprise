// Helper to create a temporary ID for optimistic updates
export const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to revert optimistic updates if they fail
export const revertOptimisticUpdate = (prevState, currentState, failedUpdate) => {
  return prevState.map(item => 
    item.id === failedUpdate.id ? prevState.find(p => p.id === failedUpdate.id) : item
  );
};

// Helper to find and replace temporary IDs with real ones
export const replaceTempId = (items, tempId, realItem) => {
  return items.map(item => 
    item.id === tempId ? { ...item, ...realItem } : item
  );
};
