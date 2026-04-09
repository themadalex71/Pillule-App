import { createHash } from "node:crypto";
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

function hashSecret(value: string) {
  return createHash("sha256").update(value.trim()).digest("hex");
}

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
    const identifier = String(body?.identifier || "").trim();
    const joinPassword = String(body?.joinPassword || "").trim();

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant foyer manquant." }, { status: 400 });
    }

    if (!joinPassword) {
      return NextResponse.json({ error: "Mot de passe du foyer manquant." }, { status: 400 });
    }

    const idToken = getBearerToken(request);
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";
    const displayName = (decoded.name as string | undefined) || decoded.email || "Utilisateur HarmoHome";

    const db = getFirebaseAdminDb();
    const directRef = db.collection("households").doc(identifier);
    const directSnapshot = await directRef.get();

    let householdRef = directRef;
    let householdData: HouseholdDocument | null = null;

    if (directSnapshot.exists) {
      householdData = directSnapshot.data() as HouseholdDocument;
    } else {
      const inviteCodeSnapshot = await db
        .collection("households")
        .where("inviteCode", "==", identifier.toUpperCase())
        .limit(1)
        .get();

      if (inviteCodeSnapshot.empty) {
        return NextResponse.json({ error: "Foyer introuvable." }, { status: 404 });
      }

      const matchedDoc = inviteCodeSnapshot.docs[0];
      householdRef = matchedDoc.ref;
      householdData = matchedDoc.data() as HouseholdDocument;
    }

    if (!householdData) {
      return NextResponse.json({ error: "Foyer introuvable." }, { status: 404 });
    }

    if (hashSecret(joinPassword) !== householdData.joinPasswordHash) {
      return NextResponse.json({ error: "Mot de passe du foyer incorrect." }, { status: 403 });
    }

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {
      const latestHouseholdSnapshot = await transaction.get(householdRef);
      const latestUserSnapshot = await transaction.get(userRef);

      if (!latestHouseholdSnapshot.exists) {
        throw new Error("Ce foyer n'existe plus.");
      }

      const latestHousehold = latestHouseholdSnapshot.data() as HouseholdDocument;
      const latestUser = latestUserSnapshot.exists ? (latestUserSnapshot.data() as { householdId?: string | null; createdAt?: unknown }) : null;

      if (latestUser?.householdId && latestUser.householdId !== latestHouseholdSnapshot.id) {
        throw new Error("Cet utilisateur appartient deja a un autre foyer.");
      }

      if (!latestHousehold.memberIds.includes(uid)) {
        transaction.update(householdRef, {
          memberIds: [...latestHousehold.memberIds, uid],
          members: [
            ...latestHousehold.members,
            {
              uid,
              email,
              displayName,
              role: "member",
            },
          ],
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.set(
        userRef,
        {
          email,
          displayName,
          householdId: latestHouseholdSnapshot.id,
          householdName: latestHousehold.name,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: latestUser?.createdAt ?? FieldValue.serverTimestamp(),
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
    const message = error instanceof Error ? error.message : "Impossible de rejoindre ce foyer.";
    const status = message === "Non autorise." ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
