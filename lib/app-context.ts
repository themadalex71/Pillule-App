export type AppContext = {
  householdId: string;
  memberId: string;
};

export type Household = {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
};

export type MemberRole = "admin" | "member";

export type Member = {
  id: string;
  householdId: string;
  displayName: string;
  role: MemberRole;
  createdAt: string;
};

export const DEFAULT_HOUSEHOLD_ID = "household_demo";
export const DEFAULT_MEMBER_ID = "member_alex";

export function getAppContextFromRequest(request: Request): AppContext {
  const { searchParams } = new URL(request.url);

  return {
    householdId:
      searchParams.get("householdId") ||
      request.headers.get("x-household-id") ||
      DEFAULT_HOUSEHOLD_ID,
    memberId:
      searchParams.get("memberId") ||
      request.headers.get("x-member-id") ||
      DEFAULT_MEMBER_ID,
  };
}

export function getAppContextFromBody(body: Record<string, any>): AppContext {
  return {
    householdId: body.householdId || DEFAULT_HOUSEHOLD_ID,
    memberId: body.memberId || DEFAULT_MEMBER_ID,
  };
}