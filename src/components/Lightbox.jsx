import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function Lightbox({ activePhoto, allPhotos, onClose, onNavigate }) {
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate('next');
      if (e.key === 'ArrowLeft') onNavigate('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate]);

  if (!activePhoto) return null;

  const handlePrev = (e) => {
    e.stopPropagation(); 
    onNavigate('prev');
  };

  const handleNext = (e) => {
    e.stopPropagation();
    onNavigate('next');
  };

  // NOWOŚĆ: Funkcja pobierania zdjęcia
  const handleDownload = async (e) => {
    e.stopPropagation(); // Zapobiega zamknięciu Lightboxa po kliknięciu
    try {
      // Pobieramy surowe dane zdjęcia (Blob) z serwera Supabase
      const response = await fetch(activePhoto.image_url);
      const blob = await response.blob();
      
      // Tworzymy tymczasowy, lokalny link URL w pamięci urządzenia
      const url = window.URL.createObjectURL(blob);
      
      // Symulujemy kliknięcie w link pobierania
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Nadajemy ładną nazwę pobieranemu plikowi
      const safeAuthor = activePhoto.author_name ? activePhoto.author_name.replace(/[^a-zA-Z0-9]/g, '_') : 'Gosc';
      a.download = `Wesele-${safeAuthor}-${activePhoto.id.substring(0, 5)}.jpg`;
      
      document.body.appendChild(a);
      a.click();
      
      // Sprzątamy pamięć telefonu
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Błąd pobierania:", error);
      alert("Nie udało się pobrać zdjęcia. Spróbuj ponownie.");
    }
  };

  return (
    <div 
      onClick={onClose} 
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
    >
      {/* NOWOŚĆ: Kontener na przyciski w prawym górnym rogu */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <button 
          onClick={handleDownload}
          className="text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90"
          title="Pobierz zdjęcie"
        >
          <Download className="w-6 h-6" />
        </button>
        <button 
          onClick={onClose}
          className="text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90"
          title="Zamknij"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {allPhotos.length > 1 && (
        <button 
          onClick={handlePrev}
          className="absolute left-4 md:left-8 text-white/70 hover:text-white p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <div className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img 
          src={activePhoto.image_url} 
          alt="Powiększone zdjęcie" 
          className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
        />
        {/* ZMIENIONY FRAGMENT: Wyświetlamy podpis TYLKO dla zdjęć gości (!activePhoto.is_official) */}
        {!activePhoto.is_official && activePhoto.author_name && (
          <p className="text-white/80 text-sm mt-4 font-light tracking-wide bg-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
            📸 {activePhoto.author_name}
          </p>
        )}
      </div>

      {allPhotos.length > 1 && (
        <button 
          onClick={handleNext}
          className="absolute right-4 md:right-8 text-white/70 hover:text-white p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}