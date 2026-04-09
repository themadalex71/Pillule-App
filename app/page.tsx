"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome, Lock, Mail, type LucideIcon } from "lucide-react";
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

function BardBaronMark() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#efe4d8] bg-white">
        <span className="text-sm font-black tracking-[0.16em] text-[#8d7ac6]">BB</span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b2a7c9]">Powered By</p>
        <p className="mt-0.5 text-xs font-semibold text-[#6f628f]">BardBaron</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoginLoadingScreen />}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
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
      setErrorMessage(error.message || "Connexion Google impossible.");
    });

    const unsubscribe = onAuthStateChanged(auth, async (nextUser: User | null) => {
      if (nextUser && nextUser.emailVerified) {
        setAuthReady(true);
        router.replace("/hub");
        return;
      }

      if (nextUser && !nextUser.emailVerified) {
        await signOut(auth);
        setErrorMessage("Verifie ton adresse mail avant de te connecter.");
      }

      setAuthReady(true);
    });

    return () => {
      window.clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, [firebaseReady, router]);

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
      setErrorMessage("Renseigne ton email ou nom d'utilisateur et ton mot de passe.");
      return;
    }

    if (!firebaseReady) {
      setErrorMessage("Ajoute les variables Firebase dans .env.local avant de te connecter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      const credentials = await signInWithEmailAndPassword(auth, identifier.trim(), password);

      if (!credentials.user.emailVerified) {
        await signOut(auth);
        setErrorMessage("Verifie ton adresse mail avant de te connecter.");
        return;
      }

      router.push("/hub");
    } catch (error: any) {
      setErrorMessage(error.message || "Authentification impossible.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!identifier.trim()) {
      setErrorMessage("Renseigne d'abord ton email pour recevoir le lien de reinitialisation.");
      return;
    }

    if (!firebaseReady) {
      setErrorMessage("Ajoute les variables Firebase dans .env.local avant d'utiliser Firebase Auth.");
      return;
    }

    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), identifier.trim());
      setInfoMessage("Email de reinitialisation envoye.");
    } catch (error: any) {
      setErrorMessage(error.message || "Impossible d'envoyer l'email de reinitialisation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!firebaseReady) {
      setErrorMessage("Ajoute les variables Firebase dans .env.local avant d'utiliser Google.");
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

      await signInWithPopup(auth, provider);
      router.push("/hub");
    } catch (error: any) {
      setErrorMessage(error.message || "Connexion Google impossible.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  if (!authReady) {
    return <LoginLoadingScreen />;
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#fcf7f2] px-5 py-5 text-[#2e1065]">
      <div className="mx-auto flex h-[calc(100dvh-2.5rem)] w-full max-w-sm flex-col justify-between">
        <div className="pt-1">
          <HarmoHomeLogo />
        </div>

        <section className="rounded-[1.8rem] border border-[#eee5dc] bg-white px-4 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
          <h2 className="text-left text-[1.65rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">
            Connexion
          </h2>

          {!firebaseReady && (
            <div className="mt-3 rounded-2xl border border-[#f6d5c2] bg-[#fff8f3] px-4 py-3 text-sm text-[#9a5a39]">
              Configuration Firebase manquante. Ajoute les variables `NEXT_PUBLIC_FIREBASE_*` dans `.env.local`.
            </div>
          )}

          <form className="mt-4 space-y-3" onSubmit={handleEmailAuth}>
            <LoginField
              label="Mail / utilisateur"
              value={identifier}
              onChange={setIdentifier}
              placeholder="toi@harmohome.app"
              icon={Mail}
              autoComplete="email"
            />

            <LoginField
              label="Mot de passe"
              value={password}
              onChange={setPassword}
              placeholder="********"
              icon={Lock}
              type="password"
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between gap-3 pt-1 text-[13px]">
              <Link href="/signup" className="text-left font-medium text-[#7f68b7]">
                Creer compte
              </Link>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-right font-medium text-[#c08268]"
              >
                Mot de passe oublie ?
              </button>
            </div>

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#ef9a79] px-5 py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-60"
            >
              {isSubmitting ? "Patiente..." : "Se connecter"}
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-5 py-3.5 text-[15px] font-medium text-[#5e4e89] transition disabled:opacity-60"
            >
              <Chrome size={18} className="text-[#ef9a79]" />
              Connexion avec Google
            </button>
          </form>
        </section>

        <div className="flex justify-center pb-1">
          <BardBaronMark />
        </div>
      </div>
    </main>
  );
}

function LoginLoadingScreen() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#fcf7f2] text-[#4c1d95]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#efe5ff] border-t-[#ef9a79]" />
        <p className="text-sm text-[#6b21a8]">Connexion a HarmoHome...</p>
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
      <span className="mb-1.5 block text-sm font-medium text-[#6f628f]">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-[#ece4f7] bg-[#fcfbff] px-4 py-3">
        <Icon size={17} className="text-[#b19bd6]" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] text-[#4c1d95] outline-none placeholder:text-[#b9add7]"
          autoComplete={autoComplete}
        />
      </div>
    </label>
  );
}
