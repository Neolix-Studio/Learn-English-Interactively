import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './RewardPopup.css';

interface Reward {
  id: number;
  reward_type: string;
  league_id: number;
  placement: number;
  bones_reward: number;
  shields_reward: number;
  title_reward: string | null;
}

const RewardPopup: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [currentRewardIndex, setCurrentRewardIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const response = await api.fetch('get_pending_rewards');
        if (response.success && response.rewards && response.rewards.length > 0) {
          setRewards(response.rewards);
          setIsOpen(true);
        } else {

        }
      } catch (error) {
        console.error('Error fetching pending rewards:', error);
      }
    };

    fetchRewards();
  }, []);

  const handleClaim = async () => {
    if (claiming || !rewards[currentRewardIndex]) return;
    setClaiming(true);

    try {
      const reward = rewards[currentRewardIndex];
      if (reward.id === 999) {
          if (currentRewardIndex < rewards.length - 1) {
            setCurrentRewardIndex(prev => prev + 1);
          } else {
            setIsOpen(false);
          }
          setClaiming(false);
          return;
      }

      const response = await api.fetch('claim_reward', { reward_id: reward.id });
      if (response.success) {
        if (currentRewardIndex < rewards.length - 1) {
          setCurrentRewardIndex(prev => prev + 1);
        } else {
          setIsOpen(false);
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen || rewards.length === 0) return null;

  const reward = rewards[currentRewardIndex];
  const isWeekly = reward.reward_type === 'weekly_leaderboard';

  return (
    <div className="reward-popup-overlay">
      <div className="reward-popup-content">
        <div className="reward-glow-bg"></div>

        <div className="reward-chest" style={{ animation: 'bounceIn 0.6s ease-out' }}>
          🎁
        </div>

        <h2 className="reward-title">Gratulálunk!</h2>
        <p className="reward-subtitle">
          A {isWeekly ? 'heti' : 'havi'} ranglistán a(z) <strong>{reward.placement}. helyen</strong> végeztél!
        </p>

        <div className="reward-items">
          {reward.bones_reward > 0 && (
            <div className="reward-item" style={{ animation: 'slideIn 0.5s ease-out 0.2s both' }}>
              <span className="reward-icon">🦴</span>
              <span className="reward-amount">+{reward.bones_reward} Lexi Treats</span>
            </div>
          )}

          {reward.shields_reward > 0 && (
            <div className="reward-item" style={{ animation: 'slideIn 0.5s ease-out 0.4s both' }}>
              <span className="reward-icon">🛡️</span>
              <span className="reward-amount">+{reward.shields_reward} Menedék</span>
            </div>
          )}

          {reward.title_reward && (
            <div className="reward-item title-reward" style={{ animation: 'slideIn 0.5s ease-out 0.6s both' }}>
              <span className="reward-icon">🏆</span>
              <span className="reward-amount">Új Cím: {reward.title_reward}</span>
            </div>
          )}
        </div>

        <button
          className="claim-reward-btn"
          onClick={handleClaim}
          disabled={claiming}
          style={{ animation: 'slideInUp 0.5s ease-out 0.8s both' }}
        >
          {claiming ? 'Begyűjtés...' : 'Begyűjtés!'}
        </button>
      </div>

      <style>{`
        @keyframes bounceIn {
            0% { transform: scale(0); }
            50% { transform: scale(1.1) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RewardPopup;
