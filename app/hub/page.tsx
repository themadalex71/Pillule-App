"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { requestBrowserPushToken } from "@/lib/firebase/messaging";
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
import { useI18n } from "@/components/I18nProvider";
import { useTheme } from "@/components/ThemeProvider";

type HubTab = "profile" | "search" | "hh" | "household" | "settings";

const COMMON_TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Brussels",
  "Europe/Zurich",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Montreal",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function getTimeZoneOptions() {
  try {
    const intlWithSupportedValues = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };
    if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
      const all = intlWithSupportedValues
        .supportedValuesOf("timeZone")
        .filter((zone) => zone.includes("/"));
      return Array.from(new Set([...COMMON_TIMEZONES, ...all])).sort((a, b) => a.localeCompare(b));
    }
  } catch {
    // ignore
  }

  return [...COMMON_TIMEZONES];
}

function toUtcOffsetLabel(rawOffset: string) {
  const normalized = rawOffset.trim().toUpperCase();

  if (normalized === "UTC" || normalized === "GMT") {
    return "UTC+00:00";
  }

  const match = normalized.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] || "00").padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

function getTimeZoneOffset(zone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((part) => part.type === "timeZoneName")?.value || "";
    return toUtcOffsetLabel(offsetPart);
  } catch {
    return null;
  }
}

function formatTimeZoneLabel(zone: string, utcUniversalLabel = "Temps universel") {
  const offset = getTimeZoneOffset(zone);

  if (zone === "UTC") {
    return offset ? `UTC (${utcUniversalLabel}, ${offset})` : `UTC (${utcUniversalLabel})`;
  }

  return offset ? `${zone} (${offset})` : zone;
}

async function bootstrapVerifiedUserProfile(user: User) {
  if (!user.emailVerified) return;

  const token = await user.getIdToken();
  const response = await fetch("/api/user/bootstrap", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Initialisation du profil impossible.");
  }
}

