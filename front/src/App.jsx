import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import TypingSolo from './pages/TypingSolo';
import WritingSolo from './pages/WritingSolo';

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/typing/solo" element={<TypingSolo />} />
      <Route path="/writing/solo" element={<WritingSolo />} />
    </Routes>
  )
}

export default App
