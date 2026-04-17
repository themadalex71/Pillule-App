"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome, Lock, Mail, Moon, Sun, type LucideIcon } from "lucide-react";
import {
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirebaseAuth,
  getGoogleProvider,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { useI18n } from "@/components/I18nProvider";
import { useTheme } from "@/components/ThemeProvider";

function HarmoHomeLogo({ tagline }: { tagline: string }) {
  return (
    <div className="text-center">
      <h1 className="text-[2.6rem] font-semibold leading-none tracking-[-0.05em]">
        <span className="text-[#8d7ac6]">Harmo</span>
        <span className="text-[#ef9a79]">Home</span>
      </h1>
      <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-5 text-[#8d82a8] dark:text-[#b9b2db]">
        {tagline}
      </p>
    </div>
  );
}

function BardBaronMark({ poweredByLabel }: { poweredByLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#efe4d8] bg-white dark:border-[#3b375b] dark:bg-[#17152b]">
        <span className="text-sm font-black tracking-[0.16em] text-[#8d7ac6]">BB</span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b2a7c9] dark:text-[#8f88b5]">{poweredByLabel}</p>
        <p className="mt-0.5 text-xs font-semibold text-[#6f628f] dark:text-[#cec8f4]">BardBaron</p>
      </div>
    </div>
  );
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

export default function Home() {
  return (
    <Suspense fallback={<LoginLoadingScreen />}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const { t } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseReady) {
      setAuthReady(true);
      return;
    }

    const auth = getFirebaseAuth();
    const safetyTimeout = window.setTimeout(() => {
      setAuthReady(true);
    }, 4000);

    getRedirectResult(auth).catch((error) => {
      setErrorMessage(error.message || t("login.googleError"));
    });

    const unsubscribe = onAuthStateChanged(auth, async (nextUser: User | null) => {
      if (nextUser && nextUser.emailVerified) {
        setAuthReady(true);
        try {
          await bootstrapVerifiedUserProfile(nextUser);
        } catch (error: any) {
          console.error("bootstrap profile error:", error);
          setInfoMessage(t("login.profileBootstrapInfo"));
        }
        router.replace("/hub");
        return;
      }

      if (nextUser && !nextUser.emailVerified) {
        await signOut(auth);
        setErrorMessage(t("login.verifyEmailBeforeLogin"));
      }

      setAuthReady(true);
    });

    return () => {
      window.clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, [firebaseReady, router, t]);

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setIdentifier(emailFromQuery);
    }
  }, [searchParams]);

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage(t("login.missingCredentials"));
      return;
    }

    if (!firebaseReady) {
      setErrorMessage(t("login.firebaseBeforeLogin"));
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      const credentials = await signInWithEmailAndPassword(auth, identifier.trim(), password);

      if (!credentials.user.emailVerified) {
        await signOut(auth);
        setErrorMessage(t("login.verifyEmailBeforeLogin"));
        return;
      }

      try {
        await bootstrapVerifiedUserProfile(credentials.user);
      } catch (error: any) {
        console.error("bootstrap profile error:", error);
        setInfoMessage(t("login.profileBootstrapInfo"));
      }

      router.push("/hub");
    } catch (error: any) {
      setErrorMessage(error.message || t("login.authFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!identifier.trim()) {
      setErrorMessage(t("login.forgotNeedEmail"));
      return;
    }

    if (!firebaseReady) {
      setErrorMessage(t("login.firebaseBeforeReset"));
      return;
    }

    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), identifier.trim());
      setInfoMessage(t("login.resetSent"));
    } catch (error: any) {
      setErrorMessage(error.message || t("login.resetFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!firebaseReady) {
      setErrorMessage(t("login.firebaseBeforeGoogle"));
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider();

      if (window.innerWidth < 768) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const credentials = await signInWithPopup(auth, provider);
      try {
        await bootstrapVerifiedUserProfile(credentials.user);
      } catch (error: any) {
        console.error("bootstrap profile error:", error);
        setInfoMessage(t("login.profileBootstrapInfo"));
      }
      router.push("/hub");
    } catch (error: any) {
      setErrorMessage(error.message || t("login.googleError"));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  if (!authReady) {
    return <LoginLoadingScreen />;
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#fcf7f2] px-5 py-5 text-[#2e1065] dark:bg-[#0f1020] dark:text-[#ece9ff]">
      <div className="mx-auto flex h-[calc(100dvh-2.5rem)] w-full max-w-sm flex-col justify-between">
        <div className="pt-1">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("common.toggleTheme")}
              className="inline-flex items-center gap-2 rounded-full border border-[#ece4f7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5e4e89] transition active:scale-[0.98] dark:border-[#3a3659] dark:bg-[#17152b] dark:text-[#d7cffc]"
            >
              {isDark ? <Moon size={14} className="text-[#c8bdff]" /> : <Sun size={14} className="text-[#ef9a79]" />}
              <span>
                {t("common.theme")}: {isDark ? t("common.dark") : t("common.light")}
              </span>
            </button>
          </div>
          <HarmoHomeLogo tagline={t("login.tagline")} />
        </div>

        <section className="rounded-[1.8rem] border border-[#eee5dc] bg-white px-4 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)] dark:border-[#2a2944] dark:bg-[#1a1830] dark:shadow-[0_14px_32px_rgba(0,0,0,0.38)]">
          <h2 className="text-left text-[1.65rem] font-semibold tracking-[-0.03em] text-[#4b3d6d] dark:text-[#f0ebff]">
            {t("login.title")}
          </h2>

          {!firebaseReady && (
            <div className="mt-3 rounded-2xl border border-[#f6d5c2] bg-[#fff8f3] px-4 py-3 text-sm text-[#9a5a39] dark:border-[#5e4a3f] dark:bg-[#2b2018] dark:text-[#f2c8a9]">
              {t("login.missingFirebase")}
            </div>
          )}

          <form className="mt-4 space-y-3" onSubmit={handleEmailAuth}>
            <LoginField
              label={t("login.identifier")}
              value={identifier}
              onChange={setIdentifier}
              placeholder={t("login.identifierPlaceholder")}
              icon={Mail}
              autoComplete="email"
            />

            <LoginField
              label={t("login.password")}
              value={password}
              onChange={setPassword}
              placeholder="********"
              icon={Lock}
              type="password"
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between gap-3 pt-1 text-[13px]">
              <Link href="/signup" className="text-left font-medium text-[#7f68b7] dark:text-[#b9adff]">
                {t("login.createAccount")}
              </Link>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-right font-medium text-[#c08268] dark:text-[#f1b79f]"
              >
                {t("login.forgotPassword")}
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-[#f5d1d8] bg-[#fff6f7] px-4 py-2.5 text-sm text-[#b4536b] dark:border-[#693149] dark:bg-[#2a1420] dark:text-[#f2a6be]">
                {errorMessage}
              </div>
            )}

            {infoMessage && (
              <div className="rounded-2xl border border-[#f4dec7] bg-[#fffaf3] px-4 py-2.5 text-sm text-[#a36a40] dark:border-[#5c4a2f] dark:bg-[#2a2418] dark:text-[#f0c995]">
                {infoMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#ef9a79] px-5 py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-60"
            >
              {isSubmitting ? t("login.submitPending") : t("login.submit")}
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-5 py-3.5 text-[15px] font-medium text-[#5e4e89] transition disabled:opacity-60 dark:border-[#3b375a] dark:bg-[#221f3d] dark:text-[#e0dbfb]"
            >
              <Chrome size={18} className="text-[#ef9a79]" />
              {t("login.google")}
            </button>
          </form>
        </section>

        <div className="flex justify-center pb-1">
          <BardBaronMark poweredByLabel={t("common.poweredBy")} />
        </div>
      </div>
    </main>
  );
}

function LoginLoadingScreen() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#fcf7f2] text-[#4c1d95] dark:bg-[#0f1020] dark:text-[#ece9ff]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#efe5ff] border-t-[#ef9a79] dark:border-[#2d2b4b] dark:border-t-[#ef9a79]" />
        <p className="text-sm text-[#6b21a8] dark:text-[#d8d2fb]">{t("login.opening")}</p>
      </div>
    </main>
  );
}

function LoginField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#6f628f] dark:text-[#c8c0e9]">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 dark:border-[#3b375a] dark:bg-[#221f3d]">
        <Icon size={17} className="text-[#b19bd6] dark:text-[#a999e5]" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7] dark:text-[#f0ebff] dark:placeholder:text-[#887fb4]"
          autoComplete={autoComplete}
        />
      </div>
    </label>
  );
}
