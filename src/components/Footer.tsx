import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  useEffect(() => {
    let intervalId: any;
    let attempts = 0;

    const initHeadway = () => {
      attempts++;
      // @ts-ignore
      if (window.Headway && typeof window.Headway.getNewWidget === 'function' && document.querySelector(".changelog-footer-anchor")) {
        // @ts-ignore
        const headwayInstance = window.Headway.getNewWidget();
        headwayInstance.init({
          selector: ".changelog-footer-anchor",
          account: "xWE06J",
          trigger: ".changelog-footer-anchor"
        });
        clearInterval(intervalId);
      } else if (attempts > 30) {
        clearInterval(intervalId);
      }
    };

    initHeadway();
    intervalId = setInterval(initHeadway, 500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="footer-logo">NeolixStudio</span>
          <p>Online angol nyelvtanulás magyaroknak, egyszerűen és hatékonyan.</p>
        </div>
        
        <nav className="footer-nav" aria-label="Lábléc navigáció">
          <ul className="footer-links">
            <li><a href="#">Gyakran Ismételt Kérdések (GYIK)</a></li>
            <li><Link to="/privacy-policy">Adatkezelési Tájékoztató</Link></li>
            <li><Link to="/terms">ÁSZF</Link></li>
            <li><Link to="/impressum">Impresszum</Link></li>
            <li><Link to="/contact">Kapcsolat</Link></li>
            <li>
              <div className="changelog-footer-anchor" style={{ cursor: 'pointer', display: 'inline-block' }}>
                {t('sidebar.changelog', 'Újdonságok')}
              </div>
            </li>
          </ul>
        </nav>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 NeolixStudio. Minden jog fenntartva.</p>
      </div>
    </footer>
  );
}
