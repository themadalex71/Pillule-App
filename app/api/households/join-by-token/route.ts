import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HouseholdMember = {
  uid: string;
  email: string;
  displayName: string;
  role: "owner" | "member";
};

type HouseholdDocument = {
  name: string;
  inviteCode: string;
  ownerId: string;
  memberIds: string[];
  members: HouseholdMember[];
  inviteTokens?: string[];
  joinPasswordHash: string;
};

function toPublicHousehold(id: string, data: HouseholdDocument) {
  const { joinPasswordHash: _joinPasswordHash, ...rest } = data;
  return {
    id,
    ...rest,
  };
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("Non autorise.");
  }

  return token;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inviteToken = String(body?.inviteToken || "").trim().toUpperCase();

    if (!inviteToken) {
      return NextResponse.json({ error: "Lien d'invitation invalide." }, { status: 400 });
    }

    const idToken = getBearerToken(request);
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";
    const displayName = (decoded.name as string | undefined) || decoded.email || "Utilisateur HarmoHome";

    const db = getFirebaseAdminDb();
    const tokenSnapshot = await db
      .collection("households")
      .where("inviteTokens", "array-contains", inviteToken)
      .limit(1)
      .get();

    if (tokenSnapshot.empty) {
      return NextResponse.json({ error: "Lien d'invitation invalide ou expire." }, { status: 404 });
    }

    const householdRef = tokenSnapshot.docs[0].ref;
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {
      const latestHouseholdSnapshot = await transaction.get(householdRef);
      const latestUserSnapshot = await transaction.get(userRef);

      if (!latestHouseholdSnapshot.exists) {
        throw new Error("Ce foyer n'existe plus.");
      }

      const latestHousehold = latestHouseholdSnapshot.data() as HouseholdDocument;
      const latestUser = latestUserSnapshot.exists ? (latestUserSnapshot.data() as { householdId?: string | null }) : null;

      if (latestUser?.householdId && latestUser.householdId !== latestHouseholdSnapshot.id) {
        throw new Error("Cet utilisateur appartient deja a un autre foyer.");
      }

      if (!latestHousehold.inviteTokens?.includes(inviteToken)) {
        throw new Error("Lien d'invitation invalide ou expire.");
      }

      const nextTokens = latestHousehold.inviteTokens.filter((token) => token !== inviteToken);
      const nextMemberIds = latestHousehold.memberIds.includes(uid)
        ? latestHousehold.memberIds
        : [...latestHousehold.memberIds, uid];
      const existingMembers = latestHousehold.members.filter((member) => member.uid !== uid);

      transaction.update(householdRef, {
        inviteTokens: nextTokens,
        memberIds: nextMemberIds,
        members: [
          ...existingMembers,
          {
            uid,
            email,
            displayName,
            role: uid === latestHousehold.ownerId ? "owner" : "member",
          },
        ],
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(
        userRef,
        {
          email,
          displayName,
          householdId: latestHouseholdSnapshot.id,
          householdName: latestHousehold.name,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    const householdSnapshot = await householdRef.get();

    if (!householdSnapshot.exists) {
      return NextResponse.json({ error: "Ce foyer n'existe plus." }, { status: 404 });
    }

    return NextResponse.json({
      household: toPublicHousehold(householdSnapshot.id, householdSnapshot.data() as HouseholdDocument),
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Impossible d'utiliser ce lien d'invitation.";
    const status = message === "Non autorise." ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
