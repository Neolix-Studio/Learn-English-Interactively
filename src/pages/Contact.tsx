import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModal';
import { SEO } from '../components/SEO';
import '../assets/css/legal.css';

export function Contact() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText('info@neolix.studio').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('contactName') as string;
    const email = formData.get('contactEmail') as string;
    const message = formData.get('contactMessage') as string;

    if (!name) return showStatus('Kérjük, adja meg a nevét!', 'error');
    if (!email) return showStatus('Kérjük, adja meg az e-mail címét!', 'error');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) return showStatus('Kérjük, valós e-mail címet adjon meg!', 'error');
    if (!message) return showStatus('Az üzenet mező nem lehet üres!', 'error');

    console.log('Kapcsolat űrlap küldés:', { name, email, message });
    showStatus('Köszönjük! Az üzenetét sikeresen rögzítettük, hamarosan felvesszük Önnel a kapcsolatot.', 'success');
    e.currentTarget.reset();
  };

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusText(text);
    setStatusType(type);
  };

  return (
    <>
      <SEO
        title="Kapcsolat | Neolix"
        description="Vedd fel velünk a kapcsolatot, ha kérdésed van a nyelvtanulással vagy a platformmal kapcsolatban."
        canonicalPath="/contact"
      />
      <Header onLoginClick={() => setIsAuthModalOpen(true)} />

      <main className="legal-wrapper">
        <article className="legal-card">
          <h1>Kapcsolat (Contact)</h1>
          <p>Utolsó frissítés: 2026. június 24.</p>

          <div className="contact-grid">
            <div>
              <h2>1. Kapcsolattartási Csatornák</h2>
              <p>
                Bármilyen kérdés, észrevétel vagy technikai segítségnyújtás esetén az alábbi e-mail címen tudja elérni ügyfélszolgálatunkat:
              </p>
              <p>
                <strong>Ügyfélszolgálat / Support E-mail:</strong> <br />
                <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-text-main)' }}>info@neolix.studio</span>
                <button className="copy-btn" onClick={copyEmail}>
                  {copied ? <span>✅ Másolva!</span> : <span>📋 Másolás</span>}
                </button>
              </p>

              <h2>2. Hivatalos Cégadatok (Szolgáltató)</h2>
              <p>A platformot egyéni vállalkozóként üzemeltetem az EU-s irányelvek és a helyi jogszabályoknak megfelelően:</p>
              <p>
                <strong>Név / Üzemeltető:</strong> Ladislav Szép<br />
                <strong>Székhely / Postacím:</strong> Cabaj 252, Cabaj-Čápor 951 17 Szlovákia<br />
                <strong>Cégjegyzékszám / Cégnyilvántartási szám (IČO):</strong> [Feltöltés alatt / Registration number]<br />
                <strong>Adószám (DIČ):</strong> [Feltöltés alatt / Tax ID]<br />
                <strong>Közösségi adószám (IČ DPH):</strong> [Feltöltés alatt / VAT ID]<br />
                <strong>Nyilvántartást vezető hatóság:</strong> [Feltöltés alatt / Court Registry]
              </p>

              <h2>3. Egyéni Angol Oktatás / Magánórák (Tutoring)</h2>
              <p>A platform mellett egyéni online angol nyelvoktatást és korrepetálást is vállalok diákok részére:</p>
              <p style={{ background: 'oklch(1 0 0 / 0.05)', padding: '0.8rem 1.2rem', borderRadius: '8px', border: '1px dashed var(--color-accent-in)', display: 'inline-block', marginBottom: '1.2rem' }}>
                <strong>Óradíj:</strong> <span style={{ color: 'var(--color-accent-in)', fontSize: '1.1rem', fontWeight: 'bold' }}>15 € / 50 perc</span>
              </p>
              <p>Amennyiben egyéni órákra szeretne jelentkezni, vagy további részletek érdeklik, jelezze szándékát az oldalsó űrlapon vagy közvetlenül e-mailben!</p>

              <h2>4. Digitális Működés</h2>
              <p style={{ borderLeft: '3px solid var(--color-accent-in)', paddingLeft: '1rem', fontStyle: 'italic' }}>
                <strong>Fontos megjegyzés:</strong> A Neolix Studio teljesen digitálisan működik. Nem tartunk fenn fizikai ügyfélszolgálatot, így személyes ügyfélfogadásra vagy walk-in segítségnyújtásra nincs lehetőség. Minden megkeresést online és e-mailen keresztül kezelünk.
              </p>
            </div>

            <div>
              <h2>Írjon nekünk üzenetet</h2>
              <p>Használhatja az alábbi űrlapot is az azonnali üzenetküldéshez:</p>

              <form className="contact-form" noValidate onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="contactName">Név</label>
                  <input type="text" id="contactName" name="contactName" className="form-control" placeholder="Az Ön neve" required />
                </div>
                <div className="form-group">
                  <label htmlFor="contactEmail">E-mail cím</label>
                  <input type="email" id="contactEmail" name="contactEmail" className="form-control" placeholder="pelda@domain.com" required />
                </div>
                <div className="form-group">
                  <label htmlFor="contactMessage">Üzenet</label>
                  <textarea id="contactMessage" name="contactMessage" className="form-control" placeholder="Miben segíthetünk?" required></textarea>
                </div>
                <button type="submit" className="btn-submit">Küldés</button>
              </form>

              {statusText && (
                <div className={`status-message status-${statusType}`} style={{ display: 'block' }}>
                  {statusText}
                </div>
              )}
            </div>
          </div>
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
