import './App.css';
import RunCoordinator from './CraftingProfits/RunCoordinator';
import Auctions from './AuctionHistory/Auctions';
import {
  BrowserRouter,
  Routes,
  Route,
  Link
} from "react-router-dom";

// https://reactrouter.com/web/guides/quick-start

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <div className="Header">
          <h1>Crafting Profits Calculator</h1>
        </div>
        <div className="Nav">
          <ul>
            <li>
              <Link to="/">Profit Calculator</Link>
            </li>
            {(process.env.REACT_APP_DISABLE_AUCTIONS !== 'true') &&
              <li>
                <Link to="/auctions">Auction Price History</Link>
              </li>
            }
          </ul>
        </div>
        <div className="Main">
          <Routes>
            <Route path="/auctions" element={<Auctions />} />
            <Route path="/" element={<RunCoordinator />}/>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
