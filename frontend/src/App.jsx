import { Routes, Route } from 'react-router-dom'
import Sidebar from './Components/Layout/Sidebar.jsx'
import TopBar from './Components/Layout/TopBar.jsx'
import Overview from './Pages/Overview.jsx'
import CountryView from './Pages/CountryView.jsx'
import Forecast from './Pages/Forecast.jsx'
import Insights from './Pages/Insights.jsx'
import Methodology from './Pages/Methodology.jsx'
import NotFound from './Pages/NotFound.jsx'

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)', position: 'relative' }}>
      {/* Dot grid texture */}
      <div className="dot-grid" />

      <Sidebar />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
          <Routes>
            <Route path="/"                     element={<Overview />} />
            <Route path="/country/:countryName" element={<CountryView />} />
            <Route path="/country"              element={<CountryView />} />
            <Route path="/forecast"             element={<Forecast />} />
            <Route path="/insights"             element={<Insights />} />
            <Route path="/methodology"          element={<Methodology />} />
            <Route path="*"                     element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
