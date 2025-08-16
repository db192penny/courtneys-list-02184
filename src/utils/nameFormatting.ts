export const formatNameWithLastInitial = (fullName: string): string => {
  if (!fullName || !fullName.trim()) return "Neighbor";
  
  const parts = fullName.trim().split(" ");
  if (parts.length === 0) return "Neighbor";
  
  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : "";
  
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
};