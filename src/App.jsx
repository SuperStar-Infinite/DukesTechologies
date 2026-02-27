import { Routes, Route } from 'react-router-dom'
import CodeEntry from './pages/CodeEntry'
import CodeResults from './pages/CodeResults'
import ServerValidation from './pages/ServerValidation'
import Login from './pages/Login'
import Signup from './pages/Signup'
import RestaurantOnboarding from './pages/RestaurantOnboarding'
import RestaurantAdmin from './pages/RestaurantAdmin'
import DukesAdmin from './pages/DukesAdmin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CodeEntry />} />
      <Route path="/results/:code" element={<CodeResults />} />
      <Route path="/server/validate" element={<ServerValidation />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/restaurant/onboarding" element={<RestaurantOnboarding />} />
      <Route path="/restaurant/admin" element={<RestaurantAdmin />} />
      <Route path="/dukes/admin" element={<DukesAdmin />} />
    </Routes>
  )
}

export default App
