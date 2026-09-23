import { Link } from 'react-router-dom';


const Home = () => {
    return(
        <div>
            <h1>Welcome to the Home Page</h1>
            
            <Link to="/typing/solo">Go to Typing Solo</Link>
            <br />
            <Link to="/writing/solo">Go to Writing Solo</Link>
        </div>
    )
}



export default Home