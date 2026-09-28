import { Link } from 'react-router-dom';
import './Home.css';

// 홈 화면의 메뉴 목록.
// 친구와 함께하는 기능(타자 대결, 이어쓰기)은 백엔드가 생긴 뒤 여기에 추가할 예정이에요.
const MENUS = [
    { to: '/typing/solo', group: '타자로 놀기', title: '혼자 타자 연습', desc: '문장 위에서 바로 치면서 타수와 정확도를 확인해요.' },
    { to: '/writing/solo', group: '이야기로 놀기', title: '혼자 이야기 쓰기', desc: '자유롭게, 또는 랜덤 소재를 뽑아 이야기를 써요.' },
    { to: '/works', group: '보관함', title: '내 작품', desc: '완성한 이야기를 다시 읽어요.' },
];

const Home = () => {
    return(
        <div className="home">
            <h1 className="home-logo">Glitter</h1>
            <p className="home-sub">혼자 또는 친구와 함께, 글을 읽고 쓰고 노는 곳</p>

            <nav className="home-menu">
                {MENUS.map((menu) => (
                    <Link key={menu.to} to={menu.to} className="home-card">
                        <span className="home-group">{menu.group}</span>
                        <strong>{menu.title}</strong>
                        <span>{menu.desc}</span>
                    </Link>
                ))}
            </nav>
        </div>
    )
}



export default Home
