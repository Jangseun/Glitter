import { Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import TopBar from './components/TopBar';
import AuthPage from './pages/AuthPage';
import Community from './pages/Community';
import CommunityWork from './pages/CommunityWork';
import Home from './pages/Home';
import Prompts from './pages/Prompts';
import Settings from './pages/Settings';
import TextNew from './pages/TextNew';
import TypingBattleLobby from './pages/TypingBattleLobby';
import TypingBattleRoom from './pages/TypingBattleRoom';
import TypingSolo from './pages/TypingSolo';
import WorkDetail from './pages/WorkDetail';
import Works from './pages/Works';
import WritingRelayLobby from './pages/WritingRelayLobby';
import WritingRelayRoom from './pages/WritingRelayRoom';
import WritingSolo from './pages/WritingSolo';

function App() {

  return (
    <>
      {/* 모든 페이지 위에 공통으로 붙는 상단 바 */}
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/settings" element={<Settings />} />

        {/* 타자: 로그인 없이 누구나. 글 등록만 로그인 필요 */}
        <Route path="/typing/solo" element={<TypingSolo />} />
        <Route path="/typing/texts/new" element={<RequireAuth><TextNew /></RequireAuth>} />
        <Route path="/typing/battle" element={<TypingBattleLobby />} />
        {/* 친구에게 보내는 초대 링크가 바로 이 주소예요. 예) /typing/battle/AB3CD */}
        <Route path="/typing/battle/:roomId" element={<TypingBattleRoom />} />

        {/* 글쓰기: 쓰는 건 누구나, 저장은 로그인 필요 (각 페이지 안에서 처리) */}
        <Route path="/writing/solo" element={<WritingSolo />} />
        <Route path="/writing/relay" element={<WritingRelayLobby />} />
        <Route path="/writing/room/:roomId" element={<WritingRelayRoom />} />

        {/* 개인 소재함: 로그인한 사람만 */}
        <Route path="/prompts" element={<RequireAuth><Prompts /></RequireAuth>} />

        {/* 커뮤니티: 읽기는 누구나, 좋아요/댓글은 로그인 필요 (페이지 안에서 처리) */}
        <Route path="/community" element={<Community />} />
        <Route path="/community/:workId" element={<CommunityWork />} />

        {/* 작품함: 로그인한 사람만, 자기 작품만 */}
        <Route path="/works" element={<RequireAuth><Works /></RequireAuth>} />
        {/* :workId 자리에 들어온 값은 WorkDetail에서 useParams()로 꺼내 써요 */}
        <Route path="/works/:workId" element={<RequireAuth><WorkDetail /></RequireAuth>} />
      </Routes>
    </>
  )
}

export default App
