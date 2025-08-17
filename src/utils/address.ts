
export const extractStreetName = (fullAddress: string) => {
  if (!fullAddress) return '';
  // Take first segment before the first comma, strip leading numbers, apartment/unit markers
  const firstSegment = fullAddress.split(',')[0] || fullAddress;
  // Remove leading numbers and extra spaces (e.g., "1234 N Main St" -> "N Main St")
  const noNumber = firstSegment.replace(/^\s*\d+[\s-]*/, '').trim();
  // Remove unit markers like "Apt 5", "#12" if present at the end
  const cleaned = noNumber.replace(/\b(apt|apartment|unit|#)\s*\w+$/i, '').trim();
  return cleaned || firstSegment.trim();
};

export const cleanStreetNameDisplay = (streetName: string) => {
  if (!streetName) return '';
  
  // Remove house numbers from beginning (handles: "123", "123A", "123-456", etc.)
  let cleaned = streetName.replace(/^\s*\d+[A-Za-z]?[\s-]*/, '').trim();
  
  // Remove apartment/unit numbers from end
  cleaned = cleaned.replace(/\s*(#|apt|apartment|unit)\s*\w+\s*$/i, '').trim();
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned || streetName.trim();
};

export const capitalizeStreetName = (streetName: string) => {
  if (!streetName || !streetName.trim()) return '';
  
  return streetName
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export const isInBocaBridges = (fullAddress: string) => {
  if (!fullAddress) return false;
  const hay = fullAddress.toLowerCase();
  // Simple MVP check: contains "boca bridges" anywhere
  return hay.includes('boca bridges');
};
