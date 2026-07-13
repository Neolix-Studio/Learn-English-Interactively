import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Gateway } from './pages/Gateway';
import { ProfilePage } from './pages/ProfilePage';
import { FriendsPage } from './pages/FriendsPage';

import { Contact } from './pages/Contact';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Terms } from './pages/Terms';
import { Impressum } from './pages/Impressum';
import { WelcomeLayout } from './pages/Welcome/WelcomeLayout';
import { WelcomeStartScreen } from './pages/Welcome/WelcomeStartScreen';
import { HearAboutUsScreen } from './pages/Welcome/HearAboutUsScreen';
import { WhyLearningScreen } from './pages/Welcome/WhyLearningScreen';
import { ExperienceScreen } from './pages/Welcome/ExperienceScreen';
import { PlacementScreen } from './pages/Welcome/PlacementScreen';
import { NotFoundPage } from './pages/NotFoundPage';
import { FTUELesson } from './pages/Welcome/FTUELesson';
import { CharactersPage } from './pages/Characters';
import { CharacterLesson } from './pages/Characters/CharacterLesson';
import { LeaderboardPage } from './pages/Leaderboard';
import { PracticePage } from './pages/PracticePage';
import { AchievementPopup } from './components/AchievementPopup';
import { AuthModal } from './components/AuthModal';

import { UserProvider } from './context/UserContext';
import { ShopProvider } from './context/ShopContext';

function App() {
  const isGatewayDomain = window.location.hostname === 'lexipaws.eu' || window.location.hostname === 'www.lexipaws.eu';

  // Detect password reset link: ?action=reset_password&token=...
  const searchParams = new URLSearchParams(window.location.search);
  const urlAction = searchParams.get('action');
  const urlToken = searchParams.get('token') || '';
  const isResetLink = urlAction === 'reset_password' && urlToken.length > 0;

  const [resetModalOpen, setResetModalOpen] = useState(isResetLink);

  return (
    <HelmetProvider>
      <UserProvider>
        <ShopProvider>
        <Router>
          <Routes>
            {/* Render Gateway on .eu domain, else render Home */}
            <Route path="/" element={isGatewayDomain ? <Gateway /> : <Home />} />
            
            {/* Welcome Flow */}
            <Route path="/welcome" element={<WelcomeLayout />}>
              <Route path="start" element={<WelcomeStartScreen />} />
              <Route path="hear-about-us" element={<HearAboutUsScreen />} />
              <Route path="why-learning" element={<WhyLearningScreen />} />
              <Route path="experience" element={<ExperienceScreen />} />
              <Route path="placement" element={<PlacementScreen />} />
            </Route>
            
            {/* FTUE Lesson */}
            <Route path="/lesson/ftue" element={<FTUELesson />} />
            <Route path="/lesson/characters/:id" element={<CharacterLesson />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/impressum" element={<Impressum />} />
            
            {/* Manual gateway route for testing on localhost */}
            <Route path="/gateway" element={<Gateway />} />

            {/* 404 Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <AchievementPopup />
        </Router>

        {/* Password reset modal — triggered by email link (?action=reset_password&token=...) */}
        {isResetLink && (
          <AuthModal
            isOpen={resetModalOpen}
            onClose={() => setResetModalOpen(false)}
            initialView="reset"
            resetToken={urlToken}
          />
        )}
        </ShopProvider>
      </UserProvider>
    </HelmetProvider>
  );
}

export default App;
