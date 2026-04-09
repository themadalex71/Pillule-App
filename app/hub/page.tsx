"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Copy,
  ChefHat,
  Clapperboard,
  Home,
  Loader2,
  LogOut,
  PartyPopper,
  Pill,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createHouseholdInviteLink,
  createHouseholdForUser,
  deleteHousehold,
  getUserHousehold,
  joinHouseholdForUser,
  joinHouseholdWithInviteToken,
  removeHouseholdMember,
  type Household,
} from "@/lib/firebase/households";

type HubTab = "profile" | "search" | "hh" | "household" | "settings";

function HarmoHomeLogo() {
  return (
    <div className="text-center">
      <h1 className="text-[2.6rem] font-semibold leading-none tracking-[-0.05em]">
        <span className="text-[#8d7ac6]">Harmo</span>
        <span className="text-[#ef9a79]">Home</span>
      </h1>
      <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-5 text-[#8d82a8]">
        L&apos;app du foyer pour partager vos routines, vos envies et vos moments a plusieurs.
      </p>
    </div>
  );
}

export default function HubPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<HubTab>("hh");
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseReady) {
      router.replace("/");
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser || !nextUser.emailVerified) {
        router.replace("/");
        return;
      }

      setUser(nextUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [firebaseReady, router]);

  const handleSignOut = async () => {
    await signOut(getFirebaseAuth());
    router.replace("/");
  };

  if (!authReady || !user) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#fcf7f2] text-[#4c1d95]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#efe5ff] border-t-[#ef9a79]" />
          <p className="text-sm text-[#6b21a8]">Ouverture de HarmoHome...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#fcf7f2] px-5 pb-28 pt-5 text-[#2e1065]">
      <div className="mx-auto w-full max-w-sm">
        <div className="pb-6 pt-1">
          <HarmoHomeLogo />
        </div>

        {activeTab === "profile" && <ProfileView user={user} />}
        {activeTab === "search" && <SearchView />}
        {activeTab === "hh" && <HHView user={user} onOpenHousehold={() => setActiveTab("household")} />}
        {activeTab === "household" && <HouseholdView user={user} onSignOut={handleSignOut} />}
        {activeTab === "settings" && <SettingsView onSignOut={handleSignOut} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#eee5dc] bg-[rgba(252,247,242,0.96)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-sm grid-cols-5 px-5 pb-5 pt-3">
          <BottomTab
            label="Profil"
            icon={UserRound}
            isActive={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
          <BottomTab
            label="Recherche"
            icon={Search}
            isActive={activeTab === "search"}
            onClick={() => setActiveTab("search")}
          />
          <BottomTab
            label="HH"
            icon={Home}
            isActive={activeTab === "hh"}
            onClick={() => setActiveTab("hh")}
          />
          <BottomTab
            label="Foyer"
            icon={Users}
            isActive={activeTab === "household"}
            onClick={() => setActiveTab("household")}
          />
          <BottomTab
            label="Parametres"
            icon={Settings}
            isActive={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </nav>
    </main>
  );
}

function SearchView() {
  return (
    <section className="space-y-4 rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">Recherche</p>
        <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">Explorer</h2>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-sm text-[#6f628f]">
          Cette zone servira a la recherche dans HarmoHome.
        </p>
      </div>
    </section>
  );
}

function HHView({
  user,
  onOpenHousehold,
}: {
  user: User;
  onOpenHousehold: () => void;
}) {
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadHouseholdStatus = async () => {
      try {
        const household = await getUserHousehold(user.uid);
        if (isMounted) {
          setHasHousehold(Boolean(household));
        }
      } catch {
        if (isMounted) {
          setHasHousehold(false);
        }
      }
    };

    void loadHouseholdStatus();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">HarmoHome</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">Accueil</h2>
          <p className="mt-2 text-sm text-[#8d82a8]">
            Retrouve ici les apps principales du foyer.
          </p>
        </div>

        {hasHousehold === false && (
          <div className="mt-5 rounded-[1.4rem] border border-[#f2decf] bg-[#fffaf3] p-4">
            <p className="text-sm font-semibold text-[#4b3d6d]">Un foyer rend HarmoHome plus utile</p>
            <p className="mt-1.5 text-sm text-[#6f628f]">
              Cree un foyer ou rejoins-en un pour partager les apps, les listes et les routines a plusieurs.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenHousehold}
                className="rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                Creer
              </button>
              <button
                type="button"
                onClick={onOpenHousehold}
                className="rounded-2xl border border-[#ece4f7] bg-white px-4 py-3 text-sm font-semibold text-[#6f628f] transition active:scale-[0.98]"
              >
                Rejoindre
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-5">
        <AppTile
          href="/pillule"
          title="Pilule"
          subtitle="Suivi quotidien"
          icon={Pill}
          tileClassName="border-[#efd7ea] bg-[linear-gradient(145deg,#fff9fc,#fbf6ff)]"
          iconWrapClassName="bg-[#f2d7ee]"
          iconClassName="text-[#9f5f94]"
        />
        <AppTile
          href="/cinema"
          title="Cinema"
          subtitle="CineMatch et listes"
          icon={Clapperboard}
          tileClassName="border-[#f1e3bf] bg-[linear-gradient(145deg,#fffdf7,#fffaf0)]"
          iconWrapClassName="bg-[#f4e6bd]"
          iconClassName="text-[#9d8240]"
        />
        <AppTile
          href="/cuisine"
          title="Cuisine"
          subtitle="Recettes et idees"
          icon={ChefHat}
          tileClassName="border-[#f2decf] bg-[linear-gradient(145deg,#fffaf6,#fff8f3)]"
          iconWrapClassName="bg-[#f3ddcf]"
          iconClassName="text-[#a7704f]"
        />
        <AppTile
          href="/daily"
          title="Defi du Jour"
          subtitle="Mini-jeux duo"
          icon={PartyPopper}
          tileClassName="border-[#d7e9f0] bg-[linear-gradient(145deg,#f7fcff,#f3fbff)]"
          iconWrapClassName="bg-[#d2edf5]"
          iconClassName="text-[#4f8fa7]"
        />
      </div>
    </div>
  );
}

function HouseholdView({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [householdMode, setHouseholdMode] = useState<"create" | "join" | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(true);
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);
  const [isJoiningHousehold, setIsJoiningHousehold] = useState(false);
  const [isGeneratingInviteLink, setIsGeneratingInviteLink] = useState(false);
  const [isDeletingHousehold, setIsDeletingHousehold] = useState(false);
  const [removingMemberUid, setRemovingMemberUid] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [householdPassword, setHouseholdPassword] = useState("");
  const [joinIdentifier, setJoinIdentifier] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const loadHousehold = async () => {
    setIsLoadingHousehold(true);
    setErrorMessage("");

    try {
      const nextHousehold = await getUserHousehold(user.uid);
      setHousehold(nextHousehold);
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible de charger le foyer.");
    } finally {
      setIsLoadingHousehold(false);
    }
  };

  useEffect(() => {
    void loadHousehold();
  }, [user.uid]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("inviteToken");

    if (token) {
      setInviteToken(token);
    }
  }, []);

  const handleCreateHousehold = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!householdName.trim()) {
      setErrorMessage("Choisis d'abord un nom de foyer.");
      return;
    }

    if (!householdPassword.trim()) {
      setErrorMessage("Choisis aussi un mot de passe de foyer.");
      return;
    }

    setIsCreatingHousehold(true);

    try {
      await createHouseholdForUser({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email || "Utilisateur HarmoHome",
        householdName,
        joinPassword: householdPassword,
      });

      await loadHousehold();
      setHouseholdMode(null);
      setHouseholdName("");
      setHouseholdPassword("");
      setInfoMessage("Foyer cree avec succes.");
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible de creer le foyer.");
    } finally {
      setIsCreatingHousehold(false);
    }
  };

  const handleJoinHousehold = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!joinIdentifier.trim()) {
      setErrorMessage("Renseigne l'identifiant ou le code du foyer.");
      return;
    }

    if (!joinPassword.trim()) {
      setErrorMessage("Renseigne le mot de passe du foyer.");
      return;
    }

    setIsJoiningHousehold(true);

    try {
      await joinHouseholdForUser({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email || "Utilisateur HarmoHome",
        identifier: joinIdentifier,
        joinPassword,
      });

      await loadHousehold();
      setHouseholdMode(null);
      setJoinIdentifier("");
      setJoinPassword("");
      setInfoMessage("Tu as rejoint le foyer avec succes.");
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible de rejoindre ce foyer.");
    } finally {
      setIsJoiningHousehold(false);
    }
  };

  const handleJoinFromInviteLink = async () => {
    if (!inviteToken.trim()) {
      return;
    }

    setErrorMessage("");
    setInfoMessage("");
    setIsJoiningHousehold(true);

    try {
      await joinHouseholdWithInviteToken({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email || "Utilisateur HarmoHome",
        inviteToken,
      });

      await loadHousehold();
      setHouseholdMode("join");
      setInviteToken("");
      window.history.replaceState({}, "", "/hub");
      setInfoMessage("Invitation acceptee. Tu as rejoint le foyer.");
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible d'utiliser ce lien d'invitation.");
    } finally {
      setIsJoiningHousehold(false);
    }
  };

  const handleGenerateInviteLink = async () => {
    if (!household) {
      return;
    }

    setErrorMessage("");
    setInfoMessage("");
    setIsGeneratingInviteLink(true);

    try {
      const token = await createHouseholdInviteLink({
        householdId: household.id,
        actorUid: user.uid,
      });
      const inviteUrl = `${window.location.origin}/hub?inviteToken=${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      setInfoMessage("Lien d'invitation copie.");
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible de generer le lien d'invitation.");
    } finally {
      setIsGeneratingInviteLink(false);
    }
  };

  const handleCopyHouseholdId = async () => {
    if (!household) {
      return;
    }

    await navigator.clipboard.writeText(household.id);
    setInfoMessage("Identifiant du foyer copie.");
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!household) {
      return;
    }

    setErrorMessage("");
    setInfoMessage("");
    setRemovingMemberUid(memberUid);

    try {
      await removeHouseholdMember({
        householdId: household.id,
        actorUid: user.uid,
        memberUid,
      });
      await loadHousehold();
      setInfoMessage("Membre supprime du foyer.");
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible de supprimer ce membre.");
    } finally {
      setRemovingMemberUid(null);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!household || !isOwner) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer ce foyer va retirer tous les membres et effacer le foyer pour tout le monde. Continuer ?",
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setInfoMessage("");
    setIsDeletingHousehold(true);

    try {
      await deleteHousehold({
        householdId: household.id,
        actorUid: user.uid,
      });
      setHousehold(null);
      setInfoMessage("Foyer supprime avec succes.");
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible de supprimer le foyer.");
    } finally {
      setIsDeletingHousehold(false);
    }
  };

  const hasHousehold = Boolean(household);
  const isOwner = household?.ownerId === user.uid;

  return (
    <section className="rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">HarmoHome</p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">Foyer</h2>
            <p className="mt-2 text-sm text-[#8d82a8]">
              {hasHousehold
                ? "Ton foyer est pret. Tu peux maintenant partager les apps avec les autres membres."
                : "Tu n'as pas encore de foyer. Cree-en un ou rejoins-en un pour commencer a partager l'app."}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-2xl border border-[#ece4f7] bg-[#fcfbff] p-3.5 text-[#7f68b7] transition active:scale-95"
            aria-label="Se deconnecter"
          >
            <LogOut size={18} />
          </button>
        </div>

        {isLoadingHousehold && (
          <div className="mt-5 rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
            <div className="flex items-center gap-2 text-sm text-[#6f628f]">
              <Loader2 size={16} className="animate-spin" />
              Chargement du foyer...
            </div>
          </div>
        )}

        {!isLoadingHousehold && !hasHousehold && (
          <div className="mt-5 space-y-3">
            {inviteToken && (
              <div className="rounded-[1.4rem] border border-[#f2decf] bg-[#fffaf3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c08268]">Invitation recue</p>
                <p className="mt-2 text-sm text-[#6f628f]">
                  Un lien d'invitation a ete detecte. Tu peux rejoindre ce foyer en un clic.
                </p>
                <button
                  type="button"
                  onClick={handleJoinFromInviteLink}
                  disabled={isJoiningHousehold}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isJoiningHousehold ? <Loader2 size={17} className="animate-spin" /> : <Users size={17} />}
                  Rejoindre via invitation
                </button>
              </div>
            )}

            {!householdMode && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHouseholdMode("create")}
                  className="rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
                >
                  Creer
                </button>
                <button
                  type="button"
                  onClick={() => setHouseholdMode("join")}
                  className="rounded-2xl border border-[#ece4f7] bg-white px-4 py-3 text-sm font-semibold text-[#6f628f] transition active:scale-[0.98]"
                >
                  Rejoindre
                </button>
              </div>
            )}

            {householdMode === "create" && (
              <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Creer un foyer</p>
                  <button
                    type="button"
                    onClick={() => setHouseholdMode(null)}
                    className="text-xs font-medium text-[#8d82a8]"
                  >
                    Retour
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">Nom du foyer</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Home size={17} className="text-[#b19bd6]" />
                      <input
                        value={householdName}
                        onChange={(event) => setHouseholdName(event.target.value)}
                        placeholder="Ex: Maison Alex & Lea"
                        className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">Mot de passe du foyer</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Shield size={17} className="text-[#b19bd6]" />
                      <input
                        type="password"
                        value={householdPassword}
                        onChange={(event) => setHouseholdPassword(event.target.value)}
                        placeholder="Choisis un mot de passe"
                        className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={handleCreateHousehold}
                    disabled={isCreatingHousehold}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {isCreatingHousehold ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                    Creer mon foyer
                  </button>
                </div>
              </div>
            )}

            {householdMode === "join" && (
              <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Rejoindre un foyer</p>
                  <button
                    type="button"
                    onClick={() => setHouseholdMode(null)}
                    className="text-xs font-medium text-[#8d82a8]"
                  >
                    Retour
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">Identifiant ou code foyer</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Users size={17} className="text-[#b19bd6]" />
                      <input
                        value={joinIdentifier}
                        onChange={(event) => setJoinIdentifier(event.target.value)}
                        placeholder="ID ou code invitation"
                        className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">Mot de passe du foyer</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Shield size={17} className="text-[#b19bd6]" />
                      <input
                        type="password"
                        value={joinPassword}
                        onChange={(event) => setJoinPassword(event.target.value)}
                        placeholder="Mot de passe partage"
                        className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={handleJoinHousehold}
                    disabled={isJoiningHousehold}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3 text-sm font-semibold text-[#6f628f] transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {isJoiningHousehold ? <Loader2 size={17} className="animate-spin" /> : <Users size={17} />}
                    Rejoindre ce foyer
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-[#f5d1d8] bg-[#fff6f7] px-4 py-2.5 text-sm text-[#b4536b]">
                {errorMessage}
              </div>
            )}

            {infoMessage && (
              <div className="rounded-2xl border border-[#f4dec7] bg-[#fffaf3] px-4 py-2.5 text-sm text-[#a36a40]">
                {infoMessage}
              </div>
            )}
          </div>
        )}

        {!isLoadingHousehold && hasHousehold && household && (
          <div className="mt-5 space-y-3">
            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Nom du foyer</p>
              <p className="mt-2 text-base font-semibold text-[#4b3d6d]">{household.name}</p>
            </div>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Identifiant du foyer</p>
                  <p className="mt-2 break-all text-base font-semibold text-[#4b3d6d]">{household.id}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHouseholdId}
                  className="rounded-xl border border-[#ece4f7] bg-white p-2 text-[#7f68b7]"
                  aria-label="Copier l'identifiant du foyer"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Code foyer</p>
              <p className="mt-2 text-base font-semibold tracking-[0.18em] text-[#4b3d6d]">{household.inviteCode}</p>
              <p className="mt-2 text-xs text-[#9f93bc]">A partager avec le mot de passe du foyer si vous passez par le bouton rejoindre.</p>
            </div>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Membres</p>
              <div className="mt-3 space-y-3">
                {household.members.map((member) => {
                  const canRemove = isOwner && member.uid !== household.ownerId;

                  return (
                    <div key={member.uid} className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece4f7] bg-white px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#4b3d6d]">{member.displayName || member.email}</p>
                        <p className="truncate text-xs text-[#8d82a8]">
                          {member.email}
                          {member.role === "owner" ? " · proprietaire" : ""}
                        </p>
                      </div>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.uid)}
                          disabled={removingMemberUid === member.uid}
                          className="rounded-xl border border-[#f2d6dd] bg-[#fff6f7] p-2 text-[#b4536b] disabled:opacity-60"
                          aria-label={`Supprimer ${member.displayName || member.email}`}
                        >
                          {removingMemberUid === member.uid ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isOwner && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={handleGenerateInviteLink}
                  disabled={isGeneratingInviteLink}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isGeneratingInviteLink ? <Loader2 size={17} className="animate-spin" /> : <Copy size={17} />}
                  Copier un lien d'invitation
                </button>

                <button
                  type="button"
                  onClick={handleDeleteHousehold}
                  disabled={isDeletingHousehold}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#f2d6dd] bg-[#fff6f7] px-4 py-3 text-sm font-semibold text-[#b4536b] disabled:opacity-60"
                >
                  {isDeletingHousehold ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <AlertTriangle size={17} />
                  )}
                  Supprimer le foyer
                </button>
              </div>
            )}

            {(infoMessage || errorMessage) && (
              <>
                {errorMessage && (
                  <div className="rounded-2xl border border-[#f5d1d8] bg-[#fff6f7] px-4 py-2.5 text-sm text-[#b4536b]">
                    {errorMessage}
                  </div>
                )}
                {infoMessage && (
                  <div className="rounded-2xl border border-[#f4dec7] bg-[#fffaf3] px-4 py-2.5 text-sm text-[#a36a40]">
                    {infoMessage}
                  </div>
                )}
              </>
            )}

            <p className="text-xs text-[#9f93bc]">
              {isOwner
                ? "Tu peux inviter des membres avec le lien ou leur partager l'identifiant du foyer et le mot de passe."
                : "Seul le createur du foyer peut gerer les invitations et supprimer des membres."}
            </p>

            <p className="text-xs text-[#9f93bc]">
              Connecte en tant que {user.email || user.displayName || "Utilisateur"}.
            </p>
          </div>
        )}
    </section>
  );
}

function ProfileView({ user }: { user: User }) {
  const nameParts = user.displayName?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] || "Utilisateur";
  const lastName = nameParts.slice(1).join(" ");

  return (
    <section className="space-y-4 rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">Profil</p>
        <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">Ton compte</h2>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Prenom</p>
        <p className="mt-2 text-lg font-semibold text-[#4b3d6d]">{firstName}</p>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Nom</p>
        <p className="mt-2 text-lg font-semibold text-[#4b3d6d]">{lastName || "-"}</p>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">Adresse mail</p>
        <p className="mt-2 break-all text-lg font-semibold text-[#4b3d6d]">{user.email || "-"}</p>
      </div>
    </section>
  );
}

function SettingsView({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <section className="space-y-4 rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">Parametres</p>
        <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">Preferences</h2>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-sm text-[#6f628f]">
          Cette zone servira pour les reglages du foyer, les notifications et la gestion du compte.
        </p>
      </div>

      <button
        onClick={onSignOut}
        className="w-full rounded-2xl bg-[#ef9a79] px-5 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]"
      >
        Se deconnecter
      </button>
    </section>
  );
}

function AppTile({
  href,
  title,
  subtitle,
  icon: Icon,
  tileClassName,
  iconWrapClassName,
  iconClassName,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tileClassName: string;
  iconWrapClassName: string;
  iconClassName: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[2rem] border p-6 shadow-[0_12px_30px_rgba(111,98,143,0.08)] transition active:scale-[0.98] ${tileClassName}`}
    >
      <div className={`mb-8 flex h-16 w-16 items-center justify-center rounded-2xl ${iconWrapClassName}`}>
        <Icon className={iconClassName} size={30} />
      </div>
      <p className="text-[1.05rem] font-black text-[#4b3d6d]">{title}</p>
      <p className="mt-2 text-sm text-[#6f628f]">{subtitle}</p>
    </Link>
  );
}

function BottomTab({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 text-center"
      aria-pressed={isActive}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
          isActive
            ? "border-[#e7dbf6] bg-white text-[#7f68b7]"
            : "border-transparent bg-transparent text-[#9f93bc]"
        }`}
      >
        <Icon size={20} />
      </div>
      <span className={`text-xs font-medium ${isActive ? "text-[#5e4e89]" : "text-[#9f93bc]"}`}>{label}</span>
    </button>
  );
}
