import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

export default function OfficialGallery({ onImageClick }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOfficialPhotos = async () => {
    try {
      const { data, error } = await supabase.from('photos').select('*').eq('is_official', true).order('created_at', { ascending: true });
      if (error) throw error;
      
      // FILTRUJEMY: Odrzucamy wszystkie ukryte wpisy systemowe zaczynające się od "__"
      const validPhotos = (data || []).filter(p => !p.author_name?.startsWith('__'));
      setPhotos(validPhotos);
      
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOfficialPhotos();
    const interval = setInterval(fetchOfficialPhotos, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#d1cec7]" /></div>;
  if (photos.length === 0) return <p className="text-center text-[#8a8578] font-light py-8 bg-white rounded-md shadow-sm border border-[#ebe8e1]">Czekamy na pierwsze wspólne zdjęcia od Pary Młodej ✨</p>;

  const infinitePhotos = [...photos, ...photos, ...photos, ...photos];

  return (
    <div className="w-full relative py-2">
      <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 40s linear infinite; display: flex; width: max-content; }`}</style>
      <div className="overflow-hidden w-full -mx-4 px-4 md:mx-0 md:px-0">
        <div className="animate-marquee gap-4">
          {infinitePhotos.map((photo, index) => (
            <div key={`${photo.id}-${index}`} className="w-56 md:w-64 flex-shrink-0 bg-white rounded-md shadow-sm border border-[#ebe8e1] overflow-hidden" onClick={() => onImageClick(photo, photos)}>
              <div className="aspect-[4/5] w-full relative group cursor-pointer">
                <img src={photo.image_url} alt="Nasze wspomnienia" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}