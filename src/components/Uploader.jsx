import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';
import { Camera, Loader2, CheckCircle, Images } from 'lucide-react';

export default function Uploader({ onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [uploadsEnabled, setUploadsEnabled] = useState(true); // NOWY STAN
  
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Sprawdzamy co 10 sekund czy Para Młoda nie zablokowała dodawania
  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase.from('photos').select('id').eq('author_name', '__SETTINGS_UPLOADS_DISABLED__');
      setUploadsEnabled(!data || data.length === 0);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert("Plik jest za duży!"); return; }
    setIsUploading(true); setUploadSuccess(false);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      await supabase.storage.from('gallery').upload(fileName, compressedFile, { contentType: file.type });
      const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(fileName);
      const finalAuthorName = authorName.trim() === '' ? '' : authorName.trim();
      const { data: dbData, error: dbError } = await supabase.from('photos').insert([{ image_url: publicUrlData.publicUrl, author_name: finalAuthorName, is_official: false }]).select().single();
      if (dbError) throw dbError;
      const savedPhotos = JSON.parse(localStorage.getItem('my_uploaded_photos') || '[]');
      savedPhotos.push(dbData.id);
      localStorage.setItem('my_uploaded_photos', JSON.stringify(savedPhotos));
      setUploadSuccess(true); setAuthorName('');
      if (onUploadSuccess) onUploadSuccess();
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) { alert("Coś poszło nie tak."); } finally {
      setIsUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = ''; 
      if (galleryInputRef.current) galleryInputRef.current.value = ''; 
    }
  };

  // Jeśli zablokowane - pokazujemy tylko tekst!
  if (!uploadsEnabled) {
    return (
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-md shadow-sm border border-[#ebe8e1] text-center">
        <p className="text-[#8a8578] font-light leading-relaxed">
          Para Młoda wyłączyła już możliwość dodawania nowych zdjęć. <br/><br/>
          <span className="text-[#4a463c] font-medium">Dziękujemy za wszystkie wspaniałe ujęcia! 🤍</span>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-md shadow-sm border border-[#ebe8e1]">
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#8a8578] mb-1.5 tracking-wide">Twój podpis (opcjonalnie)</label>
        <input 
          type="text" placeholder="np. Paweł" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#ebe8e1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#4a463c] text-[#4a463c]"
          disabled={isUploading}
        />
      </div>

      <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} disabled={isUploading} />
      <input type="file" accept="image/*" className="hidden" ref={galleryInputRef} onChange={handleFileChange} disabled={isUploading} />

      {isUploading || uploadSuccess ? (
        <button disabled className={`w-full py-4 rounded-md flex items-center justify-center gap-2 text-white font-medium transition-all ${isUploading ? 'bg-[#c2beb4]' : 'bg-[#8fb090]'}`}>
          {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Wysyłanie...</> : <><CheckCircle className="w-5 h-5 text-white" /> Dodano zdjęcie!</>}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => cameraInputRef.current?.click()} className="w-full py-4 rounded-md flex flex-col items-center justify-center gap-1.5 text-white bg-[#4a463c] hover:bg-[#3d3a31] active:scale-[0.98] transition-all">
            <Camera className="w-6 h-6 stroke-[1.5]" />
            <span className="text-sm font-light tracking-wide">Zrób zdjęcie</span>
          </button>
          <button onClick={() => galleryInputRef.current?.click()} className="w-full py-4 rounded-md flex flex-col items-center justify-center gap-1.5 text-[#4a463c] bg-[#fcfbf9] hover:bg-[#f3f0e8] border border-[#ebe8e1] active:scale-[0.98] transition-all">
            <Images className="w-6 h-6 stroke-[1.5]" />
            <span className="text-sm font-light tracking-wide">Z galerii</span>
          </button>
        </div>
      )}
    </div>
  );
}