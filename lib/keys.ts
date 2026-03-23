export const keys = {
    household: (householdId: string) => `household:${householdId}`,
    householdMembers: (householdId: string) => `household:${householdId}:members`,
    householdMember: (householdId: string, memberId: string) =>
      `household:${householdId}:member:${memberId}`,
  
    cinemaWishlist: (householdId: string, memberId: string) =>
      `household:${householdId}:cinema:wishlist:${memberId}`,
  
    cinemaHistory: (householdId: string, memberId: string) =>
      `household:${householdId}:cinema:history:${memberId}`,
  
    cuisineRecipes: (householdId: string) =>
      `household:${householdId}:cuisine:recipes`,
  
    cuisineCategories: (householdId: string) =>
      `household:${householdId}:cuisine:categories`,
  
    cuisineAliases: (householdId: string) =>
      `household:${householdId}:cuisine:aliases`,
  
    dailySession: (householdId: string, date: string) =>
      `household:${householdId}:daily:session:${date}`,
  
    pilluleCycle: (householdId: string, memberId: string) =>
      `household:${householdId}:pillule:member:${memberId}:cycle`,
  
    pilluleTaken: (householdId: string, memberId: string, date: string) =>
      `household:${householdId}:pillule:member:${memberId}:taken:${date}`,
  };