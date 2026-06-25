import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';
import { QRCodeCanvas } from 'qrcode.react'; // <-- NOWY IMPORT
import { Lock, Trash2, UploadCloud, Loader2, Image as ImageIcon, DownloadCloud, Eye, EyeOff, ArrowLeft, UserCircle, QrCode, Printer } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  
  const fileInputRef = useRef(null);
  const heroInputRef = useRef(null);

  // Dynamiczne pobieranie aktualnego adresu URL (np. wesele.vercel.app)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleLogin = (e) => {
    e.preventDefault();
    const secret = import.meta.env.VITE_ADMIN_PASSWORD;
    if (password === secret) { setIsAuth(true); fetchAllPhotos(); } 
    else { alert('Niepoprawne hasło!'); }
  };

  const fetchAllPhotos = async () => {
    const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPhotos(data);
      const disabledRecord = data.find(p => p.author_name === '__SETTINGS_UPLOADS_DISABLED__');
      setUploadsEnabled(!disabledRecord);
    }
  };

  const toggleUploads = async () => {
    if (uploadsEnabled) {
      await supabase.from('photos').insert([{ image_url: 'https://dummy.com/disabled.jpg', author_name: '__SETTINGS_UPLOADS_DISABLED__', is_official: true }]);
    } else {
      await supabase.from('photos').delete().eq('author_name', '__SETTINGS_UPLOADS_DISABLED__');
    }
    fetchAllPhotos();
  };

  const handleOfficialUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const options = { maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      // CLOUDINARY UPLOAD
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const cloudinaryData = await cloudinaryRes.json();
      const publicUrl = cloudinaryData.secure_url;

      // Zapis linku do Supabase
      await supabase.from('photos').insert([{ image_url: publicUrl, author_name: 'Para Młoda', is_official: true }]);
      alert('Dodano pamiątkowe zdjęcie!');
      fetchAllPhotos(); 
    } catch (error) { 
      console.error("Błąd", error); 
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleHeroUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingHero(true);
    try {
      // Usuwamy stary rekord hero z bazy Supabase (fizyczny plik w Cloudinary zostaje zignorowany)
      const oldHeroes = photos.filter(p => p.author_name === '__HERO__');
      for (const old of oldHeroes) {
        await supabase.from('photos').delete().eq('id', old.id);
      }

      const options = { maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      // CLOUDINARY UPLOAD
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const cloudinaryData = await cloudinaryRes.json();
      const publicUrl = cloudinaryData.secure_url;
      
      await supabase.from('photos').insert([{ image_url: publicUrl, author_name: `__HERO__`, is_official: true }]);
      alert('Zdjęcie powitalne zaktualizowane!');
      fetchAllPhotos(); 
    } catch (error) { 
      console.error("Błąd", error); 
    } finally {
      setIsUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = '';
    }
  };

  const handleDeleteHero = async (heroRecord) => {
    if (!window.confirm("Czy na pewno chcesz całkowicie usunąć zdjęcie powitalne? Na stronie głównej wyświetlą się same napisy.")) return;
    try {
      const fileName = heroRecord.image_url.split('/').pop();
      await supabase.from('photos').delete().eq('id', heroRecord.id);
      alert('Zdjęcie powitalne zostało usunięte!');
      fetchAllPhotos();
    } catch (error) {
      console.error("Błąd usuwania profilowego:", error);
    }
  };

  const handleDelete = async (id, imageUrl) => {
    if (!window.confirm("Na pewno usunąć to zdjęcie (bezpowrotnie)?")) return;
    try {
      const fileName = imageUrl.split('/').pop();
      await supabase.from('photos').delete().eq('id', id);
      setPhotos(photos.filter(p => p.id !== id));
    } catch (error) { console.error("Błąd usuwania", error); }
  };

  const handleDownloadZip = async (photosToDownload, folderName) => {
    if (photosToDownload.length === 0) return alert("Brak zdjęć do pobrania.");
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const fetchPromises = photosToDownload.map(async (photo, index) => {
        const response = await fetch(photo.image_url);
        const blob = await response.blob();
        const urlParts = photo.image_url.split('.');
        const ext = urlParts.length > 1 ? urlParts.pop() : 'jpg';
        const safeAuthor = photo.author_name ? photo.author_name.replace(/[^a-zA-Z0-9]/g, '_') : 'Anonim';
        const fileName = `${index + 1}-${safeAuthor}.${ext}`;
        zip.file(fileName, blob);
      });
      await Promise.all(fetchPromises);
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `${folderName}.zip`);
    } catch (error) { alert("Nie udało się pobrać paczki ZIP."); } finally { setIsZipping(false); }
  };

  // NOWOŚĆ: Funkcja pobierania obrazka QR
  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "Nasze_Wesele_QR.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-md shadow-sm border border-[#ebe8e1] w-full max-w-sm text-center relative">
          <Lock className="w-12 h-12 mx-auto text-[#4a463c] mb-4" />
          <h2 className="text-2xl font-serif font-light text-[#4a463c] tracking-wide mb-6">Panel Admina</h2>
          <div className="relative mb-4">
            <input 
              type={showPassword ? "text" : "password"} placeholder="Wpisz hasło..." value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#fcfbf9] border border-[#ebe8e1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#4a463c] pr-12 text-[#4a463c]"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a39f96] hover:text-[#4a463c] p-1">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button type="submit" className="w-full py-3 bg-[#4a463c] text-white rounded-md font-medium hover:bg-[#3d3a31] mb-6 tracking-wide">Zaloguj</button>
          <a href="/" className="inline-flex items-center justify-center gap-2 text-sm text-[#8a8578] hover:text-[#4a463c] transition-colors"><ArrowLeft className="w-4 h-4" />Wróć na salę weselną</a>
        </form>
      </div>
    );
  }

  const currentHero = photos.find(p => p.author_name === '__HERO__'); 
  const officialPhotos = photos.filter(p => p.is_official && !p.author_name?.startsWith('__'));
  const guestPhotos = photos.filter(p => !p.is_official && !p.author_name?.startsWith('__'));

  return (
    // Dodałem 'print:p-0 print:bg-white' do głównego kontenera
    <div className="min-h-screen bg-[#fcfbf9] p-4 md:p-8 font-sans print:p-0 print:bg-white">
      
      {/* CZEŚĆ WIDOCZNA TYLKO NA EKRANIE (Znika przy drukowaniu) */}
      <div className="max-w-4xl mx-auto print:hidden">
        <div className="flex justify-between items-center mb-10 border-b border-[#ebe8e1] pb-6">
          <h1 className="text-3xl font-serif font-light text-[#4a463c]">Zarządzanie</h1>
          <a href="/" className="px-4 py-2 bg-[#ebe8e1] text-[#4a463c] rounded-md text-sm hover:bg-[#d1cec7] transition-colors">Wróć do wesela</a>
        </div>

        <div className="bg-white p-5 rounded-md shadow-sm border border-[#ebe8e1] mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-[#4a463c] mb-1">Pozwalaj gościom na wgrywanie zdjęć</h2>
            <p className="text-sm text-[#8a8578]">Wyłącz to po zakończeniu wesela, aby zablokować bramkę i zabezpieczyć galerię.</p>
          </div>
          <button onClick={toggleUploads} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${uploadsEnabled ? 'bg-[#8fb090]' : 'bg-[#d1cec7]'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${uploadsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* NOWOŚĆ: SEKCJA KODU QR */}
        <div className="mb-12">
          <div className="flex justify-between items-end border-b border-[#ebe8e1] pb-2 mb-6">
            <h2 className="text-xl font-serif font-light text-[#4a463c]">Instrukcja na stoły (Kod QR)</h2>
          </div>
          
          <div className="bg-white p-6 md:p-8 rounded-md shadow-sm border border-[#ebe8e1] flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-medium text-[#4a463c] mb-2 flex items-center justify-center md:justify-start gap-2">
                <QrCode className="w-5 h-5 text-[#8a8578]" /> 
                Wydrukuj i postaw na stołach
              </h3>
              <p className="text-sm text-[#8a8578] mb-6 leading-relaxed">
                Ten kod prowadzi bezpośrednio do Waszej galerii. Goście nie muszą przepisywać adresu ze spacji. Wydrukuj gotową kartkę albo pobierz sam obrazek do projektu zaproszeń.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleDownloadQR} className="flex-1 py-3 bg-[#fcfbf9] border border-[#ebe8e1] text-[#4a463c] rounded-md text-sm font-medium flex justify-center items-center gap-2 hover:bg-[#f3f0e8] transition-colors cursor-pointer">
                  <DownloadCloud className="w-4 h-4" /> Pobierz plik PNG
                </button>
                <button onClick={() => window.print()} className="flex-1 py-3 bg-[#4a463c] text-white rounded-md text-sm font-medium flex justify-center items-center gap-2 hover:bg-[#3d3a31] transition-colors cursor-pointer">
                  <Printer className="w-4 h-4" /> Wydrukuj
                </button>
              </div>
            </div>

            {/* Wizualizacja kartki w panelu */}
            <div className="bg-[#fcfbf9] p-6 rounded-xl border border-[#ebe8e1] flex flex-col items-center shadow-sm max-w-[250px]">
              <p className="font-serif text-[#4a463c] text-base mb-4 text-center leading-tight">Nasze wesele<br/>Waszymi oczami</p>
              <div className="bg-white p-2 rounded-lg shadow-sm border border-[#ebe8e1] mb-4">
                <QRCodeCanvas id="qr-canvas" value={appUrl} size={150} fgColor="#4a463c" bgColor="#ffffff" level="H" />
              </div>
              <p className="text-[10px] text-[#a39f96] tracking-widest uppercase truncate w-full text-center">
                {appUrl.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-6 rounded-md shadow-sm border border-[#ebe8e1] flex flex-col items-center text-center">
            <h2 className="text-lg font-medium text-[#4a463c] mb-2 flex items-center justify-center gap-2 w-full"><UserCircle className="w-5 h-5 text-[#8a8578]" /> 1. Zdjęcie powitalne (Hero)</h2>
            <p className="text-sm text-[#8a8578] mb-6">Podgląd aktualnego zdjęcia na stronie głównej. Wgranie nowego automatycznie usunie stare.</p>
            {currentHero ? (
              <div className="mb-6 w-32 h-32 rounded-lg overflow-hidden shadow-sm border border-[#ebe8e1]"><img src={currentHero.image_url} alt="Hero" className="w-full h-full object-cover" /></div>
            ) : (
              <div className="mb-6 w-32 h-32 rounded-lg bg-[#fcfbf9] border border-dashed border-[#d1cec7] flex items-center justify-center text-xs text-[#a39f96]">Brak zdjęcia</div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={heroInputRef} onChange={handleHeroUpload} disabled={isUploadingHero} />
            <div className="flex gap-2 w-full mt-auto">
              <button onClick={() => heroInputRef.current?.click()} disabled={isUploadingHero} className="flex-1 py-3 bg-[#4a463c] text-white rounded-md text-sm font-medium flex justify-center items-center gap-2 hover:bg-[#3d3a31] cursor-pointer">
                {isUploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Zmień profilowe
              </button>
              {currentHero && (
                <button onClick={() => handleDeleteHero(currentHero)} className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition-colors cursor-pointer" title="Usuń">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-sm border border-[#ebe8e1] flex flex-col">
            <h2 className="text-lg font-medium text-[#4a463c] mb-2 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-[#8a8578]" /> 2. Nasze wspomnienia</h2>
            <p className="text-sm text-[#8a8578] mb-auto pb-6">Te zdjęcia będą się powoli przesuwać w taśmie pod powitaniem. Świetne miejsce na ujęcia z narzeczeństwa.</p>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleOfficialUpload} disabled={isUploading} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full py-3 bg-[#fcfbf9] border border-[#ebe8e1] text-[#4a463c] rounded-md text-sm font-medium flex justify-center items-center gap-2 hover:bg-[#f3f0e8] mt-4 cursor-pointer">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Dodaj zdjęcie do wspomnień
            </button>
          </div>
        </div>

        <div className="mb-12">
          <div className="flex justify-between items-end border-b border-[#ebe8e1] pb-2 mb-4">
            <h2 className="text-xl font-serif font-light text-[#4a463c]">Wspomnienia z taśmy ({officialPhotos.length})</h2>
            <button onClick={() => handleDownloadZip(officialPhotos, 'Nasze_Wspomnienia')} disabled={isZipping || officialPhotos.length === 0} className="flex items-center gap-2 px-3 py-1.5 bg-[#ebe8e1] hover:bg-[#d1cec7] text-[#4a463c] text-sm font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer">
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />} Pobierz ZIP
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {officialPhotos.map(photo => (
              <div key={photo.id} className="relative bg-white rounded-md shadow-sm border border-[#ebe8e1] overflow-hidden group">
                <div className="aspect-[4/5]"><img src={photo.image_url} alt="Admin View" className="w-full h-full object-cover" /></div>
                <button onClick={() => handleDelete(photo.id, photo.image_url)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-90 hover:opacity-100 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <div className="flex justify-between items-end border-b border-[#ebe8e1] pb-2 mb-4">
            <h2 className="text-xl font-serif font-light text-[#4a463c]">Zdjęcia od gości ({guestPhotos.length})</h2>
            <button onClick={() => handleDownloadZip(guestPhotos, 'Zdjecia_Gosci')} disabled={isZipping || guestPhotos.length === 0} className="flex items-center gap-2 px-3 py-1.5 bg-[#ebe8e1] hover:bg-[#d1cec7] text-[#4a463c] text-sm font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer">
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />} Pobierz ZIP
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {guestPhotos.map(photo => (
              <div key={photo.id} className="relative bg-white rounded-md shadow-sm border border-[#ebe8e1] overflow-hidden group">
                <div className="aspect-square"><img src={photo.image_url} alt="Admin View" className="w-full h-full object-cover" /></div>
                <button onClick={() => handleDelete(photo.id, photo.image_url)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-90 hover:opacity-100 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CZEŚĆ WIDOCZNA TYLKO PODCZAS DRUKOWANIA */}
      <div className="hidden print:flex fixed inset-0 bg-white flex-col items-center justify-center text-center p-12">
        <h1 className="text-5xl font-serif font-light text-[#4a463c] mb-6">
          Uchwyć z nami <br/> ten moment!
        </h1>
        <p className="text-xl text-[#8a8578] font-light mb-12 max-w-md">
          Zeskanuj aparatem w telefonie ten kod i dorzuć swoje ujęcia do naszej wspólnej, weselnej galerii.
        </p>
        
        <div className="bg-white p-8 rounded-3xl border-2 border-[#ebe8e1] mb-8 shadow-sm">
          <QRCodeCanvas value={appUrl} size={300} fgColor="#4a463c" bgColor="#ffffff" level="H" />
        </div>
        
        <p className="text-lg text-[#a39f96] tracking-[0.2em] uppercase font-medium">
          {appUrl.replace(/^https?:\/\//, '')}
        </p>
      </div>

    </div>
  );
}