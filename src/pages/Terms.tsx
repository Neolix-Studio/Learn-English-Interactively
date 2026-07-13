import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModal';
import { SEO } from '../components/SEO';
import '../assets/css/legal.css';

export function Terms() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <SEO 
        title="Általános Szerződési Feltételek | Neolix"
        description="A Neolix Általános Szerződési Feltételei."
        canonicalPath="/terms"
      />
      <Header onLoginClick={() => setIsAuthModalOpen(true)} />

      <main className="legal-wrapper">
        <article className="legal-card">
          <h1>Általános Szerződési Feltételek (ÁSZF)</h1>
          <p>Utolsó frissítés: 2026. június 22.</p>
          
          <p>Üdvözöljük a <strong>Lexipaws</strong> honlapján! Jelen Általános Szerződési Feltételek (a továbbiakban: "ÁSZF") szabályozzák Ön (a továbbiakban: "Felhasználó") és a Szolgáltató között létrejött jogviszonyt a weboldal és az azon keresztül kínált online angol nyelvtanulási szolgáltatások igénybevétele során.</p>

          <h2>1. A Szolgáltató adatai</h2>
          <p>
            <strong>Szolgáltató neve:</strong> [Neolix Studio]<br />
            <strong>Székhelye:</strong> [Cabaj 252, Cabaj-Čápor 951 17 Szlovákia]<br />
            <strong>Cégjegyzékszám / Cégnyilvántartási szám:</strong> [N/A]<br />
            <strong>Adószám:</strong> [N/A]<br />
            <strong>E-mail cím:</strong> [info@neolix.studio]
          </p>

          <h2>2. Feltételek elfogadása és a szolgáltatás köre</h2>
          <p>A weboldal látogatásával, vendégként történő használatával vagy a regisztráció elvégzésével Ön feltétel nélkül elfogadja a jelen ÁSZF-et és az Adatkezelési Tájékoztatót. Amennyiben nem ért egyet a feltételekkel, kérjük, ne használja a szolgáltatásainkat.</p>
          <p>A Lexipaws interaktív, gamifikált online angol nyelvtanulást biztosít magyar anyanyelvű tanulóknak. A szolgáltatás magában foglalja a nyelvtani magyarázatokat, szószedeteket, interaktív feladatokat, szintzáró vizsgákat, valamint a személyes profil statisztikákat és játékos elemeket (XP, napi széria, témák feloldása).</p>

          <h2>3. Felhasználói fiókok és regisztráció</h2>
          <ul>
            <li><strong>Vendég (Guest) munkamenet:</strong> A Felhasználó regisztráció nélkül is kipróbálhatja a platformot. Ekkor a haladási adatai kizárólag a böngészője helyi tárhelyén (LocalStorage) mentődnek, és a böngészőből való törlés vagy gyorsítótár-ürítés esetén elveszhetnek.</li>
            <li><strong>Regisztrált fiók:</strong> A teljes körű haladásmentéshez ingyenes fiók létrehozása javasolt. A regisztráció során valós e-mail címet, felhasználónevet és életkori csoportot szükséges megadni.</li>
            <li><strong>Biztonság:</strong> A Felhasználó köteles jelszavát titokban tartani. A fiókkal végzett minden tevékenységért a Felhasználó felel.</li>
          </ul>

          <h2>4. Szellemi tulajdonjogok</h2>
          <p>A Lexipaws weboldalon található minden tartalom – beleértve, de nem kizárólagosan a leckék szövegeit, magyar nyelvű magyarázatokat, feladatok felépítését, grafikákat, logókat, forráskódot, szintetizált hangfájlokat, dizájnelemeket és adatbázisokat – a Szolgáltató kizárólagos szellemi tulajdonát képezi, vagy azokat jogszerű licenc alapján használja.</p>
          <p>A szolgáltatás igénybevétele során a Felhasználó nem kizárólagos, nem átruházható, személyes használatra szóló licencet kap a tananyagok megtekintésére és a feladatok elvégzésére. Tilos a tartalom másolása, többszörözése, terjesztése, értékesítése, lekaparása (scraping) vagy bármely más kereskedelmi célú felhasználása a Szolgáltató előzetes írásbeli engedélye nélkül.</p>

          <h2>5. Felelősség korlátozása</h2>
          <p>A szolgáltatásokat "ahogy van" (as is) és "ahogy elérhető" (as available) állapotban nyújtjuk. Nem garantáljuk a rendszer teljesen hibamentes és megszakítás nélküli működését, valamint a tananyagok abszolút sikerét a nyelvvizsgákon vagy egyéb megmérettetéseken.</p>
          <p>Szolgáltató nem vállal felelősséget semmilyen közvetett vagy közvetlen kárért, adatvesztésért (például LocalStorage törlődése vendég fiók esetén) vagy elmaradt haszonért, amely a szolgáltatás használatából vagy használatának lehetetlenségéből ered.</p>

          <h2>6. Előfizetések és jövőbeli prémium szolgáltatások</h2>
          <p>Jelenleg a szolgáltatás béta verzióban érhető el ingyenesen a felhasználók számára. A Szolgáltató fenntartja a jogot, hogy a jövőben díjköteles prémium előfizetési terveket vagy funkciókat vezessen be. Ezen fizetős konstrukciók bevezetése előtt a felhasználók megfelelő tájékoztatást kapnak, és a szolgáltatások megvásárlása önkéntes alapon történik.</p>

          <h2>7. Magatartási szabályok és fiók felfüggesztése</h2>
          <p>A Felhasználó vállalja, hogy nem használja a platformot jogellenes célokra, nem kísérli meg kijátszani a biztonsági rendszereket, nem hajt végre automatizált lekérdezéseket (robotok, scraperek), és nem próbálja meg szándékosan manipulálni a gamifikált XP pontokat vagy szinteket.</p>
          <p>A Szolgáltató fenntartja a jogot, hogy figyelmeztetés nélkül felfüggessze vagy véglegesen törölje azon Felhasználók fiókját, akik megsértik a jelen ÁSZF rendelkezéseit vagy visszaélésszerűen használják a rendszert.</p>

          <h2>8. Irányadó jog és jogviták</h2>
          <p>A jelen ÁSZF-re és a felek közötti szerződésre a szlovák jog (illetve az EU fogyasztóvédelmi és e-kereskedelmi irányelvei) az irányadó. A felek a jogvitákat elsősorban békés úton, tárgyalások útján törekednek rendezni. Amennyiben ez nem vezet eredményre, a jogviták elbírálására a Szolgáltató székhelye szerint illetékes bíróság rendelkezik kizárólagos illetékességgel.</p>

          <h2>9. Az ÁSZF módosítása</h2>
          <p>A Szolgáltató jogosult a jelen ÁSZF-et bármikor egyoldalúan módosítani, különösen a szolgáltatások bővülése vagy a jogszabályi környezet változása esetén. A módosításról a weboldalon tájékoztatjuk a látogatókat. A szolgáltatás további használata a módosított ÁSZF elfogadásának minősül.</p>
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
