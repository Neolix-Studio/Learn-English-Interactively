import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../context/UserContext';
import { csrfHeader } from '../../utils/api';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { updateProgress, data } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setFile(null);
        setPreview(null);
        setError('File size must be under 5MB.');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
        setFile(null);
        setPreview(null);
        setError('Allowed image types: JPG, PNG, or WebP.');
        return;
      }
      setFile(selected);
      setError('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/upload_avatar.php', {
        method: 'POST',
        headers: await csrfHeader(),
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        updateProgress({
            scores: { ...data.scores, active_nameplate: data.scores?.active_nameplate }
        });

        window.location.reload();
      } else {
        setError(result.error || 'Upload failed.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const currentAvatarUrl = preview || '/avatars/default.png';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: 'var(--color-bg-surface)', padding: '2.5rem', borderRadius: '24px', maxWidth: '400px', width: '100%', border: 'var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', position: 'relative', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>

        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--color-bg-base)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-main)' }}>✕</button>

        <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--color-text-main)', textAlign: 'center' }}>Update Avatar</h2>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'var(--color-bg-base)', border: '4px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
          >
            {currentAvatarUrl !== '/avatars/default.png' ? (
              <img src={currentAvatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
               <div style={{ fontSize: '3rem' }}>📸</div>
            )}

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.8rem', textAlign: 'center', padding: '5px' }}>
               Click to Change
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: 'none' }}
          />

          {error && <div style={{ color: '#EF4444', fontSize: '0.9rem', fontWeight: 'bold' }}>{error}</div>}

          <button
            disabled={!file || loading}
            onClick={handleUpload}
            style={{ width: '100%', padding: '15px', borderRadius: '12px', background: file ? 'var(--color-accent-in)' : 'var(--color-bg-base)', color: file ? 'white' : 'var(--color-text-muted)', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: file ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Uploading...' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
};
