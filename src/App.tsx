import React, { useState } from 'react';
import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { JourneyPage } from './pages/JourneyPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminConsolePage } from './pages/AdminConsolePage';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('fac-metro-general');

  const navigateTo = (page: string) => {
    if (page.startsWith('facility/')) {
      const id = page.split('/')[1];
      setSelectedFacilityId(id);
      setCurrentPage('facilityDetail');
    } else {
      setCurrentPage(page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Publicly accessible pages for guest exploration
  const isPublicPage =
    currentPage === 'landing' ||
    currentPage === 'auth' ||
    currentPage === 'discovery' ||
    currentPage === 'facilityDetail';

  if (!isAuthenticated && !isPublicPage) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
        <Header onNavigate={navigateTo} currentPage={currentPage} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <AuthPage onSuccess={() => setCurrentPage('dashboard')} />
        </main>
      </div>
    );
  }

  const showSidebar = isAuthenticated && currentPage !== 'landing' && currentPage !== 'auth';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <Header onNavigate={navigateTo} currentPage={currentPage} />

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar on authenticated patient views */}
        {showSidebar && (
          <Sidebar currentPage={currentPage} onNavigate={navigateTo} />
        )}

        {/* Content Area */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 min-w-0 ${!showSidebar ? 'max-w-7xl mx-auto' : ''}`}>
          {currentPage === 'landing' && (
            <LandingPage
              onStart={() => navigateTo('dashboard')}
              onExplore={() => navigateTo('discovery')}
            />
          )}

          {currentPage === 'auth' && (
            <AuthPage onSuccess={() => navigateTo('dashboard')} />
          )}

          {currentPage === 'onboarding' && (
            <OnboardingPage onComplete={() => navigateTo('discovery')} />
          )}

          {currentPage === 'dashboard' && (
            <DashboardPage onNavigate={navigateTo} />
          )}

          {currentPage === 'discovery' && (
            <DiscoveryPage
              onNavigateFacilityDetail={(id) => {
                setSelectedFacilityId(id);
                setCurrentPage('facilityDetail');
              }}
              onNavigateAppointments={() => navigateTo('appointments')}
            />
          )}

          {currentPage === 'facilityDetail' && (
            <FacilityDetailPage
              facilityId={selectedFacilityId}
              onBack={() => navigateTo('discovery')}
              onNavigateAppointments={() => navigateTo('appointments')}
            />
          )}

          {currentPage === 'appointments' && (
            <AppointmentsPage
              onNavigateDiscovery={() => navigateTo('discovery')}
              onNavigateDocuments={() => navigateTo('documents')}
            />
          )}

          {currentPage === 'documents' && (
            <DocumentsPage onNavigateAppointments={() => navigateTo('appointments')} />
          )}

          {currentPage === 'journey' && (
            <JourneyPage onNavigatePage={navigateTo} />
          )}

          {currentPage === 'ai' && (
            <AIAssistantPage onNavigatePage={navigateTo} />
          )}

          {currentPage === 'notifications' && (
            <NotificationsPage onNavigatePage={navigateTo} />
          )}

          {currentPage === 'profile' && <ProfilePage />}

          {currentPage === 'admin' && <AdminConsolePage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppDataProvider>
          <AppContent />
        </AppDataProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
