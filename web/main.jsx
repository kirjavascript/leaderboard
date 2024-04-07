import './styles/main.scss';
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';

import Leaderboard from './leaderboard';
import NotFound from './404';

render(
    () => <Router>
        <Route path="/" component={Leaderboard} />
        <Route path="/submit" component={() => 'submit goes here'} />
        <Route path="*404" component={NotFound} />
    </Router>,
    document.body.appendChild(document.createElement('main')),
);
