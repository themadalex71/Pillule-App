"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, User, UserRound } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useI18n } from "@/components/I18nProvider";

function HarmoHomeLogo({ tagline }: { tagline: string }) {
  return (
    <div className="text-center">
      <h1 className="text-[2.6rem] font-semibold tracking-[-0.05em] leading-none">
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

export default function SignUpPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<FirebaseUser | null>(null);
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

    getRedirectResult(auth).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [firebaseReady]);

  useEffect(() => {
    if (!infoMessage || !email.trim()) return;

    const timeout = window.setTimeout(() => {
      router.push(`/?email=${encodeURIComponent(email.trim())}`);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [email, infoMessage, router]);

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setErrorMessage(t("signup.requiredFields"));
      return;
    }

    if (!firebaseReady) {
      setErrorMessage(t("signup.firebaseBeforeCreate"));
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await updateProfile(credentials.user, {
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });

      await sendEmailVerification(credentials.user);
      await signOut(auth);

      setUser(null);
      setInfoMessage(t("signup.accountCreatedInfo"));
    } catch (error: any) {
      setErrorMessage(error.message || t("signup.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <main className="flex h-[100dvh] overflow-x-hidden items-center justify-center bg-[#fcf7f2] text-[#4c1d95] dark:bg-[#0f1020] dark:text-[#ece9ff]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#efe5ff] border-t-[#ef9a79] dark:border-[#2d2b4b] dark:border-t-[#ef9a79]" />
          <p className="text-sm text-[#6b21a8] dark:text-[#d8d2fb]">{t("signup.preparing")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#fcf7f2] px-5 py-5 text-[#2e1065] dark:bg-[#0f1020] dark:text-[#ece9ff]">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-sm flex-col justify-between">
        <div className="pt-1">
          <HarmoHomeLogo tagline={t("signup.tagline")} />
        </div>

        <section className="rounded-[1.8rem] border border-[#eee5dc] bg-white px-4 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)] dark:border-[#2a2944] dark:bg-[#1a1830] dark:shadow-[0_14px_32px_rgba(0,0,0,0.38)]">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ece4f7] bg-[#fcfbff] text-[#7f68b7] dark:border-[#3b375a] dark:bg-[#221f3d] dark:text-[#b9adff]"
              aria-label={t("signup.backToLoginAria")}
            >
              <ArrowLeft size={18} />
            </Link>
            <h2 className="text-left text-[1.65rem] font-semibold tracking-[-0.03em] text-[#4b3d6d] dark:text-[#f0ebff]">
              {t("signup.title")}
            </h2>
          </div>

          {!firebaseReady && (
            <div className="mt-3 rounded-2xl border border-[#f6d5c2] bg-[#fff8f3] px-4 py-3 text-sm text-[#9a5a39] dark:border-[#5e4a3f] dark:bg-[#2b2018] dark:text-[#f2c8a9]">
              {t("signup.missingFirebase")}
            </div>
          )}

          <form className="mt-4 space-y-3" onSubmit={handleCreateAccount}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#6f628f] dark:text-[#c8c0e9]">{t("signup.lastNameLabel")}</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 dark:border-[#3b375a] dark:bg-[#221f3d]">
                  <UserRound size={17} className="text-[#b19bd6] dark:text-[#a999e5]" />
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder={t("signup.lastNamePlaceholder")}
                    className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7] dark:text-[#f0ebff] dark:placeholder:text-[#887fb4]"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#6f628f] dark:text-[#c8c0e9]">{t("signup.firstNameLabel")}</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 dark:border-[#3b375a] dark:bg-[#221f3d]">
                  <UserRound size={17} className="text-[#b19bd6] dark:text-[#a999e5]" />
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder={t("signup.firstNamePlaceholder")}
                    className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7] dark:text-[#f0ebff] dark:placeholder:text-[#887fb4]"
                  />
                </div>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#6f628f] dark:text-[#c8c0e9]">{t("signup.emailLabel")}</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 dark:border-[#3b375a] dark:bg-[#221f3d]">
                <Mail size={17} className="text-[#b19bd6] dark:text-[#a999e5]" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("signup.emailPlaceholder")}
                  className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7] dark:text-[#f0ebff] dark:placeholder:text-[#887fb4]"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#6f628f] dark:text-[#c8c0e9]">{t("signup.passwordLabel")}</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 dark:border-[#3b375a] dark:bg-[#221f3d]">
                <Lock size={17} className="text-[#b19bd6] dark:text-[#a999e5]" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7] dark:text-[#f0ebff] dark:placeholder:text-[#887fb4]"
                  autoComplete="new-password"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#6f628f] dark:text-[#c8c0e9]">{t("signup.usernameLabel")}</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3 dark:border-[#3b375a] dark:bg-[#221f3d]">
                <User size={17} className="text-[#b19bd6] dark:text-[#a999e5]" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t("signup.usernamePlaceholder")}
                  className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7] dark:text-[#f0ebff] dark:placeholder:text-[#887fb4]"
                />
              </div>
            </label>

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
              {isSubmitting ? t("signup.submitPending") : t("signup.submit")}
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