function HarmoHomeLogo({ tagline }: { tagline: string }) {
  return (
    <div className="text-center">
      <h1 className="text-[2.6rem] font-semibold leading-none tracking-[-0.05em]">
        <span className="text-[#8d7ac6]">Harmo</span>
        <span className="text-[#ef9a79]">Home</span>
      </h1>
      <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-5 text-[#8d82a8]">
        {tagline}
      </p>
    </div>
  );
}

export default function HubPage() {
  const { t } = useI18n();
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
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser || !nextUser.emailVerified) {
        router.replace("/");
        return;
      }

      try {
        await bootstrapVerifiedUserProfile(nextUser);
      } catch (error) {
        console.error("bootstrap profile error:", error);
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
      <main className="flex h-[100dvh] overflow-x-hidden items-center justify-center bg-[#fcf7f2] text-[#4c1d95]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#efe5ff] border-t-[#ef9a79]" />
          <p className="text-sm text-[#6b21a8]">{t("hub.opening")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#fcf7f2] px-5 pb-28 pt-5 text-[#2e1065]">
      <div className="mx-auto w-full max-w-sm">
        <div className="pb-6 pt-1">
          <HarmoHomeLogo tagline={t("login.tagline")} />
        </div>

        {activeTab === "profile" && <ProfileView user={user} />}
        {activeTab === "search" && <SearchView />}
        {activeTab === "hh" && <HHView user={user} onOpenHousehold={() => setActiveTab("household")} />}
        {activeTab === "household" && <HouseholdView user={user} onSignOut={handleSignOut} />}
        {activeTab === "settings" && <SettingsView user={user} onSignOut={handleSignOut} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#eee5dc] bg-[rgba(252,247,242,0.96)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-sm grid-cols-5 px-5 pb-5 pt-3">
          <BottomTab
            label={t("hub.tabs.profile")}
            icon={UserRound}
            isActive={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
          <BottomTab
            label={t("hub.tabs.search")}
            icon={Search}
            isActive={activeTab === "search"}
            onClick={() => setActiveTab("search")}
          />
          <BottomTab
            label={t("hub.tabs.home")}
            icon={Home}
            isActive={activeTab === "hh"}
            onClick={() => setActiveTab("hh")}
          />
          <BottomTab
            label={t("hub.tabs.household")}
            icon={Users}
            isActive={activeTab === "household"}
            onClick={() => setActiveTab("household")}
          />
          <BottomTab
            label={t("hub.tabs.settings")}
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
  const { t } = useI18n();
  return (
    <section className="space-y-4 rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">{t("hub.search.kicker")}</p>
        <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">{t("hub.search.title")}</h2>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-sm text-[#6f628f]">
          {t("hub.search.placeholder")}
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
  const { t } = useI18n();
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
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">{t("hub.home.kicker")}</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">{t("hub.home.title")}</h2>
          <p className="mt-2 text-sm text-[#8d82a8]">
            {t("hub.home.description")}
          </p>
        </div>

        {hasHousehold === false && (
          <div className="mt-5 rounded-[1.4rem] border border-[#f2decf] bg-[#fffaf3] p-4">
            <p className="text-sm font-semibold text-[#4b3d6d]">{t("hub.home.noHousehold.title")}</p>
            <p className="mt-1.5 text-sm text-[#6f628f]">
              {t("hub.home.noHousehold.description")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenHousehold}
                className="rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                {t("hub.home.noHousehold.create")}
              </button>
              <button
                type="button"
                onClick={onOpenHousehold}
                className="rounded-2xl border border-[#ece4f7] bg-white px-4 py-3 text-sm font-semibold text-[#6f628f] transition active:scale-[0.98]"
              >
                {t("hub.home.noHousehold.join")}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-5">
        <AppTile
          href="/pillule"
          title={t("hub.home.apps.pillule.title")}
          subtitle={t("hub.home.apps.pillule.subtitle")}
          icon={Pill}
          tileClassName="border-[#efd7ea] bg-[linear-gradient(145deg,#fff9fc,#fbf6ff)] dark:border-[#4a3551] dark:bg-[linear-gradient(145deg,#2a1f34,#1f1a2d)]"
          iconWrapClassName="bg-[#f2d7ee] dark:bg-[#3b2a45]"
          iconClassName="text-[#9f5f94] dark:text-[#d8a8d2]"
        />
        <AppTile
          href="/cinema"
          title={t("hub.home.apps.cinema.title")}
          subtitle={t("hub.home.apps.cinema.subtitle")}
          icon={Clapperboard}
          tileClassName="border-[#f1e3bf] bg-[linear-gradient(145deg,#fffdf7,#fffaf0)] dark:border-[#4b4531] dark:bg-[linear-gradient(145deg,#2c261a,#201d16)]"
          iconWrapClassName="bg-[#f4e6bd] dark:bg-[#3d3422]"
          iconClassName="text-[#9d8240] dark:text-[#e2c470]"
        />
        <AppTile
          href="/cuisine"
          title={t("hub.home.apps.cuisine.title")}
          subtitle={t("hub.home.apps.cuisine.subtitle")}
          icon={ChefHat}
          tileClassName="border-[#f2decf] bg-[linear-gradient(145deg,#fffaf6,#fff8f3)] dark:border-[#4b3a32] dark:bg-[linear-gradient(145deg,#2b211b,#211b18)]"
          iconWrapClassName="bg-[#f3ddcf] dark:bg-[#3f2d25]"
          iconClassName="text-[#a7704f] dark:text-[#e4b08f]"
        />
        <AppTile
          href="/daily"
          title={t("hub.home.apps.daily.title")}
          subtitle={t("hub.home.apps.daily.subtitle")}
          icon={PartyPopper}
          tileClassName="border-[#d7e9f0] bg-[linear-gradient(145deg,#f7fcff,#f3fbff)] dark:border-[#304653] dark:bg-[linear-gradient(145deg,#1b2530,#161f28)]"
          iconWrapClassName="bg-[#d2edf5] dark:bg-[#223745]"
          iconClassName="text-[#4f8fa7] dark:text-[#8bc5da]"
        />
      </div>
    </div>
  );
}

function HouseholdView({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const { t } = useI18n();
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
      setErrorMessage(error.message || t("hub.household.errors.load"));
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
      setErrorMessage(t("hub.household.errors.chooseName"));
      return;
    }

    if (!householdPassword.trim()) {
      setErrorMessage(t("hub.household.errors.choosePassword"));
      return;
    }

    setIsCreatingHousehold(true);

    try {
      await createHouseholdForUser({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email || t("hub.household.fallbackUser"),
        householdName,
        joinPassword: householdPassword,
      });

      await loadHousehold();
      setHouseholdMode(null);
      setHouseholdName("");
      setHouseholdPassword("");
      setInfoMessage(t("hub.household.info.created"));
    } catch (error: any) {
      setErrorMessage(error.message || t("hub.household.errors.create"));
    } finally {
      setIsCreatingHousehold(false);
    }
  };

  const handleJoinHousehold = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!joinIdentifier.trim()) {
      setErrorMessage(t("hub.household.errors.missingIdentifier"));
      return;
    }

    if (!joinPassword.trim()) {
      setErrorMessage(t("hub.household.errors.missingJoinPassword"));
      return;
    }

    setIsJoiningHousehold(true);

    try {
      await joinHouseholdForUser({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email || t("hub.household.fallbackUser"),
        identifier: joinIdentifier,
        joinPassword,
      });

      await loadHousehold();
      setHouseholdMode(null);
      setJoinIdentifier("");
      setJoinPassword("");
      setInfoMessage(t("hub.household.info.joined"));
    } catch (error: any) {
      setErrorMessage(error.message || t("hub.household.errors.join"));
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
        displayName: user.displayName || user.email || t("hub.household.fallbackUser"),
        inviteToken,
      });

      await loadHousehold();
      setHouseholdMode("join");
      setInviteToken("");
      window.history.replaceState({}, "", "/hub");
      setInfoMessage(t("hub.household.info.inviteAccepted"));
    } catch (error: any) {
      setErrorMessage(error.message || t("hub.household.errors.inviteLink"));
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
      setInfoMessage(t("hub.household.info.inviteCopied"));
    } catch (error: any) {
      setErrorMessage(error.message || t("hub.household.errors.inviteGenerate"));
    } finally {
      setIsGeneratingInviteLink(false);
    }
  };

  const handleCopyHouseholdId = async () => {
    if (!household) {
      return;
    }

    await navigator.clipboard.writeText(household.id);
    setInfoMessage(t("hub.household.info.idCopied"));
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
      setInfoMessage(t("hub.household.info.memberRemoved"));
    } catch (error: any) {
      setErrorMessage(error.message || t("hub.household.errors.removeMember"));
    } finally {
      setRemovingMemberUid(null);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!household || !isOwner) {
      return;
    }

    const confirmed = window.confirm(
      t("hub.household.confirmDelete"),
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
      setInfoMessage(t("hub.household.info.deleted"));
    } catch (error: any) {
      setErrorMessage(error.message || t("hub.household.errors.delete"));
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
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">{t("hub.household.kicker")}</p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">{t("hub.household.title")}</h2>
            <p className="mt-2 text-sm text-[#8d82a8]">
              {hasHousehold
                ? t("hub.household.withHouseholdDescription")
                : t("hub.household.withoutHouseholdDescription")}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-2xl border border-[#ece4f7] bg-[#fcfbff] p-3.5 text-[#7f68b7] transition active:scale-95"
            aria-label={t("hub.household.signOutAria")}
          >
            <LogOut size={18} />
          </button>
        </div>

        {isLoadingHousehold && (
          <div className="mt-5 rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
            <div className="flex items-center gap-2 text-sm text-[#6f628f]">
              <Loader2 size={16} className="animate-spin" />
              {t("hub.household.loading")}
            </div>
          </div>
        )}

        {!isLoadingHousehold && !hasHousehold && (
          <div className="mt-5 space-y-3">
            {inviteToken && (
              <div className="rounded-[1.4rem] border border-[#f2decf] bg-[#fffaf3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c08268]">{t("hub.household.inviteDetectedKicker")}</p>
                <p className="mt-2 text-sm text-[#6f628f]">
                  {t("hub.household.inviteDetectedDescription")}
                </p>
                <button
                  type="button"
                  onClick={handleJoinFromInviteLink}
                  disabled={isJoiningHousehold}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isJoiningHousehold ? <Loader2 size={17} className="animate-spin" /> : <Users size={17} />}
                  {t("hub.household.joinViaInvite")}
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
                  {t("hub.household.createCta")}
                </button>
                <button
                  type="button"
                  onClick={() => setHouseholdMode("join")}
                  className="rounded-2xl border border-[#ece4f7] bg-white px-4 py-3 text-sm font-semibold text-[#6f628f] transition active:scale-[0.98]"
                >
                  {t("hub.household.joinCta")}
                </button>
              </div>
            )}

            {householdMode === "create" && (
              <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.household.createSectionTitle")}</p>
                  <button
                    type="button"
                    onClick={() => setHouseholdMode(null)}
                    className="text-xs font-medium text-[#8d82a8]"
                  >
                    {t("hub.household.back")}
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("hub.household.householdNameLabel")}</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Home size={17} className="text-[#b19bd6]" />
                      <input
                        value={householdName}
                        onChange={(event) => setHouseholdName(event.target.value)}
                        placeholder={t("hub.household.householdNamePlaceholder")}
                        className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("hub.household.householdPasswordLabel")}</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Shield size={17} className="text-[#b19bd6]" />
                      <input
                        type="password"
                        value={householdPassword}
                        onChange={(event) => setHouseholdPassword(event.target.value)}
                        placeholder={t("hub.household.householdPasswordPlaceholder")}
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
                    {t("hub.household.createMyHousehold")}
                  </button>
                </div>
              </div>
            )}

            {householdMode === "join" && (
              <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.household.joinSectionTitle")}</p>
                  <button
                    type="button"
                    onClick={() => setHouseholdMode(null)}
                    className="text-xs font-medium text-[#8d82a8]"
                  >
                    {t("hub.household.back")}
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("hub.household.identifierLabel")}</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Users size={17} className="text-[#b19bd6]" />
                      <input
                        value={joinIdentifier}
                        onChange={(event) => setJoinIdentifier(event.target.value)}
                        placeholder={t("hub.household.identifierPlaceholder")}
                        className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("hub.household.householdPasswordLabel")}</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-white px-4 py-3">
                      <Shield size={17} className="text-[#b19bd6]" />
                      <input
                        type="password"
                        value={joinPassword}
                        onChange={(event) => setJoinPassword(event.target.value)}
                        placeholder={t("hub.household.joinPasswordPlaceholder")}
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
                    {t("hub.household.joinThisHousehold")}
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.household.householdNameLabel")}</p>
              <p className="mt-2 text-base font-semibold text-[#4b3d6d]">{household.name}</p>
            </div>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.household.householdIdLabel")}</p>
                  <p className="mt-2 break-all text-base font-semibold text-[#4b3d6d]">{household.id}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHouseholdId}
                  className="rounded-xl border border-[#ece4f7] bg-white p-2 text-[#7f68b7]"
                  aria-label={t("hub.household.copyIdAria")}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.household.inviteCodeLabel")}</p>
              <p className="mt-2 text-base font-semibold tracking-[0.18em] text-[#4b3d6d]">{household.inviteCode}</p>
              <p className="mt-2 text-xs text-[#9f93bc]">{t("hub.household.inviteCodeDescription")}</p>
            </div>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.household.membersLabel")}</p>
              <div className="mt-3 space-y-3">
                {household.members.map((member) => {
                  const canRemove = isOwner && member.uid !== household.ownerId;

                  return (
                    <div key={member.uid} className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece4f7] bg-white px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#4b3d6d]">{member.displayName || member.email}</p>
                        <p className="truncate text-xs text-[#8d82a8]">
                          {member.email}
                          {member.role === "owner" ? ` - ${t("hub.household.ownerBadge")}` : ""}
                        </p>
                      </div>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.uid)}
                          disabled={removingMemberUid === member.uid}
                          className="rounded-xl border border-[#f2d6dd] bg-[#fff6f7] p-2 text-[#b4536b] disabled:opacity-60"
                          aria-label={`${t("hub.household.removeMemberAriaPrefix")} ${member.displayName || member.email}`}
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
                  {t("hub.household.copyInviteLink")}
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
                  {t("hub.household.deleteHousehold")}
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
                ? t("hub.household.ownerHint")
                : t("hub.household.memberHint")}
            </p>

            <p className="text-xs text-[#9f93bc]">
              {t("hub.household.connectedAsPrefix")} {user.email || user.displayName || t("hub.household.genericUser")}.
            </p>
          </div>
        )}
    </section>
  );
}

