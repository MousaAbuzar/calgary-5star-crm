// App.js — The root component of the React application
// Defines the routing structure — which URL shows which page

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Campaigns from './pages/Campaigns';
import Calendar from './pages/Calendar';
import Emails from './pages/Emails';
import './App.css';

function App() {
  return (
    // BrowserRouter enables URL-based navigation (uses the browser history API)
    <BrowserRouter>
      {/* Toaster renders toast notifications at the top-right of the screen */}
      <Toaster position="top-right" />

      {/* Navbar appears on every page */}
      <Navbar />

      <main className="main-content">
        {/* Routes = the router outlet — renders the matching page component */}
        <Routes>
          {/* Navigate redirects / to /dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/emails" element={<Emails />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
