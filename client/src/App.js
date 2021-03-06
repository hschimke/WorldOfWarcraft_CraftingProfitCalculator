import './App.css';
import RunCoordinator from './RunCoordinator.js';
import Auctions from './Auctions.js';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

// https://reactrouter.com/web/guides/quick-start

function App() {
  return (
    <Router>
      <div className="App">
        <div className="Header">
          <h1>Crafting Profits Calculator</h1>
        </div>
        <div className="Nav">
          <ul>
            <li>
              <Link to="/">Profit Calculator</Link>
            </li>
            <li>
              <Link to="/auctions">Auction Price History</Link>
            </li>
          </ul>
        </div>
        <div className="Main">
          <Switch>
            <Route path="/auctions">
              <Auctions />
            </Route>
            <Route path="/">
              <RunCoordinator />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  );
}

export default App;
