import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock } from 'lucide-react';

export default function Hero() {
  const [heroUrl, setHeroUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('author_name', '__HERO__') 
          .order('created_at', { ascending: false })
          .limit(1); 
        
        if (!error && data && data.length > 0) {
          setHeroUrl(data[0].image_url);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHero();
  }, []);

  return (
    // PRZYWRÓCONE: pt-2 i mb-8 (idealny, mniejszy odstęp do poziomej kreski)
    <div className="w-full relative pt-2 pb-0 mb-8">
      <a href="/admin" className="absolute top-4 right-4 p-2 text-[#d1cec7] hover:text-[#4a463c] transition-colors z-10" title="Panel Administratora">
        <Lock className="w-4 h-4" />
      </a>
      
      {/* PRZYWRÓCONE: Zwarte paddingi pt-6 i pb-2 zamiast wielkich przerw */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2 text-center flex flex-col items-center">
        
        {!loading && heroUrl && (
          <div className="w-48 h-48 md:w-64 md:h-64 mb-6 bg-[#f3f0e8] overflow-hidden rounded-2xl shadow-sm border border-[#ebe8e1] transition-all duration-500">
            <img src={heroUrl} alt="Para Młoda" className="w-full h-full object-cover"/>
          </div>
        )}
        
        <h1 className="text-4xl md:text-5xl font-serif font-light text-[#4a463c] tracking-wide mb-2">
          Milena & Michał
        </h1>
        <p className="text-sm md:text-base text-[#8a8578] font-light tracking-[0.2em] uppercase mb-6">
          26 Września 2026
        </p>
        
        <p className="text-lg text-[#6a665b] font-light leading-relaxed px-4 md:px-12 max-w-xl text-center">
          Cieszymy się, że tu jesteście! 🤍 Złapcie dzisiejsze momenty z Waszej perspektywy i dorzućcie je do naszej wspólnej galerii.
        </p>
      </div>
    </div>
  );
}