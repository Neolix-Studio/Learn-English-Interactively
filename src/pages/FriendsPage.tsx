import { SkeletonFriendRow } from '../components/SkeletonLoader';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { useUser } from '../context/UserContext';
import { MobileBottomBar } from '../components/MobileBottomBar';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface FriendData {
  id: number;
  username: string;
  avatar: string | null;
  points: number;
  league_name: string;
  league_id: number;
  rank: number | null;
}

interface PendingRequest {
  id: number;
  username: string;
  avatar: string | null;
}

export const FriendsPage: React.FC = () => {
  const { data, isGuest, isLoading } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const queryClient = useQueryClient();
  const { data: friendsData, isLoading: friendsLoading, refetch } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await api.fetch('get_friends');
      if (response.success) {
        return { friends: response.friends || [], pending: response.pending || [] };
      }
      throw new Error('Failed to fetch');
    },
    enabled: !isLoading && !isGuest
  });

  const friends = friendsData?.friends || [];
  const pending = friendsData?.pending || [];
  const loading = friendsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!isLoading && isGuest) {
      navigate('/?login=true&redirect=/friends');
    }
  }, [isLoading, isGuest, navigate]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchStatus(null);
    if (!searchQuery.trim()) return;

    try {
      const response = await api.fetch('send_friend_request', { target: searchQuery.trim() });
      if (response.success) {
        setSearchStatus({ message: 'Friend request sent!', isError: false });
        setSearchQuery('');
      } else {
        setSearchStatus({ message: response.error || 'Failed to send request.', isError: true });
      }
    } catch (error) {
      setSearchStatus({ message: 'Error sending request.', isError: true });
    }
  };

  const handleAcceptRequest = async (friendId: number) => {
    try {
      const response = await api.fetch('accept_friend_request', { friend_id: friendId });
      if (response.success) {
        refetch();
      } else {
        alert(response.error || 'Failed to accept request.');
      }
    } catch (error) {
      alert('Error accepting request.');
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      const response = await api.fetch('remove_friend', { friend_id: friendId });
      if (response.success) {
        refetch();
      } else {
        alert(response.error || 'Failed to remove friend.');
      }
    } catch (error) {
      alert('Error removing friend.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonFriendRow key={i} index={i} />)}
        </div>
      </div>
    );
  }

  if (isGuest) {
    return null;
  }

  return (
    <div className="profile-container" style={{ paddingBottom: '80px', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button className="back-btn" onClick={() => navigate(-1)} style={{ marginRight: '15px' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--color-text-main)' }}>Friends</h1>
      </div>

      <div className="friends-section card" style={{ padding: '20px', borderRadius: '15px', background: 'var(--color-bg-surface)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', marginBottom: '30px' }}>
        <h2>Add Friend</h2>
        <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'var(--glass-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '1rem' }}
          />
          <button type="submit" className="primary-btn" style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: 'var(--color-accent-in)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Send Request
          </button>
        </form>
        {searchStatus && (
          <p style={{ marginTop: '10px', color: searchStatus.isError ? '#e74c3c' : '#2ecc71', fontWeight: 'bold' }}>
            {searchStatus.message}
          </p>
        )}
      </div>

      {pending.length > 0 && (
        <div className="friends-section card" style={{ padding: '20px', borderRadius: '15px', background: 'var(--color-bg-surface)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', marginBottom: '30px' }}>
          <h2 style={{ color: 'var(--color-accent-on)', marginBottom: '15px' }}>Pending Requests ({pending.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {pending.map((p: PendingRequest) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: 'var(--glass-border)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img
                    src={p.avatar ? `/avatars/${p.avatar}` : '/avatars/default.png'}
                    alt="avatar"
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/default.png'; }}
                  />
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{p.username}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleAcceptRequest(p.id)} style={{ padding: '8px 15px', borderRadius: '8px', backgroundColor: 'var(--color-success, #10B981)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Accept</button>
                  <button onClick={() => handleRemoveFriend(p.id)} style={{ padding: '8px 15px', borderRadius: '8px', backgroundColor: 'var(--color-error, #EF4444)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="friends-section card" style={{ padding: '20px', borderRadius: '15px', background: 'var(--color-bg-surface)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
        <h2 style={{ marginBottom: '15px' }}>My Friends ({friends.length})</h2>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{Array.from({ length: 4 }).map((_, i) => <SkeletonFriendRow key={i} index={i} />)}</div>
        ) : friends.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '20px' }}>You haven't added any friends yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {friends.map((f: FriendData) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: '1px solid var(--border-color, #eee)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img
                    src={f.avatar ? `/avatars/${f.avatar}` : '/avatars/default.png'}
                    alt="avatar"
                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/default.png'; }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-text-main)' }}>{f.username}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {f.rank ? (
                        <span style={{ color: '#f39c12', fontWeight: 'bold' }}>#{f.rank} in {f.league_name}</span>
                      ) : (
                        <span>{f.league_name}</span>
                      )}
                      <span style={{ marginLeft: '10px', color: 'var(--color-text-muted)' }}>({f.points} XP)</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleRemoveFriend(f.id)} style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--color-error, #EF4444)', border: '1px solid var(--color-error, #EF4444)', cursor: 'pointer', fontWeight: 'bold' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileBottomBar activeTab="profile" />
    </div>
  );
};
