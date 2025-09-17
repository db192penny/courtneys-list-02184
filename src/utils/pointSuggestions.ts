// Utility for generating smart point earning suggestions
export interface PointSuggestion {
  message: string;
  includeInviteGuidance: boolean;
}

export function generatePointSuggestion(currentPoints: number): PointSuggestion {
  const pointsNeeded = Math.max(20 - currentPoints, 0);
  
  if (pointsNeeded === 0) {
    return {
      message: "Starbucks card earned! ☕",
      includeInviteGuidance: false
    };
  }

  // Calculate different paths to 20 points
  const reviewsNeeded = Math.ceil(pointsNeeded / 5);
  const invitesNeeded = Math.ceil(pointsNeeded / 10);
  
  // Smart suggestions based on points needed
  if (pointsNeeded === 5) {
    return {
      message: "1 more review = Starbucks gift card!",
      includeInviteGuidance: false
    };
  }
  
  if (pointsNeeded === 10) {
    return {
      message: "2 more reviews OR invite 1 neighbor = Starbucks gift card!",
      includeInviteGuidance: true
    };
  }
  
  if (pointsNeeded === 15) {
    return {
      message: "3 more reviews OR 1 review + invite a neighbor = Starbucks gift card!",
      includeInviteGuidance: true
    };
  }
  
  if (pointsNeeded === 20) {
    return {
      message: "4 more reviews OR invite 2 neighbors = Starbucks gift card!",
      includeInviteGuidance: true
    };
  }
  
  // For other amounts, provide the most efficient suggestion
  if (invitesNeeded === 1) {
    return {
      message: `${reviewsNeeded} more reviews OR invite 1 neighbor = Starbucks gift card!`,
      includeInviteGuidance: true
    };
  }
  
  if (invitesNeeded === 2) {
    return {
      message: `${reviewsNeeded} more reviews OR invite 2 neighbors = Starbucks gift card!`,
      includeInviteGuidance: true
    };
  }
  
  // Default fallback
  return {
    message: `${pointsNeeded} points to Starbucks gift card!`,
    includeInviteGuidance: reviewsNeeded > 2
  };
}

export function getInviteGuidance(isMobile: boolean = false): string {
  if (isMobile) {
    return "(Go to Points & Rewards → tap 'Invite' button)";
  }
  return "(Find 'Invite' in Points & Rewards)";
}