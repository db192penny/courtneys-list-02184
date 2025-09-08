export const formatAuthorLabel = (label: string | null | undefined): string => {
  if (!label) return 'Neighbor';
  
  // Handle pipe-separated format: "Name|Street" or "Neighbor|Street"
  const parts = String(label).split('|');
  if (parts.length !== 2) return label; // Return as-is if not in expected format
  
  const [nameOrNeighbor, street] = parts.map(p => p.trim());
  
  // Check if anonymous (already says "Neighbor")
  if (nameOrNeighbor === 'Neighbor' || nameOrNeighbor === '') {
    return street ? `Neighbor on ${street}` : 'Neighbor';
  }
  
  // Format real name as "FirstName L. on Street"
  const nameParts = nameOrNeighbor.split(' ');
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastInitial = nameParts[nameParts.length - 1][0]; // Get first letter of last name
    return street ? `${firstName} ${lastInitial}. on ${street}` : `${firstName} ${lastInitial}.`;
  }
  
  // Single name (shouldn't happen, but handle it)
  return street ? `${nameOrNeighbor} on ${street}` : nameOrNeighbor;
};