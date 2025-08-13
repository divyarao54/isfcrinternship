import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

// Dynamically import all images from src/assets using webpack's require.context
const useAssetsIndex = () => {
  const context = useMemo(() => {
    try {
      // include common image formats
      return require.context('../assets', false, /\.(png|jpe?g|gif|svg|webp|avif)$/i);
    } catch (e) {
      return null;
    }
  }, []);

  return useMemo(() => {
    const map = new Map();
    if (!context) return map;
    context.keys().forEach((key) => {
      // keys look like './filename.ext'
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

  // Only show awards whose image file actually exists in assets
  const visibleAwards = awards.filter(a => a && a.imageFilename && assetsIndex.has(a.imageFilename));
  if (visibleAwards.length === 0) return null;

  return (
    <section className="awards-section">
      <h2 className="awards-title">ISFCR Awards</h2>
      <div className="awards-grid">
        {visibleAwards.map((a, idx) => {
          const imgUrl = assetsIndex.get(a.imageFilename);
          return (
            <div className="award-card" key={a._id || idx}>
              <img className="award-image" src={imgUrl} alt={a.awardName || a.imageFilename} />
              <div className="award-name">{a.awardName || a.imageFilename}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AwardsGallery;


