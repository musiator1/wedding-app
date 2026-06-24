import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Trash2, Loader2, Clock } from 'lucide-react';

export default function Gallery({ refreshTrigger, onImageClick, onPhotosFetched }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myPhotos, setMyPhotos] = useState([]);
  const [likedPhotos, setLikedPhotos] = useState(() => JSON.parse(localStorage.getItem('my_liked_photos') || '[]'));

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase.from('photos').select('*').eq('is_official', false).order('created_at', { ascending: false });
      if (error) throw error;
      
      const fetchedPhotos = data || [];
      setPhotos(fetchedPhotos);
      
      // NOWOŚĆ: Przekazujemy liczbę zdjęć do głównego pliku
      if (onPhotosFetched) onPhotosFetched(fetchedPhotos.length);
      
      setMyPhotos(JSON.parse(localStorage.getItem('my_uploaded_photos') || '[]'));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 10000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleLike = async (id, currentLikes) => {
    const isLiked = likedPhotos.includes(id);
    const newLikesCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    let newLikedPhotos = isLiked ? likedPhotos.filter(photoId => photoId !== id) : [...likedPhotos, id];
    
    setLikedPhotos(newLikedPhotos);
    localStorage.setItem('my_liked_photos', JSON.stringify(newLikedPhotos));
    setPhotos(photos.map(p => p.id === id ? { ...p, likes_count: newLikesCount } : p));
    await supabase.from('photos').update({ likes_count: newLikesCount }).eq('id', id);
  };

  const handleDelete = async (id, imageUrl) => {
    if (!window.confirm("Czy na pewno chcesz usunąć to zdjęcie?")) return;
    try {
      const fileName = imageUrl.split('/').pop();
      await supabase.storage.from('gallery').remove([fileName]);
      await supabase.from('photos').delete().eq('id', id);
      setPhotos(photos.filter(p => p.id !== id));
      const updatedMyPhotos = myPhotos.filter(photoId => photoId !== id);
      setMyPhotos(updatedMyPhotos);
      localStorage.setItem('my_uploaded_photos', JSON.stringify(updatedMyPhotos));
    } catch (error) { alert("Nie udało się usunąć zdjęcia."); }
  };

  const formatWeddingDate = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (d.toDateString() === now.toDateString()) return `Dzisiaj, ${timeStr}`;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${timeStr}`;
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#d1cec7]" /></div>;
  if (photos.length === 0) return <p className="text-center text-[#8a8578] font-light py-8">Brak zdjęć. Bądź pierwszą osobą, która coś doda!</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map(photo => {
        const isLiked = likedPhotos.includes(photo.id);

        return (
          <div key={photo.id} className="bg-white rounded-md shadow-sm border border-[#ebe8e1] overflow-hidden flex flex-col group transition-shadow hover:shadow-md">
            <div className="aspect-square w-full relative">
              <img src={photo.image_url} alt="Z wesela" className="w-full h-full object-cover cursor-pointer" onClick={() => onImageClick(photo, photos)} />
              {myPhotos.includes(photo.id) && (
                <button onClick={() => handleDelete(photo.id, photo.image_url)} className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-lg active:scale-90 transition-transform z-10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <div className="p-3.5 flex flex-col gap-2 bg-white">
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-medium text-[#4a463c] truncate max-w-[70%] tracking-wide">
                  {photo.author_name || <span className="text-[#d1cec7] font-light italic">Anonimowo</span>}
                </span>
                
                <button 
                  onClick={() => handleLike(photo.id, photo.likes_count || 0)}
                  className={`flex items-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-125 ${isLiked ? 'text-[#e86a6a]' : 'text-[#c2beb4] hover:text-[#e86a6a]'}`}
                >
                  <span className="text-sm font-medium">{photo.likes_count || 0}</span>
                  <Heart className={`w-4 h-4 transition-transform duration-200 ${isLiked ? 'fill-current scale-110' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#a39f96] font-light">
                <Clock className="w-3 h-3" />
                <span>{formatWeddingDate(photo.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}