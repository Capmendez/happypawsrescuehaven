import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import RequireStaff from './components/layout/RequireStaff';

// Public Pages
import Home from './pages/public/Home';
import Adopt from './pages/public/Adopt';
import PetDetail from './pages/public/PetDetail';
import AdoptApply from './pages/public/AdoptApply';
import Checkout from './pages/public/Checkout';
import Confirmation from './pages/public/Confirmation';
import Transport from './pages/public/Transport';
import About from './pages/public/About';
import Volunteer from './pages/public/Volunteer';
import Donate from './pages/public/Donate';
import Events from './pages/public/Events';
import Resources from './pages/public/Resources';
import Contact from './pages/public/Contact';
import FosterLocation from './pages/public/FosterLocation';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPets from './pages/admin/AdminPets';
import AdminPetForm from './pages/admin/AdminPetForm';
import AdminApplications from './pages/admin/AdminApplications';
import AdminLayout from './components/layout/AdminLayout';
import AdminPaymentMethods from './pages/admin/AdminPaymentMethods';
import AdminPaymentProofs from './pages/admin/AdminPaymentProofs';
import AdminDonations from './pages/admin/AdminDonations';
import AdminTransportSettings from './pages/admin/AdminTransportSettings';
import AdminTransportUpdates from './pages/admin/AdminTransportUpdates';
import TransportRequestPage from './pages/public/TransportRequestPage';
import AdminFosterApplications from './pages/admin/AdminFosterApplications';

function App() {
  return (
    <Router>
      <PageShell>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/adopt" element={<Adopt />} />
          <Route path="/adopt/:id" element={<PetDetail />} />
          <Route path="/adopt/:id/apply" element={<AdoptApply />} />
          <Route path="/checkout/:applicationId" element={<Checkout />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/transport/request/:adoptionId" element={<TransportRequestPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/foster/location/:assignmentId" element={<FosterLocation />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/events" element={<Events />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/contact" element={<Contact />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Staff Pages */}
          <Route
            path="/admin/dashboard"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminApplications />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/pets"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminPets />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/pets/new"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminPetForm />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/pets/:id/edit"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminPetForm />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/payment-methods"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminPaymentMethods />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/payment-proofs"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminPaymentProofs />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/donations"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminDonations />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/transport-settings"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminTransportSettings />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/transport-updates"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminTransportUpdates />
                </AdminLayout>
              </RequireStaff>
            }
          />
          <Route
            path="/admin/foster-applications"
            element={
              <RequireStaff>
                <AdminLayout>
                  <AdminFosterApplications />
                </AdminLayout>
              </RequireStaff>
            }
          />
        </Routes>
      </PageShell>
    </Router>
  );
}

export default App;
