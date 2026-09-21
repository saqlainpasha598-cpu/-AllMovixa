export interface ChannelConfig {
  channelName: string;
  channelUrl: string;
  subscriberCount: number;
}

export interface SubscriberRecord {
  id: string;
  name: string;
  email: string;
  subscribedAt: string;
  status: 'Subscribed' | 'Not Subscribed';
}

const DEFAULT_CHANNEL: ChannelConfig = {
  channelName: 'My Anime & Drama Hub',
  channelUrl: 'https://youtube.com',
  subscriberCount: 1540,
};

const CHANNEL_KEY = 'stream_channel_config_v1';
const SUBSCRIBED_KEY = 'stream_user_subscribed_to_channel';
const SUBSCRIBERS_LIST_KEY = 'stream_subscribers_list_v1';

export function getChannelConfig(): ChannelConfig {
  try {
    const saved = localStorage.getItem(CHANNEL_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_CHANNEL;
}

export function saveChannelConfig(config: ChannelConfig): void {
  try {
    localStorage.setItem(CHANNEL_KEY, JSON.stringify(config));
  } catch (e) {
    console.error(e);
  }
}

export function isUserSubscribed(): boolean {
  try {
    return localStorage.getItem(SUBSCRIBED_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function setUserSubscribed(subscribed: boolean, user?: { name?: string; email?: string }): void {
  try {
    localStorage.setItem(SUBSCRIBED_KEY, subscribed ? 'true' : 'false');
    
    // Update subscribers list
    const subscribers = getSubscribersList();
    const userEmail = user?.email || localStorage.getItem('stream_current_user_email') || 'visitor@stream.app';
    const userName = user?.name || localStorage.getItem('stream_current_user_name') || 'Stream Viewer';
    
    const existingIndex = subscribers.findIndex(s => s.email === userEmail);
    if (subscribed) {
      if (existingIndex >= 0) {
        subscribers[existingIndex].status = 'Subscribed';
        subscribers[existingIndex].subscribedAt = new Date().toLocaleString();
      } else {
        subscribers.unshift({
          id: `sub-${Date.now()}`,
          name: userName,
          email: userEmail,
          subscribedAt: new Date().toLocaleString(),
          status: 'Subscribed',
        });
      }
    } else {
      if (existingIndex >= 0) {
        subscribers[existingIndex].status = 'Not Subscribed';
      } else {
        subscribers.unshift({
          id: `sub-${Date.now()}`,
          name: userName,
          email: userEmail,
          subscribedAt: new Date().toLocaleString(),
          status: 'Not Subscribed',
        });
      }
    }
    localStorage.setItem(SUBSCRIBERS_LIST_KEY, JSON.stringify(subscribers));
  } catch (e) {
    console.error(e);
  }
}

export function getSubscribersList(): SubscriberRecord[] {
  try {
    const saved = localStorage.getItem(SUBSCRIBERS_LIST_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  // Default sample records if empty
  return [
    { id: 'sub-1', name: 'Saqlain Pasha', email: 'saqlainpasha598@gmail.com', subscribedAt: '2026-09-20 06:30 AM', status: 'Subscribed' },
    { id: 'sub-2', name: 'Ali Khan', email: 'alikhan@gmail.com', subscribedAt: '2026-09-20 05:15 AM', status: 'Subscribed' },
    { id: 'sub-3', name: 'Ayesha Ahmed', email: 'ayesha@hotmail.com', subscribedAt: '2026-09-19 11:20 PM', status: 'Not Subscribed' },
    { id: 'sub-4', name: 'Bilal Ahmed', email: 'bilal@yahoo.com', subscribedAt: '2026-09-19 09:10 PM', status: 'Subscribed' },
  ];
}

export function incrementSubscriberCount(): number {
  const config = getChannelConfig();
  if (!isUserSubscribed()) {
    config.subscriberCount += 1;
    saveChannelConfig(config);
    setUserSubscribed(true);
  }
  return config.subscriberCount;
}

export function decrementSubscriberCount(): number {
  const config = getChannelConfig();
  if (isUserSubscribed()) {
    config.subscriberCount = Math.max(0, config.subscriberCount - 1);
    saveChannelConfig(config);
    setUserSubscribed(false);
  }
  return config.subscriberCount;
}
