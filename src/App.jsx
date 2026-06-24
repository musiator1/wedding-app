import { useState } from 'react';
import Hero from './components/Hero';
import Uploader from './components/Uploader';
import Gallery from './components/Gallery';
import OfficialGallery from './components/OfficialGallery';
import Lightbox from './components/Lightbox';
import { Lock, Camera } from 'lucide-react'; // <-- Dodałem Camera

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [currentGalleryPhotos, setCurrentGalleryPhotos] = useState([]);
  
  const [guestPhotoCount, setGuestPhotoCount] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const openLightbox = (photo, galleryList) => {
    setLightboxPhoto(photo);
    setCurrentGalleryPhotos(galleryList);
  };

  const handleLightboxNavigate = (direction) => {
    const currentIndex = currentGalleryPhotos.findIndex(p => p.id === lightboxPhoto.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentIndex + 1 >= currentGalleryPhotos.length ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex - 1 < 0 ? currentGalleryPhotos.length - 1 : currentIndex - 1;
    }
    setLightboxPhoto(currentGalleryPhotos[newIndex]);
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans flex flex-col justify-between selection:bg-[#4a463c] selection:text-white">
      
      <div>
        <Hero />
        <main className="max-w-3xl mx-auto px-4 pb-12 space-y-8">
          
          <hr className="border-[#ebe8e1]" />

          {/* SEKCJA 1: UPLOADER DLA GOŚCI */}
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-light tracking-wide text-[#4a463c]">Dodaj swoje zdjęcia</h2>
              <p className="text-[#8a8578] font-light text-sm mt-2">Pokażcie nam to wesele Waszymi oczami! Wrzućcie fotki z parkietu albo od stołu.</p>
            </div>
            <Uploader onUploadSuccess={handleUploadSuccess} />
          </section>

          <hr className="border-[#ebe8e1]" />

          {/* SEKCJA 2: ZDJĘCIA PARY MŁODEJ */}
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-light tracking-wide text-[#4a463c]">Nasze wspomnienia</h2>
              <p className="text-[#8a8578] font-light text-sm mt-2">Krótki powrót do przeszłości, zanim zaczęła się dzisiejsza impreza.</p>
            </div>
            <OfficialGallery onImageClick={openLightbox} />
          </section>

          <hr className="border-[#ebe8e1]" />

          {/* SEKCJA 3: GALERIA GOŚCI */}
          <section>
            <div className="text-center mb-6">
              
              <h2 className="text-2xl font-serif font-light tracking-wide text-[#4a463c]">
                Wesele okiem Gości
              </h2>
              <p className="text-[#8a8578] font-light text-sm mt-2 mb-4">
                Przeglądajcie, pobierajcie i zostawiajcie serduszka pod ulubionymi ujęciami.
              </p>

              {/* NOWY, ELEGANCKI LICZNIK */}
              {guestPhotoCount > 0 && (
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#ebe8e1] rounded-full shadow-sm">
                    <Camera className="w-3.5 h-3.5 text-[#a39f96]" />
                    <span className="text-xs text-[#8a8578] font-medium tracking-wide uppercase">
                      Złapanych momentów: <span className="font-bold text-[#4a463c]">{guestPhotoCount}</span>
                    </span>
                  </div>
                </div>
              )}
              
            </div>
            
            <Gallery refreshTrigger={refreshTrigger} onImageClick={openLightbox} onPhotosFetched={setGuestPhotoCount} />
          </section>

        </main>
      </div>

      <footer className="w-full py-6 mt-8 border-t border-[#ebe8e1] text-center flex flex-col items-center justify-center gap-2">
        <p className="text-xs text-[#a39f96] font-light tracking-wider uppercase">
          Stworzone z miłością przez Rafała • 2026
        </p>
        <a href="/admin" className="text-[#d1cec7] hover:text-[#4a463c] transition-colors p-2 rounded-full" title="Panel Administratora">
          <Lock className="w-3.5 h-3.5" />
        </a>
      </footer>

      <Lightbox activePhoto={lightboxPhoto} allPhotos={currentGalleryPhotos} onClose={() => setLightboxPhoto(null)} onNavigate={handleLightboxNavigate} />
    </div>
  );
}

export default App;