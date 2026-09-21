import React, { useState, useEffect } from 'react';
import { Bell, Users, Check, Youtube } from 'lucide-react';
import { getChannelConfig, isUserSubscribed, incrementSubscriberCount, decrementSubscriberCount } from '../utils/channelConfig';

export const TopChannelBar: React.FC = () => {
  const [channelConfig, setChannelConfig] = useState(getChannelConfig());
  const [userSubscribed, setUserSubscribedState] = useState(isUserSubscribed());

  useEffect(() => {
    const handleStorage = () => {
      setChannelConfig(getChannelConfig());
      setUserSubscribedState(isUserSubscribed());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);
    document.addEventListener('visibilitychange', handleStorage);

    const interval = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
      document.removeEventListener('visibilitychange', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleSubscribeToggle = () => {
    if (userSubscribed) {
      decrementSubscriberCount();
      setUserSubscribedState(false);
      setChannelConfig(getChannelConfig());
    } else {
      incrementSubscriberCount();
      setUserSubscribedState(true);
      setChannelConfig(getChannelConfig());
      if (channelConfig.channelUrl) {
        window.open(channelConfig.channelUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-red-950 via-[#1a1216] to-[#121624] border-b border-red-500/30 text-white px-3 py-2 text-xs sm:text-sm font-medium shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Channel info & notice */}
        <div className="flex items-center gap-2.5 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-400 border border-red-500/45 text-[11px] font-bold uppercase tracking-wider">
            <Youtube className="w-3.5 h-3.5 fill-red-500 text-red-500" /> Official Channel
          </span>
          <span className="text-gray-200 font-semibold truncate max-w-[220px] sm:max-w-xs">
            {channelConfig.channelName}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-gray-400 text-xs">
            • Subscribe to unlock all video downloads!
          </span>
        </div>

        {/* Right: Subscribers count & Subscribe Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-lg border border-white/10 text-xs font-mono">
            <Users className="w-3.5 h-3.5 text-red-400" />
            <span className="font-bold text-white transition-all duration-300">{channelConfig.subscriberCount}</span>
            <span className="text-gray-400 text-[10px] uppercase">Subscribers</span>
          </div>

          <button
            type="button"
            onClick={handleSubscribeToggle}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg ${
              userSubscribed
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-emerald-950/50 hover:bg-red-950/80 hover:text-red-300 hover:border-red-500/50'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50 animate-pulse'
            }`}
            title={userSubscribed ? 'Click to Unsubscribe' : 'Click to Subscribe on YouTube'}
          >
            {userSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Subscribed</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>Subscribe Now</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
