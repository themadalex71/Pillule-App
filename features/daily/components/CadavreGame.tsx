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

const AUTHOR_THEMES: AuthorTheme[] = [
  { chipClass: 'bg-rose-100 text-rose-700 border border-rose-200', partClass: 'bg-rose-100/80 text-rose-900' },
  { chipClass: 'bg-blue-100 text-blue-700 border border-blue-200', partClass: 'bg-blue-100/80 text-blue-900' },
  { chipClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200', partClass: 'bg-emerald-100/80 text-emerald-900' },
  { chipClass: 'bg-amber-100 text-amber-700 border border-amber-200', partClass: 'bg-amber-100/80 text-amber-900' },
  { chipClass: 'bg-violet-100 text-violet-700 border border-violet-200', partClass: 'bg-violet-100/80 text-violet-900' },
  { chipClass: 'bg-cyan-100 text-cyan-700 border border-cyan-200', partClass: 'bg-cyan-100/80 text-cyan-900' },
];

function getName(participantMap: Record<string, string>, id?: string | null) {
  if (!id) return 'Un membre';
  return participantMap[id] || `Membre ${id.slice(0, 6)}`;
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
  const { phase, stories = [], template, votes = {} } = session.sharedData;
  const [inputText, setInputText] = useState('');
  const orderedAuthorIds = getOrderedAuthorIds(session, stories);
  const authorThemeMap = buildAuthorThemeMap(orderedAuthorIds);

  useEffect(() => {
    setInputText('');
  }, [phase]);

  if (typeof phase === 'number') {
    const totalSteps = template?.steps?.length || 0;
    const currentStepConfig = template?.steps?.[phase];
    const myStory = stories.find((story: any) => story.authors?.[phase] === currentUserId);

    if (!myStory || !currentStepConfig) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc] animate-in zoom-in-95">
          <div className="bg-[#f3edf9] p-6 rounded-full text-[#8d7ac6] animate-bounce">
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
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc] animate-in zoom-in-95">
          <div className="bg-[#f3edf9] p-6 rounded-full text-[#8d7ac6] animate-bounce">
            <Check size={48} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase">C'est note !</h3>
            <p className="text-gray-500 mt-2 font-medium">En attente des autres membres...</p>
          </div>
          <div className="flex gap-2 justify-center mt-4 opacity-50">
            <div className="w-2 h-2 bg-[#b5a6d6] rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-[#b5a6d6] rounded-full animate-bounce delay-75" />
            <div className="w-2 h-2 bg-[#b5a6d6] rounded-full animate-bounce delay-150" />
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
              className={`flex-1 rounded-full transition-all duration-500 ${index <= phase ? 'bg-[#8d7ac6]' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="bg-[#8d7ac6] p-8 rounded-[2rem] text-white shadow-[0_12px_24px_rgba(141,122,198,0.35)] relative overflow-hidden">
          <BookOpen className="absolute -right-4 -bottom-4 text-[#b5a6d6] w-32 h-32 opacity-20 rotate-12" />
          <p className="font-bold uppercase text-[10px] tracking-widest mb-2 opacity-80">Ta mission :</p>
          <h2 className="text-2xl font-black leading-tight">{currentStepConfig.label}</h2>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc]">
          <textarea
            className="w-full h-32 p-4 text-lg font-medium text-gray-700 bg-[#fffdfa] rounded-2xl outline-none focus:ring-2 focus:ring-[#8d7ac6] resize-none placeholder:text-gray-300 placeholder:text-sm placeholder:italic"
            placeholder={currentStepConfig.placeholder}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
          />
        </div>

        <button
          onClick={() => onAction({ action: 'cadavre_submit_step', text: inputText })}
          disabled={!inputText.trim()}
          className="w-full bg-[#8d7ac6] text-white font-black py-5 rounded-[2rem] shadow-[0_12px_24px_rgba(141,122,198,0.35)] flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
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
        <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc] animate-in zoom-in-95">
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
          <div key={index} className="bg-white p-8 rounded-[2.5rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc] relative overflow-hidden group">
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
          className="w-full bg-[#4b3d6d] text-white font-black py-5 rounded-[2rem] shadow-[0_12px_24px_rgba(75,61,109,0.32)] flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all mt-4"
        >
          <Eye size={20} /> J'ai tout lu !
        </button>
      </div>
    );
  }

  return null;
}
