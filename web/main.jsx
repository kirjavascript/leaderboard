import './styles/main.scss';
import { render } from 'solid-js/web';
import { ErrorBoundary } from 'solid-js';
import { Router, Route } from '@solidjs/router';

import Leaderboard from './leaderboard';
import Queue from './queue';
import Submit from './submit';
import NotFound from './404';
import Score from './score';
import Player from './player';

function fallback(e) {
    console.error(e);
    return <p class="red">error: {e.message}</p>;
}

render(
    () => (
        <ErrorBoundary fallback={fallback}>
            <Router>
                <Route path="/" component={Leaderboard} />
                <Route path="/score/:board/:id" component={Score} />
                <Route path="/player/:name" component={Player} />
                <Route path="/submit" component={Submit} />
                <Route path="/queue" component={Queue} />
                <Route path="*404" component={NotFound} />
            </Router>
        </ErrorBoundary>
    ),
    document.body.appendChild(document.createElement('main')),
);
