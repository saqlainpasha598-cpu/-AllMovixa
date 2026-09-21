import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  ThumbsUp,
  Film,
  Tv,
  Globe,
  MessageSquarePlus,
  CheckCircle2,
  Clock,
  Search,
  Check,
  User,
  X,
  Languages,
} from 'lucide-react';
import { ContentRequest } from '../types';

const STORAGE_KEY = 'stream_public_content_requests_v1';

const INITIAL_REQUESTS: ContentRequest[] = [
  {
    id: 'req-1',
    title: 'Demon Slayer: Kimetsu no Yaiba - Hashira Training Arc',
    contentType: 'anime',
    language: 'Hindi & Japanese (Sub/Dub)',
    description: 'Please upload the latest season in HD with Hindi Dubbing if possible.',
    requesterName: 'Rahul Sharma',
    createdAt: Date.now() - 3600000 * 5,
    status: 'approved',
    votes: 42,
  },
  {
    id: 'req-2',
    title: 'Interstellar (2014)',
    contentType: 'movie',
    language: 'Hindi / English (Dual Audio)',
    description: 'Masterpiece sci-fi movie in 1080p dual audio.',
    requesterName: 'Ayesha Khan',
    createdAt: Date.now() - 3600000 * 24,
    status: 'completed',
    votes: 89,
  },
  {
    id: 'req-3',
    title: 'Squid Game Season 2',
    contentType: 'drama',
    language: 'Multi-Language (English/Hindi/Korean)',
    description: 'Looking forward to season 2 release uploads.',
    requesterName: 'Saqlain Pasha',
    createdAt: Date.now() - 3600000 * 12,
    status: 'pending',
    votes: 67,
  },
];

