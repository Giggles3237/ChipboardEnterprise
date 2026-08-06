export const canEditSale = (sale, user) => {
  if (!user || !sale) return false;
  return sale.advisor === user.name;
}; 