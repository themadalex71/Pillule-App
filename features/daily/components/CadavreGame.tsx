'use client';

import { useEffect, useState } from 'react';
import { Send, BookOpen, Eye, Check } from 'lucide-react';

type Props = {
  session: any;
  currentUserId: string;
  participantMap: Record<string, string>;
  onAction: (payload: any) => void;
};

type AuthorTheme = {
  chipClass: string;
  partClass: string;
};

type CadavreStepGuide = {
  stepIndex: number;
  tone: string;
  twist: string;
  bonusWord: string;
  style: string;
  hook: string;
};

type CadavreInspiration = {
  theme: string;
  place: string;
  hook: string;
  stepGuides: CadavreStepGuide[];
};

const AUTHOR_THEMES: AuthorTheme[] = [
  { chipClass: 'bg-rose-100 text-rose-700 border border-rose-200', partClass: 'bg-rose-100/80 text-rose-900' },
  { chipClass: 'bg-blue-100 text-blue-700 border border-blue-200', partClass: 'bg-blue-100/80 text-blue-900' },
  { chipClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200', partClass: 'bg-emerald-100/80 text-emerald-900' },
  { chipClass: 'bg-amber-100 text-amber-700 border border-amber-200', partClass: 'bg-amber-100/80 text-amber-900' },
  { chipClass: 'bg-violet-100 text-violet-700 border border-violet-200', partClass: 'bg-violet-100/80 text-violet-900' },
  { chipClass: 'bg-cyan-100 text-cyan-700 border border-cyan-200', partClass: 'bg-cyan-100/80 text-cyan-900' },
];

const IDEA_STARTERS = [
  'Imagine',
  'Et si',
  'Version rapide:',
  'Piste absurde:',
  'Proposition:',
];

const IDEA_FINISHERS = [
  'ajoutant un detail inattendu.',
  'en exagerant un peu la scene.',
  'avec un contraste complet.',
  'en restant tres simple.',
  'en glissant une reference du quotidien.',
];

function getName(participantMap: Record<string, string>, id?: string | null) {
  if (!id) return 'Un membre';
  return participantMap[id] || `Membre ${id.slice(0, 6)}`;
}

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeStepGuide(raw: any, stepIndex: number): CadavreStepGuide {
  const tone = typeof raw?.tone === 'string' && raw.tone.trim() ? raw.tone : 'absurde';
  const twist =
    typeof raw?.twist === 'string' && raw.twist.trim() ? raw.twist : 'ajoute un detail inattendu';
  const bonusWord =
    typeof raw?.bonusWord === 'string' && raw.bonusWord.trim() ? raw.bonusWord : 'surprise';
  const style = typeof raw?.style === 'string' && raw.style.trim() ? raw.style : 'court et percutant';
  const hook =
    typeof raw?.hook === 'string' && raw.hook.trim()
      ? raw.hook
      : `Etape ${stepIndex + 1}: ambiance ${tone}, style ${style}.`;

  return {
    stepIndex,
    tone,
    twist,
    bonusWord,
    style,
    hook,
  };
}

function normalizeCadavreInspiration(raw: any, stepsCount: number): CadavreInspiration {
  const theme = typeof raw?.theme === 'string' && raw.theme.trim() ? raw.theme : 'Une situation imprevisible';
  const place = typeof raw?.place === 'string' && raw.place.trim() ? raw.place : 'dans un lieu inconnu';
  const safeStepsCount = Math.max(1, Number(stepsCount) || 1);
  const hook = typeof raw?.hook === 'string' && raw.hook.trim() ? raw.hook : `${theme} ${place}`;
  const rawStepGuides = Array.isArray(raw?.stepGuides) ? raw.stepGuides : [];

  const stepGuides = Array.from({ length: safeStepsCount }).map((_, index) => {
    const source = rawStepGuides[index] || raw;
    return normalizeStepGuide(source, index);
  });

  return { theme, place, hook, stepGuides };
}

function buildIdeaHint(stepLabel: string, inspiration: CadavreInspiration, stepGuide: CadavreStepGuide) {
  const starter = randomFrom(IDEA_STARTERS);
  const finisher = randomFrom(IDEA_FINISHERS);

  return `${starter} ${inspiration.theme.toLowerCase()} ${inspiration.place}, pour "${stepLabel}", en mode ${stepGuide.tone}, avec "${stepGuide.twist}", mot "${stepGuide.bonusWord}", style ${stepGuide.style}, ${finisher}`;
}

function getOrderedAuthorIds(session: any, stories: any[]) {
  const fromSession = Array.isArray(session?.participants)
    ? session.participants
        .map((participant: any) => participant?.id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];

  if (fromSession.length > 0) {
    return fromSession;
  }

  const fromStories = Array.from(
    new Set(
      stories.flatMap((story: any) =>
        Array.isArray(story?.authors)
          ? story.authors.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
          : [],
      ),
    ),
  );

  return fromStories;
}

function buildAuthorThemeMap(authorIds: string[]) {
  const map: Record<string, AuthorTheme> = {};

  authorIds.forEach((authorId, index) => {
    map[authorId] = AUTHOR_THEMES[index % AUTHOR_THEMES.length];
  });

  return map;
}

export default function CadavreGame({ session, currentUserId, participantMap, onAction }: Props) {
  const { phase, stories = [], template, votes = {}, inspiration } = session.sharedData;
  const [inputText, setInputText] = useState('');
  const [ideaHint, setIdeaHint] = useState('');
  const orderedAuthorIds = getOrderedAuthorIds(session, stories);
  const authorThemeMap = buildAuthorThemeMap(orderedAuthorIds);
  const stepsCount = Array.isArray(template?.steps) ? template.steps.length : 1;
  const cadavreInspiration = normalizeCadavreInspiration(inspiration, stepsCount);

  useEffect(() => {
    setInputText('');
    setIdeaHint('');
  }, [phase]);

  if (typeof phase === 'number') {
    const totalSteps = template?.steps?.length || 0;
    const currentStepConfig = template?.steps?.[phase];
    const currentStepGuide =
      cadavreInspiration.stepGuides[phase] ||
      cadavreInspiration.stepGuides[phase % cadavreInspiration.stepGuides.length] ||
      normalizeStepGuide({}, phase);
    const myStory = stories.find((story: any) => story.authors?.[phase] === currentUserId);

    if (!myStory || !currentStepConfig) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-purple-100 p-6 rounded-full text-purple-600 animate-bounce">
            <BookOpen size={48} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase">En attente de ton tour</h3>
            <p className="text-gray-500 mt-2 font-medium">Les autres membres ecrivent leur etape.</p>
          </div>
        </div>
      );
    }

    if (myStory.parts?.[phase] !== null) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-purple-100 p-6 rounded-full text-purple-600 animate-bounce">
            <Check size={48} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase">C'est note !</h3>
            <p className="text-gray-500 mt-2 font-medium">En attente des autres membres...</p>
          </div>
          <div className="flex gap-2 justify-center mt-4 opacity-50">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75" />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{template.title}</span>
          <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">
            Etape {phase + 1}/{totalSteps}
          </span>
        </div>

        <div className="flex gap-1 mb-2 h-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`flex-1 rounded-full transition-all duration-500 ${index <= phase ? 'bg-purple-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="bg-purple-600 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
          <BookOpen className="absolute -right-4 -bottom-4 text-purple-500 w-32 h-32 opacity-20 rotate-12" />
          <p className="font-bold uppercase text-[10px] tracking-widest mb-2 opacity-80">Ta mission :</p>
          <h2 className="text-2xl font-black leading-tight">{currentStepConfig.label}</h2>
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-gray-100 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
            Fil rouge (theme fixe, carte evolutive)
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-1 rounded-full border border-rose-200">
              Theme: {cadavreInspiration.theme}
            </span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
              Lieu: {cadavreInspiration.place}
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
            Carte etape {phase + 1}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
              Ambiance: {currentStepGuide.tone}
            </span>
            <span className="text-[10px] font-bold bg-violet-50 text-violet-700 px-2 py-1 rounded-full border border-violet-200">
              Twist: {currentStepGuide.twist}
            </span>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
              Mot bonus: {currentStepGuide.bonusWord}
            </span>
            <span className="text-[10px] font-bold bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full border border-cyan-200">
              Style: {currentStepGuide.style}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-700">{currentStepGuide.hook}</p>
          <p className="text-xs font-medium text-gray-500">Base commune: {cadavreInspiration.hook}</p>
          <button
            type="button"
            onClick={() => setIdeaHint(buildIdeaHint(currentStepConfig.label, cadavreInspiration, currentStepGuide))}
            className="text-[11px] font-black uppercase tracking-[0.14em] bg-gray-900 text-white px-3 py-2 rounded-xl"
          >
            Donne-moi une piste
          </button>
          {ideaHint && <p className="text-sm font-medium text-gray-600 bg-gray-50 rounded-xl px-3 py-2">{ideaHint}</p>}
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
          <textarea
            className="w-full h-32 p-4 text-lg font-medium text-gray-700 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-gray-300 placeholder:text-sm placeholder:italic"
            placeholder={currentStepConfig.placeholder}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
          />
        </div>

        <button
          onClick={() => onAction({ action: 'cadavre_submit_step', text: inputText })}
          disabled={!inputText.trim()}
          className="w-full bg-purple-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          <Send size={20} /> Valider l'etape
        </button>
      </div>
    );
  }

  if (phase === 'VOTE') {
    const hasVoted = (votes?.[currentUserId] || []).length > 0;

    if (hasVoted) {
      return (
        <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl animate-in zoom-in-95">
          <div className="inline-block p-4 bg-green-100 rounded-full text-green-600 mb-4">
            <Check size={32} />
          </div>
          <h3 className="font-black text-xl mb-2 text-gray-800">Termine !</h3>
          <p className="text-gray-500 text-sm">Devoilement imminent...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in pb-10">
        <div className="text-center mb-6">
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">
            Termine !
          </span>
          <h2 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">Lecture</h2>
          <p className="text-gray-400 text-sm font-bold">Reconstitution de "{template.title}"</p>
        </div>

        {stories.map((story: any, index: number) => (
          <div key={index} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-gray-100 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase text-gray-400 tracking-widest">
              Histoire {story.id}
            </div>

            <div className="mt-6">
              <p className="text-xl leading-relaxed font-medium flex flex-wrap gap-2 text-gray-800">
                {(story.parts || []).map((part: any, partIndex: number) => {
                  const authorId = story.authors?.[partIndex];
                  const theme = authorId ? authorThemeMap[authorId] : null;

                  return (
                    <span
                      key={`${story.id}_${partIndex}`}
                      className={`inline-block rounded-lg px-2 py-1 ${
                        theme?.partClass || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {String(part || '').trim() || '...'}
                    </span>
                  );
                })}
                <span className="inline-flex items-end text-gray-500">.</span>
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
              {(story.authors || []).map((authorId: string, authorIndex: number) => {
                const theme = authorThemeMap[authorId];

                return (
                <span
                  key={authorIndex}
                  className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase ${
                    theme?.chipClass || 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {getName(participantMap, authorId)}
                </span>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={() => onAction({ action: 'cadavre_vote', score: 5 })}
          className="w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all mt-4"
        >
          <Eye size={20} /> J'ai tout lu !
        </button>
      </div>
    );
  }

  return null;
}