export const ContentRequestsPage: React.FC<{
  onBackToPlayer: () => void;
}> = ({ onBackToPlayer }) => {
  const [requests, setRequests] = useState<ContentRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_REQUESTS;
  });

  const [activeFilterType, setActiveFilterType] = useState<string>('all');
  const [activeFilterLang, setActiveFilterLang] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Request Form state
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'movie' | 'drama' | 'anime' | 'series'>('anime');
  const [language, setLanguage] = useState('Hindi & English (Dual Audio)');
  const [customLanguage, setCustomLanguage] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [description, setDescription] = useState('');
  const [votedIds, setVotedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('stream_voted_requests_v1');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch (e) {
      console.error(e);
    }
  }, [requests]);

  useEffect(() => {
    try {
      localStorage.setItem('stream_voted_requests_v1', JSON.stringify(Array.from(votedIds)));
    } catch (e) {
      console.error(e);
    }
  }, [votedIds]);

  const handleVote = (id: string) => {
    if (votedIds.has(id)) {
      // Remove vote
      const newVoted = new Set(votedIds);
      newVoted.delete(id);
      setVotedIds(newVoted);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, votes: Math.max(0, r.votes - 1) } : r))
      );
    } else {
      // Add vote
      const newVoted = new Set(votedIds);
      newVoted.add(id);
      setVotedIds(newVoted);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, votes: r.votes + 1 } : r))
      );
    }
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalLang = language === 'Other' ? customLanguage.trim() || 'Multi-Language' : language;

    const newReq: ContentRequest = {
      id: `req-${Date.now()}`,
      title: title.trim(),
      contentType,
      language: finalLang,
      description: description.trim(),
      requesterName: requesterName.trim() || 'Anonymous Viewer',
      createdAt: Date.now(),
      status: 'pending',
      votes: 1,
    };

    // Auto vote your own request
    setVotedIds((prev) => new Set(prev).add(newReq.id));
    setRequests((prev) => [newReq, ...prev]);

    // Reset
    setTitle('');
    setDescription('');
    setRequesterName('');
    setShowAddModal(false);
  };

  const filteredRequests = requests.filter((r) => {
    const matchesType = activeFilterType === 'all' || r.contentType === activeFilterType;
    const matchesLang =
      activeFilterLang === 'all' ||
      r.language.toLowerCase().includes(activeFilterLang.toLowerCase());
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesLang && matchesSearch;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-[#141826] via-[#101522] to-[#0d101a] border border-[#222b46] rounded-2xl p-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-xs font-bold tracking-wide uppercase">
            <Languages className="w-3.5 h-3.5" />
            <span>Public Content & Language Requests</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            What should we upload next?
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
            Request movies, TV dramas, or anime in Hindi, English, Japanese, or multi-language. Vote for requests so admins know what to upload next!
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-950/50 hover:scale-105 transition-all shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Request New Content</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e121e] border border-[#20283e] rounded-xl p-3 shadow-md">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'anime', label: 'Anime' },
            { id: 'drama', label: 'Dramas' },
            { id: 'movie', label: 'Movies' },
            { id: 'series', label: 'Series' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilterType === tab.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-[#151a2b] text-gray-400 hover:text-white hover:bg-[#1d253a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Language Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              className="w-full bg-[#141928] border border-[#232d47] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <select
            value={activeFilterLang}
            onChange={(e) => setActiveFilterLang(e.target.value)}
            className="bg-[#141928] border border-[#232d47] rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Languages</option>
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
            <option value="japanese">Japanese</option>
            <option value="dual">Dual Audio</option>
            <option value="multi">Multi-Language</option>
          </select>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRequests.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-[#0e121e] border border-[#20283e] rounded-2xl">
            <Film className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-gray-300">No requests found</p>
            <p className="text-xs text-gray-500 mt-1">Be the first to request a show, movie, or anime!</p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const hasVoted = votedIds.has(req.id);
            return (
              <div
                key={req.id}
                className="bg-[#0e121e] border border-[#20283e] hover:border-red-500/40 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Top row: Type badge & status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#161d30] border border-[#26314f] text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        {req.contentType === 'anime' ? (
                          <Tv className="w-3 h-3" />
                        ) : (
                          <Film className="w-3 h-3" />
                        )}
                        <span>{req.contentType}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[10px] font-semibold flex items-center gap-1">
                        <Globe className="w-3 h-3 text-red-400" />
                        <span>{req.language}</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        req.status === 'completed'
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : req.status === 'approved'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {req.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Uploaded</span>
                        </>
                      ) : req.status === 'approved' ? (
                        <>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>In Progress</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-2.5 h-2.5" />
                          <span>Pending Vote</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors mb-1.5">
                    {req.title}
                  </h3>

                  {/* Description */}
                  {req.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                      {req.description}
                    </p>
                  )}
                </div>

                {/* Footer: Requester info & Vote Button */}
                <div className="pt-3 border-t border-[#1a2238] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                    <User className="w-3 h-3 text-gray-400" />
                    <span>{req.requesterName || 'Viewer'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVote(req.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm ${
                      hasVoted
                        ? 'bg-red-600 text-white shadow-red-950/50 scale-105'
                        : 'bg-[#151b2c] hover:bg-[#1f273f] text-gray-300 border border-[#26314f]'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                    <span>{req.votes}</span>
                    <span className="hidden xs:inline">{hasVoted ? 'Voted' : 'Vote'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#121624] border border-[#252f4a] rounded-2xl p-6 shadow-2xl text-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#202940] mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-red-500" />
                Request Movie, Drama or Anime
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Show / Movie / Anime Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Attack on Titan, Pathaan, etc."
                  className="w-full bg-[#171d2e] border border-[#2a3654] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full bg-[#171d2e] border border-[#2a3654] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="anime">Anime</option>
                    <option value="drama">Drama</option>
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#171d2e] border border-[#2a3654] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Hindi & English (Dual Audio)">Hindi & English (Dual Audio)</option>
                    <option value="Hindi Dubbed">Hindi Dubbed</option>
                    <option value="English Sub/Dub">English Sub/Dub</option>
                    <option value="Japanese with Subtitles">Japanese with Subtitles</option>
                    <option value="Multi-Language (Sub/Dub)">Multi-Language (Sub/Dub)</option>
                    <option value="Other">Other Language...</option>
                  </select>
                </div>
              </div>

              {language === 'Other' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Specify Language / Audio
                  </label>
                  <input
                    type="text"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    placeholder="e.g. Urdu, Spanish, Korean Dual Audio"
                    className="w-full bg-[#171d2e] border border-[#2a3654] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. Ali Khan"
                  className="w-full bg-[#171d2e] border border-[#2a3654] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Additional Details / Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mention season number, resolution, or special requirements..."
                  className="w-full bg-[#171d2e] border border-[#2a3654] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md shadow-red-950/50 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
