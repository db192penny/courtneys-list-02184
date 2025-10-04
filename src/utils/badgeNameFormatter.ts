/**
 * Formats a badge name by replacing "Boca Bridges" with the user's actual community name
 * @param badgeName - The original badge name (e.g., "Boca Bridges Champion")
 * @param userCommunity - The user's community name (e.g., "The Bridges")
 * @returns The formatted badge name (e.g., "The Bridges Champion")
 */
export function formatBadgeName(badgeName: string, userCommunity?: string): string {
  if (!userCommunity) return badgeName;
  
  // Replace "Boca Bridges" with user's community (case-insensitive)
  return badgeName.replace(/Boca Bridges/gi, userCommunity);
}
