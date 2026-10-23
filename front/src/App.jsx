import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import TypingSolo from './pages/TypingSolo';
import WorkDetail from './pages/WorkDetail';
import Works from './pages/Works';
import WritingSolo from './pages/WritingSolo';

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/typing/solo" element={<TypingSolo />} />
      <Route path="/writing/solo" element={<WritingSolo />} />
      <Route path="/works" element={<Works />} />
      {/* :workId 자리에 들어온 값은 WorkDetail에서 useParams()로 꺼내 써요 */}
      <Route path="/works/:workId" element={<WorkDetail />} />
    </Routes>
  )
}

export default App
