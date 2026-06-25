import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Trash2, Loader2, Clock } from 'lucide-react';

export default function Gallery({ refreshTrigger, onImageClick, onPhotosFetched }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [myPhotos, setMyPhotos] = useState([]);
  const [likedPhotos, setLikedPhotos] = useState(() => JSON.parse(localStorage.getItem('my_liked_photos') || '[]'));

  // --- STANY DO PAGINACJI ---
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 12;

  // Główna funkcja pobierająca paczkę zdjęć z użyciem .range()
  const fetchPhotos = async (pageNumber, isRefresh = false) => {
    // Jeśli pobieramy "więcej", nie pokazujemy głównego loadera, tylko ten w przycisku na dole
    if (!isRefresh && pageNumber > 0) setIsLoadingMore(true);
    
    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Wyciągamy też "count: 'exact'" dla licznika z App.jsx
      const { data, count, error } = await supabase
        .from('photos')
        .select('*', { count: 'exact' })
        .eq('is_official', false)
        // Odfiltrowujemy systemowe, tak jak chciałeś wcześniej
        .not('author_name', 'in', '("__HERO__", "__SETTINGS_UPLOADS_DISABLED__")')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (isRefresh || pageNumber === 0) {
          setPhotos(data);
        } else {
          setPhotos(prev => [...prev, ...data]);
        }

        // Informujemy plik App.jsx o sumie zdjęć
        if (onPhotosFetched && count !== null) {
          onPhotosFetched(count);
        }

        setHasMore(data.length === PAGE_SIZE);
      }

      setMyPhotos(JSON.parse(localStorage.getItem('my_uploaded_photos') || '[]'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Reakcja na odświeżenie (np. przez auto-odświeżanie z Uploader.jsx)
  // 1. Śledzenie na bieżąco, na której jesteśmy stronie (potrzebne do odświeżania w tle)
  const pageRef = useRef(0);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // 2. Reakcja TYLKO na wgranie nowego zdjęcia przez Ciebie lub odświeżenie strony
  useEffect(() => {
    setPage(0);
    fetchPhotos(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]); 

  // 3. Automatyczne odświeżanie w tle co 10 sekund 
  // (Działa tylko, jeśli gość jest na samej górze galerii, żeby nie psuć czytania starszych zdjęć!)
  useEffect(() => {
    const interval = setInterval(() => {
      if (pageRef.current === 0) {
         fetchPhotos(0, true);
      }
    }, 10000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ładowanie kolejnych ujęć z dołu ekranu
  const loadMorePhotos = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPhotos(nextPage, false);
  };

  // --- TWOJE ZACHOWANE FUNKCJE: LIKE, USUWAM, DATA ---
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
      await supabase.from('photos').delete().eq('id', id);
      setPhotos(photos.filter(p => p.id !== id));
      
      const updatedMyPhotos = myPhotos.filter(photoId => photoId !== id);
      setMyPhotos(updatedMyPhotos);
      localStorage.setItem('my_uploaded_photos', JSON.stringify(updatedMyPhotos));
    } catch (error) {
      alert("Nie udało się usunąć zdjęcia.");
    }
  };

  const formatWeddingDate = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (d.toDateString() === now.toDateString()) return `Dzisiaj, ${timeStr}`;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${timeStr}`;
  };

  // --- WIDOKI ---
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#d1cec7]" /></div>;
  if (photos.length === 0) return <p className="text-center text-[#8a8578] font-light py-8">Brak zdjęć. Bądź pierwszą osobą, która coś doda!</p>;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map(photo => {
          const isLiked = likedPhotos.includes(photo.id);

          return (
            <div key={photo.id} className="bg-white rounded-md shadow-sm border border-[#ebe8e1] overflow-hidden flex flex-col group transition-shadow hover:shadow-md">
              <div className="aspect-square w-full relative">
                <img 
                  src={photo.image_url} 
                  alt="Z wesela" 
                  loading="lazy" /* <-- NOWOŚĆ OSZCZĘDZAJĄCA TRANSFER */
                  className="w-full h-full object-cover cursor-pointer" 
                  onClick={() => onImageClick(photo, photos)} 
                />
                
                {myPhotos.includes(photo.id) && (
                  <button onClick={() => handleDelete(photo.id, photo.image_url)} className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-lg active:scale-90 transition-transform z-10 cursor-pointer">
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

      {/* NOWOŚĆ: PRZYCISK "ZAŁADUJ WIĘCEJ" */}
      {hasMore && (
        <div className="mt-10 mb-6 flex justify-center">
          <button 
            onClick={loadMorePhotos} 
            disabled={isLoadingMore}
            className="px-6 py-3 bg-white border border-[#ebe8e1] text-[#4a463c] rounded-full text-sm font-medium hover:bg-[#fcfbf9] shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            {isLoadingMore ? (
              <><Loader2 className="w-4 h-4 animate-spin text-[#8a8578]" /> Ładowanie...</>
            ) : (
              'Załaduj starsze zdjęcia'
            )}
          </button>
        </div>
      )}
    </div>
  );
}