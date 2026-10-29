import { Link } from 'react-router-dom';
import './Home.css';

// 홈 화면 메뉴. 카드 7개를 한 격자에 몰아넣으면 마지막 줄에 카드가 하나만 덩그러니 남아서,
// "타자로 놀기 / 이야기로 놀기 / 읽고 모으기" 묶음으로 나눠 묶음마다 한 줄씩 보여줘요.
const SECTIONS = [
    {
        title: '타자로 놀기',
        menus: [
            { to: '/typing/solo', title: '혼자 타자 연습', desc: '시, 소설, 명언… 고른 글 위에서 바로 치며 타수와 정확도를 확인해요.' },
            { to: '/typing/battle', title: '친구와 타자 대결', desc: '방을 만들고 친구를 불러 같은 글로 누가 빠른지 겨뤄요.' },
        ],
    },
    {
        title: '이야기로 놀기',
        menus: [
            { to: '/writing/solo', title: '혼자 이야기 쓰기', desc: '자유롭게, 또는 랜덤 소재를 뽑아 이야기를 써요.' },
            { to: '/writing/relay', title: '친구와 이어쓰기', desc: '한 사람씩 돌아가며 이어 써서 예상 못 한 이야기를 만들어요.' },
        ],
    },
    {
        title: '읽고 모으기',
        menus: [
            { to: '/community', title: '커뮤니티', desc: '사람들이 공개한 이야기를 읽고 좋아요와 댓글을 남겨요.' },
            { to: '/works', title: '내 작품', desc: '완성한 이야기를 다시 읽고, 원하면 공개해요.' },
            { to: '/prompts', title: '내 소재함', desc: '마음에 든 소재를 모아 두고 언제든 꺼내 써요.' },
        ],
    },
];

const Home = () => {
    return(
        <div className="home">
            <section className="home-hero">
                <h1 className="home-logo">Glitter</h1>
                <p className="home-sub">혼자 또는 친구와 함께, 글을 읽고 쓰고 노는 곳</p>
                <div className="home-cta">
                    <Link to="/typing/solo" className="btn primary">타자 연습 시작하기</Link>
                    <Link to="/writing/solo" className="btn">이야기 쓰러 가기</Link>
                </div>
            </section>

            {SECTIONS.map((section) => (
                <section key={section.title} className="home-section">
                    <h2 className="home-section-title">{section.title}</h2>
                    <nav className="home-menu">
                        {section.menus.map((menu) => (
                            <Link key={menu.to} to={menu.to} className="home-card">
                                <strong>{menu.title}</strong>
                                <span>{menu.desc}</span>
                                <span className="home-arrow" aria-hidden="true">→</span>
                            </Link>
                        ))}
                    </nav>
                </section>
            ))}
        </div>
    )
}



export default Home
