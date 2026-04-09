import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";

export type HouseholdMember = {
  uid: string;
  email: string;
  displayName: string;
  role: "owner" | "member";
};

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberIds: string[];
  members: HouseholdMember[];
  inviteTokens?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

type HouseholdDocument = Omit<Household, "id"> & {
  joinPasswordHash: string;
};

type UserHouseholdRecord = {
  householdId?: string | null;
  householdName?: string | null;
  email?: string;
  displayName?: string;
};

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createInviteToken() {
  return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

async function hashSecret(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim()));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getCurrentUserIdToken(expectedUid: string) {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Utilisateur non connecte.");
  }

  if (currentUser.uid !== expectedUid) {
    throw new Error("Session invalide. Reconnecte-toi puis reessaie.");
  }

  return currentUser.getIdToken();
}

function toHousehold(snapshotId: string, data: HouseholdDocument): Household {
  const { joinPasswordHash: _joinPasswordHash, ...rest } = data;
  return {
    id: snapshotId,
    ...rest,
  };
}

export async function createHouseholdForUser(input: {
  uid: string;
  email: string;
  displayName: string;
  householdName: string;
  joinPassword: string;
}) {
  const db = getFirebaseDb();
  const householdRef = doc(collection(db, "households"));
  const userRef = doc(db, "users", input.uid);
  const joinPasswordHash = await hashSecret(input.joinPassword);

  const household: HouseholdDocument = {
    name: input.householdName.trim(),
    inviteCode: createInviteCode(),
    joinPasswordHash,
    ownerId: input.uid,
    memberIds: [input.uid],
    members: [
      {
        uid: input.uid,
        email: input.email,
        displayName: input.displayName,
        role: "owner",
      },
    ],
    inviteTokens: [],
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const userRecord = {
    email: input.email,
    displayName: input.displayName,
    householdId: householdRef.id,
    householdName: household.name,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(householdRef, household);
  batch.set(userRef, userRecord, { merge: true });
  await batch.commit();

  return householdRef.id;
}

export async function getUserHousehold(uid: string) {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  const userRecord = userSnapshot.data() as UserHouseholdRecord;

  if (!userRecord.householdId) {
    return null;
  }

  const householdRef = doc(db, "households", userRecord.householdId);
  const householdSnapshot = await getDoc(householdRef);

  if (!householdSnapshot.exists()) {
    return null;
  }

  return toHousehold(householdSnapshot.id, householdSnapshot.data() as HouseholdDocument);
}

export async function joinHouseholdForUser(input: {
  uid: string;
  email: string;
  displayName: string;
  identifier: string;
  joinPassword: string;
}) {
  const idToken = await getCurrentUserIdToken(input.uid);
  const response = await fetch("/api/households/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      identifier: input.identifier,
      joinPassword: input.joinPassword,
    }),
  });
  const data = (await response.json().catch(() => null)) as { household?: Household; error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error || "Impossible de rejoindre ce foyer.");
  }

  if (!data?.household) {
    throw new Error("Reponse invalide du serveur.");
  }

  return data.household;
}

export async function createHouseholdInviteLink(input: {
  householdId: string;
  actorUid: string;
}) {
  const db = getFirebaseDb();
  const householdRef = doc(db, "households", input.householdId);
  const inviteToken = createInviteToken();

  await runTransaction(db, async (transaction) => {
    const householdSnapshot = await transaction.get(householdRef);

    if (!householdSnapshot.exists()) {
      throw new Error("Foyer introuvable.");
    }

    const household = householdSnapshot.data() as HouseholdDocument;

    if (household.ownerId !== input.actorUid) {
      throw new Error("Seul le createur du foyer peut generer un lien.");
    }

    const nextTokens = [...(household.inviteTokens || []), inviteToken];

    transaction.update(householdRef, {
      inviteTokens: nextTokens,
      updatedAt: serverTimestamp(),
    });
  });

  return inviteToken;
}

export async function joinHouseholdWithInviteToken(input: {
  uid: string;
  email: string;
  displayName: string;
  inviteToken: string;
}) {
  const idToken = await getCurrentUserIdToken(input.uid);
  const response = await fetch("/api/households/join-by-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      inviteToken: input.inviteToken,
    }),
  });
  const data = (await response.json().catch(() => null)) as { household?: Household; error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error || "Impossible d'utiliser ce lien d'invitation.");
  }

  if (!data?.household) {
    throw new Error("Reponse invalide du serveur.");
  }

  return data.household;
}

export async function removeHouseholdMember(input: {
  householdId: string;
  actorUid: string;
  memberUid: string;
}) {
  const db = getFirebaseDb();
  const householdRef = doc(db, "households", input.householdId);
  const memberUserRef = doc(db, "users", input.memberUid);

  await runTransaction(db, async (transaction) => {
    const householdSnapshot = await transaction.get(householdRef);

    if (!householdSnapshot.exists()) {
      throw new Error("Foyer introuvable.");
    }

    const household = householdSnapshot.data() as HouseholdDocument;

    if (household.ownerId !== input.actorUid) {
      throw new Error("Seul le createur du foyer peut supprimer un membre.");
    }

    if (input.memberUid === household.ownerId) {
      throw new Error("Le createur du foyer ne peut pas etre supprime.");
    }

    transaction.update(householdRef, {
      memberIds: household.memberIds.filter((uid) => uid !== input.memberUid),
      members: household.members.filter((member) => member.uid !== input.memberUid),
      updatedAt: serverTimestamp(),
    });

    transaction.set(
      memberUserRef,
      {
        householdId: null,
        householdName: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function deleteHousehold(input: {
  householdId: string;
  actorUid: string;
}) {
  const db = getFirebaseDb();
  const householdRef = doc(db, "households", input.householdId);

  const householdSnapshot = await getDoc(householdRef);

  if (!householdSnapshot.exists()) {
    throw new Error("Foyer introuvable.");
  }

  const household = householdSnapshot.data() as HouseholdDocument;

  if (household.ownerId !== input.actorUid) {
    throw new Error("Seul le createur du foyer peut supprimer le foyer.");
  }

  const batch = writeBatch(db);

  for (const memberId of household.memberIds) {
    const memberUserRef = doc(db, "users", memberId);
    batch.set(
      memberUserRef,
      {
        householdId: null,
        householdName: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  batch.delete(householdRef);
  await batch.commit();
}
