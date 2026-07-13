import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModal';
import { SEO } from '../components/SEO';
import '../assets/css/legal.css';

export function Impressum() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <SEO 
        title="Impresszum | Neolix"
        description="A Neolix platform üzemeltetőjének adatai és elérhetőségei."
        canonicalPath="/impressum"
      />
      <Header onLoginClick={() => setIsAuthModalOpen(true)} />

      <main className="legal-wrapper">
        <article className="legal-card">
          <h1>Impresszum (Impresszum / Identifikačné údaje)</h1>
          <p>Utolsó frissítés: 2026. június 22.</p>
          
          <p>Az elektronikus kereskedelmi szolgáltatásokról szóló EU-irányelvek és a helyi jogszabályok (Szlovákia / Magyarország) alapján az alábbiakban olvashatók a Lexipaws üzemeltetőjének hivatalos adatai:</p>

          <h2>1. A Szolgáltató (Honlap üzemeltetője) adatai</h2>
          <p>
            <strong>Hivatalos cégnév:</strong> [Neolix Studio]<br />
            <strong>Székhely / Postacím:</strong> [Cabaj 252, Cabaj-Čápor 951 17 Szlovákia]<br />
            <strong>Cégjegyzékszám / Cégnyilvántartási szám (IČO):</strong> [N/A]<br />
            <strong>Adószám (DIČ):</strong> [N/A]<br />
            <strong>Közösségi adószám (IČ DPH):</strong> [N/A]<br />
            <strong>Nyilvántartást vezető cégbíróság:</strong> [N/A]<br />
            <strong>Törvényes képviselő / Ügyvezető:</strong> [Ladislav Szép]
          </p>

          <h2>2. Kapcsolattartás és Panaszkezelés</h2>
          <p>Amennyiben kérdése, észrevétele vagy adatkezelési törlési kérése van, az alábbi e-mail címen közvetlenül elérhet minket:</p>
          <p>
            <strong>E-mail cím:</strong> info@neolix.studio
          </p>

          <h2>3. Egyéni Angol Oktatás / Magánórák (Tutoring)</h2>
          <p>
            A platformon kívül egyéni online angol nyelvoktatást, korrepetálást és felkészítést is vállalok. <br />
            <strong>Magánórák díja:</strong> 15 € / 50 perc.<br />
            Kapcsolatfelvételre a fenti e-mail címen vagy a Kapcsolat oldalon keresztül van lehetőség.
          </p>

          <h2>4. Tárhelyszolgáltató (Hosting Provider) adatai</h2>
          <p>A weboldal szervereit az alábbi szolgáltató biztosítja és üzemelteti:</p>
          <p>
            <strong>Cégnév:</strong> WebSupport, s.r.o.<br />
            <strong>Székhely:</strong> Karadžičova 12, 821 08 Bratislava, Szlovákia<br />
            <strong>Kapcsolat / E-mail:</strong> info@websupport.sk<br />
            <strong>Weboldal:</strong> websupport.sk
          </p>

          <h2>5. Vitarendezés (OVR)</h2>
          <p>Az Európai Bizottság platformot biztosít az online vitarendezéshez (OVR), amely a következő linken érhető el: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-in)', textDecoration: 'underline' }}>https://ec.europa.eu/consumers/odr</a>. Nem vagyunk kötelesek részt venni a fogyasztói békéltető testület előtti vitarendezési eljárásban.</p>
        </article>

        <div className="back-link-container">
          <Link to="/" className="btn-back">Vissza a főoldalra</Link>
        </div>
      </main>

      <Footer />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}