function ProfileView({ user }: { user: User }) {
  const { t } = useI18n();
  const nameParts = user.displayName?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] || t("hub.profile.genericUser");
  const lastName = nameParts.slice(1).join(" ");

  return (
    <section className="space-y-4 rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">{t("hub.profile.kicker")}</p>
        <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">{t("hub.profile.title")}</h2>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.profile.firstName")}</p>
        <p className="mt-2 text-lg font-semibold text-[#4b3d6d]">{firstName}</p>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.profile.lastName")}</p>
        <p className="mt-2 text-lg font-semibold text-[#4b3d6d]">{lastName || "-"}</p>
      </div>

      <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b2a7c9]">{t("hub.profile.email")}</p>
        <p className="mt-2 break-all text-lg font-semibold text-[#4b3d6d]">{user.email || "-"}</p>
      </div>
    </section>
  );
}

function SettingsView({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const { t, locale, setLocale } = useI18n();
  const { themePreference, setThemePreference } = useTheme();
  const getDetectedTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
  const timezoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const timezoneLabelMap = useMemo(
    () =>
      Object.fromEntries(
        timezoneOptions.map((zone) => [zone, formatTimeZoneLabel(zone, t("hub.settings.utcUniversalLabel"))]),
      ) as Record<string, string>,
    [t, timezoneOptions],
  );
  const [telegramChatId, setTelegramChatId] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [pilluleEnabled, setPilluleEnabled] = useState(true);
  const [gameEnabled, setGameEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pilluleReminderHour, setPilluleReminderHour] = useState(20);
  const [pilluleReminderRepeatCount, setPilluleReminderRepeatCount] = useState(1);
  const [pilluleReminderRepeatIntervalMinutes, setPilluleReminderRepeatIntervalMinutes] = useState(60);
  const [webPushTokenCount, setWebPushTokenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTelegramLinking, setIsTelegramLinking] = useState(false);
  const [isPushConfiguring, setIsPushConfiguring] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  const getAuthToken = async () => {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error(t("hub.settings.errors.invalidSession"));
    }
    return token;
  };

  const loadSettings = async () => {
    const token = await getAuthToken();
    const response = await fetch("/api/user/notification-settings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || t("hub.settings.errors.load"));
    }

    const settings = data?.settings || {};
    setTelegramChatId(String(settings.telegramChatId || ""));
    setTimezone(String(settings.timezone || getDetectedTimezone()));
    setPilluleEnabled(settings.pilluleEnabled !== false);
    setGameEnabled(settings.gameEnabled !== false);
    setPushEnabled(settings.pushEnabled !== false);
    setPilluleReminderHour(Number.isFinite(settings.pilluleReminderHour) ? Number(settings.pilluleReminderHour) : 20);
    setPilluleReminderRepeatCount(
      Number.isFinite(settings.pilluleReminderRepeatCount)
        ? Number(settings.pilluleReminderRepeatCount)
        : 1,
    );
    setPilluleReminderRepeatIntervalMinutes(
      Number.isFinite(settings.pilluleReminderRepeatIntervalMinutes)
        ? Number(settings.pilluleReminderRepeatIntervalMinutes)
        : 60,
    );
    setWebPushTokenCount(Array.isArray(settings.webPushTokens) ? settings.webPushTokens.length : 0);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        await loadSettings();
      } catch (error: any) {
        if (!active) return;
        setErrorMessage(error?.message || t("hub.settings.errors.load"));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [t, user.uid]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const token = await getAuthToken();
      const normalizedPilluleHour = Math.min(23, Math.max(0, Math.trunc(Number(pilluleReminderHour) || 0)));
      const normalizedPilluleRepeatCount = Math.min(
        8,
        Math.max(1, Math.trunc(Number(pilluleReminderRepeatCount) || 1)),
      );
      const normalizedPilluleRepeatIntervalMinutes = Math.min(
        360,
        Math.max(5, Math.trunc(Number(pilluleReminderRepeatIntervalMinutes) || 60)),
      );

      const response = await fetch("/api/user/notification-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          telegramChatId: telegramChatId.trim(),
          timezone: timezone.trim(),
          pilluleEnabled,
          gameEnabled,
          pushEnabled,
          pilluleReminderHour: normalizedPilluleHour,
          pilluleReminderRepeatCount: normalizedPilluleRepeatCount,
          pilluleReminderRepeatIntervalMinutes: normalizedPilluleRepeatIntervalMinutes,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || t("hub.settings.errors.save"));
      }

      setPilluleReminderHour(normalizedPilluleHour);
      setPilluleReminderRepeatCount(normalizedPilluleRepeatCount);
      setPilluleReminderRepeatIntervalMinutes(normalizedPilluleRepeatIntervalMinutes);
      setSuccessMessage(t("hub.settings.info.saved"));
    } catch (error: any) {
      setErrorMessage(error?.message || t("hub.settings.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectTelegram = async () => {
    setIsTelegramLinking(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/telegram/connect-token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || t("hub.settings.errors.telegramLink"));
      }

      const url = String(data?.connectUrl || "");
      if (!url) {
        throw new Error(t("hub.settings.errors.telegramInvalidLink"));
      }

      window.open(url, "_blank", "noopener,noreferrer");
      setSuccessMessage(t("hub.settings.info.telegramOpened"));
    } catch (error: any) {
      setErrorMessage(error?.message || t("hub.settings.errors.telegramConnect"));
    } finally {
      setIsTelegramLinking(false);
    }
  };

  const handleEnablePushOnDevice = async () => {
    setIsPushConfiguring(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await requestBrowserPushToken();
      if (!result.supported) {
        setPushPermission("unsupported");
        throw new Error(result.reason);
      }

      setPushPermission(result.permission);
      if (result.permission !== "granted") {
        throw new Error(t("hub.settings.errors.pushPermissionDenied"));
      }

      if (!result.token) {
        throw new Error(result.reason || t("hub.settings.errors.pushTokenMissing"));
      }

      const token = await getAuthToken();
      const response = await fetch("/api/user/push-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pushToken: result.token,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || t("hub.settings.errors.pushSaveToken"));
      }

      localStorage.setItem("harmohome_push_token", result.token);
      await loadSettings();
      setSuccessMessage(t("hub.settings.info.pushEnabledDevice"));
    } catch (error: any) {
      setErrorMessage(error?.message || t("hub.settings.errors.pushEnableDevice"));
    } finally {
      setIsPushConfiguring(false);
    }
  };

  const handleDisablePushOnDevice = async () => {
    setIsPushConfiguring(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const savedToken = localStorage.getItem("harmohome_push_token");
      if (!savedToken) {
        throw new Error(t("hub.settings.errors.pushNoLocalToken"));
      }

      const token = await getAuthToken();
      const response = await fetch("/api/user/push-token", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pushToken: savedToken,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || t("hub.settings.errors.pushDeleteToken"));
      }

      localStorage.removeItem("harmohome_push_token");
      await loadSettings();
      setSuccessMessage(t("hub.settings.info.pushDisabledDevice"));
    } catch (error: any) {
      setErrorMessage(error?.message || t("hub.settings.errors.pushDisableDevice"));
    } finally {
      setIsPushConfiguring(false);
    }
  };

  const applyBrowserTimezone = () => {
    const nextZone = getDetectedTimezone();
    if (nextZone) {
      setTimezone(nextZone);
    }
  };

  const handleLocaleChange = (value: string) => {
    setLocale(value === "en" ? "en" : "fr");
  };

  const handleThemePreferenceChange = (value: string) => {
    if (value === "light" || value === "dark" || value === "system") {
      setThemePreference(value);
      return;
    }
    setThemePreference("system");
  };

  const pushPermissionLabel =
    pushPermission === "granted"
      ? t("hub.settings.pushPermission.granted")
      : pushPermission === "denied"
        ? t("hub.settings.pushPermission.denied")
        : pushPermission === "default"
          ? t("hub.settings.pushPermission.default")
          : t("hub.settings.pushPermission.unsupported");

  return (
    <section className="space-y-4 rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">{t("hub.settings.kicker")}</p>
        <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">{t("hub.settings.title")}</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
          <p className="text-sm text-[#6f628f]">
            {t("hub.settings.intro")}
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("common.language")}</span>
          <select
            value={locale}
            onChange={(event) => handleLocaleChange(event.target.value)}
            className="w-full rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 text-[15px] text-[#4c1d95] outline-none"
          >
            <option value="fr">{t("common.french")}</option>
            <option value="en">{t("common.english")}</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("common.theme")}</span>
          <select
            value={themePreference}
            onChange={(event) => handleThemePreferenceChange(event.target.value)}
            className="w-full rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 text-[15px] text-[#4c1d95] outline-none"
          >
            <option value="light">{t("common.light")}</option>
            <option value="dark">{t("common.dark")}</option>
            <option value="system">{t("common.system")}</option>
          </select>
        </label>

        {isLoading ? (
          <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4 text-sm text-[#6f628f]">
            {t("hub.settings.loading")}
          </div>
        ) : (
          <>
            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-sm font-semibold text-[#4b3d6d]">{t("hub.settings.telegram.title")}</p>
              <p className="mt-1 text-xs text-[#8d82a8]">
                {t("hub.settings.telegram.description")}
              </p>
              <button
                type="button"
                onClick={handleConnectTelegram}
                disabled={isTelegramLinking}
                className="mt-3 w-full rounded-2xl bg-[#ef9a79] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                {isTelegramLinking ? t("hub.settings.telegram.opening") : t("hub.settings.telegram.connect")}
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("hub.settings.telegram.chatIdLabel")}</span>
              <input
                value={telegramChatId}
                onChange={(event) => setTelegramChatId(event.target.value)}
                placeholder={t("hub.settings.telegram.chatIdPlaceholder")}
                className="w-full rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
              />
            </label>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-sm font-semibold text-[#4b3d6d]">{t("hub.settings.device.title")}</p>
              <p className="mt-1 text-xs text-[#8d82a8]">
                {t("hub.settings.device.permissionPrefix")} {pushPermissionLabel}. {t("hub.settings.device.tokenCountPrefix")} {webPushTokenCount}.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleEnablePushOnDevice}
                  disabled={isPushConfiguring}
                  className="rounded-2xl bg-[#8d7ac6] px-3 py-2.5 text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
                >
                  {t("hub.settings.device.enableDevice")}
                </button>
                <button
                  type="button"
                  onClick={handleDisablePushOnDevice}
                  disabled={isPushConfiguring}
                  className="rounded-2xl border border-[#ece4f7] bg-white px-3 py-2.5 text-xs font-semibold text-[#6f628f] transition active:scale-[0.98] disabled:opacity-60"
                >
                  {t("hub.settings.device.disableDevice")}
                </button>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{t("hub.settings.timezoneLabel")}</span>
              <div className="flex gap-2">
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
                >
                  {!timezoneOptions.includes(timezone) && timezone ? (
                    <option value={timezone}>{formatTimeZoneLabel(timezone)}</option>
                  ) : null}
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {timezoneLabelMap[zone] || zone}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyBrowserTimezone}
                  className="rounded-2xl border border-[#ece4f7] bg-white px-3 py-2 text-xs font-semibold text-[#6f628f] transition active:scale-[0.98]"
                >
                  {t("hub.settings.detect")}
                </button>
              </div>
            </label>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-sm font-semibold text-[#4b3d6d]">{t("hub.settings.pilluleReminder.title")}</p>
              <p className="mt-1 text-xs text-[#8d82a8]">
                {t("hub.settings.pilluleReminder.description")}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#6f628f]">{t("hub.settings.pilluleReminder.startHour")}</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={pilluleReminderHour}
                    onChange={(event) => setPilluleReminderHour(Number(event.target.value))}
                    className="w-full rounded-2xl border border-[#ece4f7] bg-white px-3 py-2.5 text-sm text-[#4c1d95] outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#6f628f]">{t("hub.settings.pilluleReminder.repeatCount")}</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={pilluleReminderRepeatCount}
                    onChange={(event) => setPilluleReminderRepeatCount(Number(event.target.value))}
                    className="w-full rounded-2xl border border-[#ece4f7] bg-white px-3 py-2.5 text-sm text-[#4c1d95] outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#6f628f]">{t("hub.settings.pilluleReminder.intervalMinutes")}</span>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    step={5}
                    value={pilluleReminderRepeatIntervalMinutes}
                    onChange={(event) => setPilluleReminderRepeatIntervalMinutes(Number(event.target.value))}
                    className="w-full rounded-2xl border border-[#ece4f7] bg-white px-3 py-2.5 text-sm text-[#4c1d95] outline-none"
                  />
                </label>
              </div>

              <p className="mt-2 text-[11px] text-[#8d82a8]">
                {t("hub.settings.pilluleReminder.example")}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <p className="text-sm font-semibold text-[#4b3d6d]">{t("hub.settings.gameReminder.title")}</p>
              <p className="mt-1 text-xs text-[#8d82a8]">
                {t("hub.settings.gameReminder.description")}
              </p>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3">
              <span className="text-sm font-medium text-[#6f628f]">{t("hub.settings.toggles.pilluleEnabled")}</span>
              <input
                type="checkbox"
                checked={pilluleEnabled}
                onChange={(event) => setPilluleEnabled(event.target.checked)}
                className="h-4 w-4 accent-[#ef9a79]"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3">
              <span className="text-sm font-medium text-[#6f628f]">{t("hub.settings.toggles.gameEnabled")}</span>
              <input
                type="checkbox"
                checked={gameEnabled}
                onChange={(event) => setGameEnabled(event.target.checked)}
                className="h-4 w-4 accent-[#ef9a79]"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3">
              <span className="text-sm font-medium text-[#6f628f]">{t("hub.settings.toggles.pushEnabled")}</span>
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(event) => setPushEnabled(event.target.checked)}
                className="h-4 w-4 accent-[#8d7ac6]"
              />
            </label>
          </>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-[#f5d1d8] bg-[#fff6f7] px-4 py-2.5 text-sm text-[#b4536b]">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-[#f4dec7] bg-[#fffaf3] px-4 py-2.5 text-sm text-[#a36a40]">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isSaving}
          className="w-full rounded-2xl bg-[#8d7ac6] px-5 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {isSaving ? t("hub.settings.saving") : t("hub.settings.save")}
        </button>
      </form>

      <button
        onClick={onSignOut}
        className="w-full rounded-2xl bg-[#ef9a79] px-5 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]"
      >
        {t("hub.settings.signOut")}
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
      <p className="text-[1.05rem] font-black text-[#4b3d6d] dark:text-[#f0ebff]">{title}</p>
      <p className="mt-2 text-sm text-[#6f628f] dark:text-[#b9b2db]">{subtitle}</p>
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

