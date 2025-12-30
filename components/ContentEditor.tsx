// components/ContentEditor.tsx
'use client';
import { useState } from 'react';
import { Plus, Image as ImageIcon, Type, Check } from 'lucide-react';

export default function ContentEditor() {
  const [activeTab, setActiveTab] = useState<'zoom' | 'meme'>('zoom');
  const [newItem, setNewItem] = useState('');
  const [newMeme, setNewMeme] = useState({ name: '', url: '' });
  const [status, setStatus] = useState('');

  const handleAdd = async (type: string, data: any) => {
    setStatus('Envoi...');
    await fetch('/api/content', {
      method: 'POST',
      body: JSON.stringify({ gameId: type, item: data })
    });
    setStatus('Ajouté ! ✅');
    setNewItem('');
    setNewMeme({ name: '', url: '' });
    setTimeout(() => setStatus(''), 2000);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-100 max-w-md w-full">
      <h2 className="text-xl font-black mb-4 flex items-center gap-2">🛠️ La Fabrique</h2>
      
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('zoom')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'zoom' ? 'bg-white shadow' : 'text-gray-500'}`}
        >Zoom</button>
        <button 
          onClick={() => setActiveTab('meme')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'meme' ? 'bg-white shadow' : 'text-gray-500'}`}
        >Meme</button>
      </div>

      {activeTab === 'zoom' ? (
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase">Nouvelle mission</label>
          <input 
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Ex: Un truc qui pique..."
            className="w-full p-3 border rounded-xl"
          />
          <button 
            onClick={() => handleAdd('zoom', newItem)}
            className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Plus size={18}/> Ajouter au jeu
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase">Nouveau Template Meme</label>
          <input 
            placeholder="Nom du meme (ex: Drake)"
            value={newMeme.name}
            onChange={e => setNewMeme({...newMeme, name: e.target.value})}
            className="w-full p-3 border rounded-xl"
          />
          <input 
            placeholder="URL de l'image (direct link)"
            value={newMeme.url}
            onChange={e => setNewMeme({...newMeme, url: e.target.value})}
            className="w-full p-3 border rounded-xl"
          />
          <button 
            onClick={() => handleAdd('meme', newMeme)}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Plus size={18}/> Ajouter à la banque
          </button>
        </div>
      )}
      
      {status && <p className="mt-4 text-center text-sm font-bold text-green-600 animate-pulse">{status}</p>}
    </div>
  );
}