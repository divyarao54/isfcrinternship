import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

// Build an index of local assets so legacy awards (stored by filename) still render
const useAssetsIndex = () => {
  const context = useMemo(() => {
    try {
      return require.context('../assets', false, /\.(png|jpe?g|gif|svg|webp|avif)$/i);
    } catch (e) {
      return null;
    }
  }, []);

  return useMemo(() => {
    const map = new Map();
    if (!context) return map;
    context.keys().forEach((key) => {
      const fileName = key.replace('./', '');
      try {
        const url = context(key);
        map.set(fileName, url);
      } catch {}
    });
    return map;
  }, [context]);
};

const AwardsGallery = () => {
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const assetsIndex = useAssetsIndex();

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/awards');
        const list = Array.isArray(res.data.awards) ? res.data.awards : [];
        setAwards(list);
      } catch (e) {
        setError('Failed to load awards');
      } finally {
        setLoading(false);
      }
    };
    fetchAwards();
  }, []);

  if (loading) return null;
  if (error || awards.length === 0) return null;

  // Resolve a display URL for both new (imageUrl) and legacy fields
  const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);
  const isDataUrl = (s) => typeof s === 'string' && /^data:image\//i.test(s);
  const getFileName = (p) => {
    if (typeof p !== 'string') return null;
    try {
      // If it's a URL, take last pathname segment
      if (isHttpUrl(p)) {
        const u = new URL(p);
        return u.pathname.split('/').filter(Boolean).pop() || null;
      }
    } catch {}
    // Otherwise treat as path and return last segment
    const parts = p.split('/');
    return parts[parts.length - 1] || null;
  };

  const visibleAwards = awards
    .map((a) => {
      if (!a) return null;

      // 1) Prefer explicit URLs (supports http(s) and data URLs)
      const directUrlCandidates = [a.imageUrl, a.imageLink, a.url, a.relativePath, a.imageFilename];
      for (const cand of directUrlCandidates) {
        if (isHttpUrl(cand) || isDataUrl(cand)) {
          return { ...a, _displayUrl: cand };
        }
      }

      // 2) Try to resolve by filename against bundled assets
      const fileNameCandidates = [a.imageFilename, getFileName(a.relativePath)];
      for (const fname of fileNameCandidates) {
        if (fname && assetsIndex.has(fname)) {
          return { ...a, _displayUrl: assetsIndex.get(fname) };
        }
      }

      return null;
    })
    .filter(Boolean);
  if (visibleAwards.length === 0) return null;

  return (
    <section className="awards-section">
      <h2 className="awards-title">ISFCR Awards</h2>
      <div className="awards-grid">
        {visibleAwards.map((a, idx) => (
          <div className="award-card" key={a._id || idx}>
            <img 
              className="award-image" 
              src={a._displayUrl} 
              alt={a.awardName || a.imageFilename || 'Award'} 
              onError={(e) => {
                // Hide broken image and show fallback text
                e.target.style.display = 'none';
                e.target.nextSibling.textContent = 'Image not available';
              }}
            />
            <div className="award-name">{a.awardName || a.imageFilename || 'Award'}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AwardsGallery;


