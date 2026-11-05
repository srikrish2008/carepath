import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LandingPage } from '../pages/LandingPage';
import { NextStepBanner } from '../components/journey/NextStepBanner';
import { Header } from '../components/common/Header';
import { Sidebar } from '../components/common/Sidebar';
import { I18nProvider } from '../i18n';
import { AuthProvider } from '../context/AuthContext';
import { AppDataProvider } from '../context/AppDataContext';
import { storage } from '../services/database/storage';
import { getOrCreatePatientJourney } from '../services/journey/journeyTracker';

describe('Module A & C — Dashboard & Navigation Tests (8 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. renders landing page with official CarePath tagline', () => {
    render(
      <I18nProvider>
        <LandingPage onStart={() => {}} onExplore={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText(/Healthcare access,/i)).toBeInTheDocument();
    expect(screen.getByText(/without the confusion/i)).toBeInTheDocument();
  });

  it('2. renders Start My Healthcare Journey CTA button on landing page', () => {
    render(
      <I18nProvider>
        <LandingPage onStart={() => {}} onExplore={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: /Start My Healthcare Journey/i })).toBeInTheDocument();
  });

  it('3. renders YOUR NEXT STEP banner on personalized patient view', () => {
    const journey = getOrCreatePatientJourney('usr-demo-patient-01');
    render(
      <I18nProvider>
        <NextStepBanner journey={journey} onActionClick={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText(/Your Next Administrative Step/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take Action/i })).toBeInTheDocument();
  });

  it('4. renders persistent sidebar navigation with core patient links', () => {
    render(
      <I18nProvider>
        <AuthProvider>
          <Sidebar currentPage="dashboard" onNavigate={() => {}} />
        </AuthProvider>
      </I18nProvider>
    );
    expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Find Healthcare/i)).toBeInTheDocument();
    expect(screen.getByText(/My Appointments/i)).toBeInTheDocument();
    expect(screen.getByText(/Documents/i)).toBeInTheDocument();
    expect(screen.getByText(/CarePath AI/i)).toBeInTheDocument();
  });

  it('5. renders header with synthetic demo disclaimer for hackathon evaluation', () => {
    render(
      <I18nProvider>
        <AuthProvider>
          <AppDataProvider>
            <Header onNavigate={() => {}} currentPage="dashboard" />
          </AppDataProvider>
        </AuthProvider>
      </I18nProvider>
    );
    expect(screen.getByText(/HACKATHON DEMO MODE:/i)).toBeInTheDocument();
    expect(screen.getByText(/Open C09 & C02 Lab/i)).toBeInTheDocument();
  });

  it('6. provides accessible language switcher in the header', () => {
    render(
      <I18nProvider>
        <AuthProvider>
          <AppDataProvider>
            <Header onNavigate={() => {}} currentPage="dashboard" />
          </AppDataProvider>
        </AuthProvider>
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: /Switch to English/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to Tamil/i })).toBeInTheDocument();
  });

  it('7. displays judge demo role switcher pill in header', () => {
    render(
      <I18nProvider>
        <AuthProvider>
          <AppDataProvider>
            <Header onNavigate={() => {}} currentPage="dashboard" />
          </AppDataProvider>
        </AuthProvider>
      </I18nProvider>
    );
    expect(screen.getByText(/Patient Mode|Admin Mode/i)).toBeInTheDocument();
  });

  it('8. provides Admin Console navigation link with C02/C09 constraint badges', () => {
    render(
      <I18nProvider>
        <AuthProvider>
          <Sidebar currentPage="dashboard" onNavigate={() => {}} />
        </AuthProvider>
      </I18nProvider>
    );
    expect(screen.getByText(/Admin Console/i)).toBeInTheDocument();
    expect(screen.getByText(/C02 \/ C09/i)).toBeInTheDocument();
  });
});
