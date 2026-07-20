import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModal';
import { SEO } from '../components/SEO';
import '../assets/css/legal.css';

export function PrivacyPolicy() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <SEO
        title="Adatvédelmi Tájékoztató | Neolix"
        description="A Neolix Adatvédelmi Tájékoztatója. Tudj meg többet arról, hogyan kezeljük az adataidat."
        canonicalPath="/privacy-policy"
      />
      <Header onLoginClick={() => setIsAuthModalOpen(true)} />

      <main className="legal-wrapper">
        <article className="legal-card">
          <h1>Adatkezelési Tájékoztató</h1>
          <p>Utolsó frissítés: 2026. június 22.</p>

          <p>A <strong>Neolix Studio</strong> (a továbbiakban: "Szolgáltató", "Adatkezelő") elkötelezett a felhasználók (a továbbiakban: "Felhasználó", "Érintett") személyes adatainak védelme iránt. Ez az Adatkezelési Tájékoztató bemutatja, hogyan kezeljük, tároljuk és védjük az Ön adatait a honlapunk használata során, összhangban a GDPR (Általános Adatvédelmi Rendelet - EU 2016/679) és a vonatkozó helyi jogszabályok előírásaival.</p>

          <h2>1. Az Adatkezelő adatai</h2>
          <p>
            <strong>Cégnév:</strong> [Neolix Studio]<br />
            <strong>Székhely:</strong> [Cabaj 252, Cabaj-Čápor 951 17 Szlovákia]<br />
            <strong>Cégjegyzékszám / Cégnyilvántartási szám:</strong> [N/A]<br />
            <strong>Adószám:</strong> [N/A]<br />
            <strong>Kapcsolattartási e-mail cím:</strong> [info@neolix.studio]
          </p>

          <h2>2. A kezelt adatok köre, célja és jogalapja</h2>

          <h3>2.1. Vendég (Guest) munkamenet</h3>
          <p>Amennyiben Ön regisztráció nélkül, vendégként használja az oldalt, nem gyűjtünk és nem tárolunk semmilyen közvetlen személyes adatot (például nevet vagy e-mail címet). A haladásának (XP, napi széria, teljesített leckék) mentéséhez és az isolated vendégélmény biztosításához a böngészője helyi tárhelyét (<strong>LocalStorage</strong>) használjuk.</p>
          <ul>
            <li><strong>Kezelt adatok köre:</strong> Tanulási előrehaladási adatok, XP pontok, napi széria számláló, feloldott virtuális jutalmak, kiválasztott felületi téma.</li>
            <li><strong>Adatkezelés célja:</strong> A felhasználói élmény és tanulási folyamat folyamatosságának biztosítása regisztráció nélkül.</li>
            <li><strong>Adatkezelés jogalapja:</strong> A felhasználó kifejezett hozzájárulása (GDPR 6. cikk (1) bekezdés a) pont) azáltal, hogy elindítja a vendég munkamenetet.</li>
          </ul>

          <h3>2.2. Regisztrált felhasználók</h3>
          <p>Amikor fiókot hoz létre a platformon, az alábbi személyes adatokat kezeljük a tanulói fiók biztosítása érdekében:</p>
          <ul>
            <li><strong>E-mail cím:</strong> Szükséges a bejelentkezéshez, a fiók azonosításához és a jelszó-visszaállítási folyamatokhoz. (Jogalap: Szerződés teljesítése - GDPR 6. cikk (1) b) pont).</li>
            <li><strong>Felhasználónév:</strong> A profil személyre szabásához és a felületen való megjelenítéshez. (Jogalap: Szerződés teljesítése - GDPR 6. cikk (1) b) pont).</li>
            <li><strong>Életkori csoport (Age range):</strong> A tananyag és a statisztikák optimalizálása, valamint statisztikai elemzések céljából gyűjtve. (Jogalap: Szerződés teljesítése / Jogos érdek - GDPR 6. cikk (1) b) és f) pont).</li>
            <li><strong>Jelszó:</strong> Titkosított formában (hash) tárolva a fiók biztonságos hozzáféréséhez. (Jogalap: Szerződés teljesítése - GDPR 6. cikk (1) b) pont).</li>
            <li><strong>Tanulási statisztikák és előrehaladás:</strong> XP pontok, szintek, napi aktivitási széria, megkezdett és befejezett leckék, teszteredmények, feloldott témák és elemek. (Jogalap: Szerződés teljesítése - GDPR 6. cikk (1) b) pont).</li>
          </ul>

          <h3>2.3. Biztonsági naplófájlok (Server Logs)</h3>
          <p>A weboldal látogatásakor a szerverünk automatikusan rögzít bizonyos technikai adatokat a biztonságos működés fenntartása érdekében.</p>
          <ul>
            <li><strong>Kezelt adatok köre:</strong> IP-cím, látogatás időpontja, megnyitott oldalak, a böngésző típusa és az operációs rendszer verziója.</li>
            <li><strong>Adatkezelés célja:</strong> Visszaélések és kibertámadások megelőzése, a rendszer stabilitásának ellenőrzése.</li>
            <li><strong>Adatkezelés jogalapja:</strong> Az adatkezelő jogos érdeke a hálózati és informatikai biztonság fenntartására (GDPR 6. cikk (1) bekezdés f) pont).</li>
          </ul>

          <h2>3. Az adatok tárolási helye és az adatfeldolgozók</h2>
          <p>Az Ön személyes adatait az Európai Unión belül található biztonságos szervereken tároljuk. A szerverüzemeltetési és webtárhely-szolgáltatásokat a következő adatfeldolgozó partnerünk biztosítja:</p>
          <p>
            <strong>Webtárhely-szolgáltató (Adatfeldolgozó):</strong><br />
            WebSupport, s.r.o.<br />
            Karadžičova 12, 821 08 Bratislava, Szlovákia<br />
            Weboldal: websupport.sk
          </p>

          <h2>4. Az adatkezelés időtartama</h2>
          <ul>
            <li><strong>Vendég munkamenet adatai:</strong> Addig tárolódnak a böngészőjében (LocalStorage), amíg Ön nem törli azokat az alkalmazás profil beállításainál ("Összes adat törlése és Újrakezdés" gombbal) vagy a böngésző gyorsítótárának ürítésével.</li>
            <li><strong>Regisztrált felhasználói adatok:</strong> A felhasználói fiók aktív fennállásáig tároljuk. A Felhasználó bármikor kezdeményezheti fiókja és adatainak törlését az ügyfélszolgálatunkon keresztül.</li>
            <li><strong>Biztonsági szerver naplók:</strong> Legfeljebb 30 napig tárolódnak, ezt követően automatikusan felülírásra vagy törlésre kerülnek, kivéve, ha biztonsági incidens kivizsgálásához szükségesek.</li>
          </ul>

          <h2>5. Az érintettek jogai</h2>
          <p>Önt a személyes adataival kapcsolatban a GDPR értelmében az alábbi jogok illetik meg:</p>
          <ul>
            <li><strong>Hozzáférés joga:</strong> Jogosult tájékoztatást kérni arról, hogy kezeljük-e az Ön személyes adatait, és ha igen, milyen adatokat kezelünk.</li>
            <li><strong>Helyesbítés joga:</strong> Kérheti a pontatlan vagy hiányos adatai módosítását.</li>
            <li><strong>Törléshez való jog ("az elfeledtetéshez való jog"):</strong> Kérheti adatainak törlését, ha az adatkezelés célja megszűnt, vagy ha visszavonja hozzájárulását.</li>
            <li><strong>Adatkezelés korlátozásának joga:</strong> Meghatározott esetekben kérheti, hogy adatait csak tároljuk, de egyéb módon ne kezeljük.</li>
            <li><strong>Adathordozhatósághoz való jog:</strong> Kérheti, hogy adatait tagolt, gépileg olvasható formátumban adjuk át Önnek, vagy továbbítsuk egy másik adatkezelőnek.</li>
            <li><strong>Tiltakozáshoz való jog:</strong> Tiltakozhat személyes adatainak jogos érdeken alapuló kezelése ellen.</li>
          </ul>
          <p>Ezen jogok gyakorlására irányuló kérelmét az 1. pontban megadott kapcsolattartási e-mail címre küldött levélben jelezheti. A kérelem beérkezését követően legfeljebb 30 napon belül válaszolunk és intézkedünk.</p>

          <h2>6. Jogorvoslati lehetőségek</h2>
          <p>Amennyiben úgy véli, hogy személyes adatainak kezelése során megsértettük a vonatkozó adatvédelmi jogszabályokat, panasszal fordulhat a helyi adatvédelmi hatósághoz:</p>
          <p>
            <strong>Magyarországon:</strong><br />
            Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)<br />
            Cím: 1055 Budapest, Falk Miksa utca 9-11.<br />
            E-mail: ugyfelszolgalat@naih.hu | Web: www.naih.hu
          </p>
          <p>
            <strong>Szlovákiában (bejegyzés helye szerint):</strong><br />
            Úrad na ochranu osobných údajov Slovenskej republiky (Slovak Adatvédelmi Hatóság)<br />
            Cím: Hraničná 12, 820 07 Bratislava 27, Szlovákia<br />
            E-mail: statny.dozor@pdp.gov.sk | Web: dataprotection.gov.sk
          </p>
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
