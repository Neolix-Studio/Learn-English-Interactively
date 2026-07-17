import React from 'react';

interface TreasureChestProps {
  isOpen: boolean;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
}

export const TreasureChest: React.FC<TreasureChestProps> = ({ isOpen, className, onClick, loading }) => {
  return (
    <div
      className={`treasure-chest-container ${isOpen ? 'open' : 'closed'} ${className || ''}`}
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'transform 0.3s ease',
        transform: isOpen ? 'scale(1.1)' : 'scale(1)',
        filter: isOpen ? 'drop-shadow(0 0 10px rgba(253, 224, 71, 0.8))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
      }}
    >
      <img
        src="/chest.svg"
        alt="Treasure Chest"
        width={184}
        height={184}
        loading={loading}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-42%, -50%)',
          width: '230%',
          height: '230%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};
