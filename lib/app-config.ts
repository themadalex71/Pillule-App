import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import {
  DEFAULT_HOUSEHOLD_ID,
  DEFAULT_MEMBER_ID,
  type Household,
  type Member,
} from "@/lib/app-context";

export const DEFAULT_HOUSEHOLD: Household = {
  id: DEFAULT_HOUSEHOLD_ID,
  name: "Foyer Démo",
  createdAt: new Date().toISOString(),
  createdBy: DEFAULT_MEMBER_ID,
};

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: "demo_member_1",
    householdId: DEFAULT_HOUSEHOLD_ID,
    displayName: "Membre 1",
    role: "admin",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo_member_2",
    householdId: DEFAULT_HOUSEHOLD_ID,
    displayName: "Membre 2",
    role: "member",
    createdAt: new Date().toISOString(),
  },
];

export async function ensureDefaultAppData() {
  const householdKey = keys.household(DEFAULT_HOUSEHOLD_ID);
  const membersKey = keys.householdMembers(DEFAULT_HOUSEHOLD_ID);

  const existingHousehold = await redis.get(householdKey);
  if (!existingHousehold) {
    await redis.set(householdKey, DEFAULT_HOUSEHOLD);
  }

  const existingMembers = await redis.get<string[]>(membersKey);
  if (!existingMembers || existingMembers.length === 0) {
    await redis.set(
      membersKey,
      DEFAULT_MEMBERS.map((member) => member.id)
    );

    for (const member of DEFAULT_MEMBERS) {
      await redis.set(
        keys.householdMember(DEFAULT_HOUSEHOLD_ID, member.id),
        member
      );
    }
  }
}
