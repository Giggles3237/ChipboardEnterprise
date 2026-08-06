export const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) ? date : null;
}; 