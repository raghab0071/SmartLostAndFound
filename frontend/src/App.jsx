import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import FloatingTipsWidget from './components/FloatingTipsWidget.jsx'
import ProfileCompletionModal from './components/ProfileCompletionModal.jsx'
import AdminCentreOnboardingModal from './components/AdminCentreOnboardingModal.jsx'

import HomePage from './pages/HomePage.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import CentresPage from './pages/CentresPage.jsx'
import CentreDetailPage from './pages/CentreDetailPage.jsx'
import NoticesPage from './pages/NoticesPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import ItemDetailPage from './pages/ItemDetailPage.jsx'
import StudentLoginPage from './pages/StudentLoginPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import OauthRedirectPage from './pages/OauthRedirectPage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'

import StudentLayout from './pages/student/StudentLayout.jsx'
import StudentDashboard from './pages/student/StudentDashboard.jsx'
import StudentReport from './pages/student/StudentReport.jsx'
import StudentMyReports from './pages/student/StudentMyReports.jsx'
import StudentMyClaims from './pages/student/StudentMyClaims.jsx'
import StudentNotifications from './pages/student/StudentNotifications.jsx'

import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminFoundItems from './pages/admin/AdminFoundItems.jsx'
import AdminFoundItemForm from './pages/admin/AdminFoundItemForm.jsx'
import AdminLostReports from './pages/admin/AdminLostReports.jsx'
import AdminClaims from './pages/admin/AdminClaims.jsx'
import AdminCentres from './pages/admin/AdminCentres.jsx'

export default function App() {
  const { user } = useAuth()
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/centres" element={<CentresPage />} />
            <Route path="/centres/:centreId" element={<CentreDetailPage />} />
            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/items/:itemId" element={<ItemDetailPage />} />
            <Route path="/login/student" element={<StudentLoginPage />} />
            <Route path="/login/admin" element={<AdminLoginPage />} />
            <Route path="/profile" element={<OauthRedirectPage />} />
            <Route
              path="/me"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute role="student">
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
              <Route path="report" element={<StudentReport />} />
              <Route path="my-reports" element={<StudentMyReports />} />
              <Route path="my-claims" element={<StudentMyClaims />} />
              <Route path="notifications" element={<StudentNotifications />} />
            </Route>

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="found" element={<AdminFoundItems />} />
              <Route path="found/new" element={<AdminFoundItemForm />} />
              <Route path="found/:itemId/edit" element={<AdminFoundItemForm />} />
              <Route path="lost" element={<AdminLostReports />} />
              <Route path="claims" element={<AdminClaims />} />
              <Route path="centres" element={<AdminCentres />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        {/* Onboarding overlays — only render when needed */}
        {user && !user.profile_complete && <ProfileCompletionModal />}
        {user?.role === 'admin' && user.profile_complete && <AdminCentreOnboardingModal />}
        <FloatingTipsWidget />
      </div>
    </ThemeProvider>
  )
}

function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center px-4" data-testid="not-found-page">
      <div>
        <div className="text-7xl font-black text-brand-900/10">404</div>
        <div className="text-xl font-bold text-brand-900 mt-2">Page not found</div>
      </div>
    </div>
  )
}
