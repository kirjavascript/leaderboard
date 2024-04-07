import './main.scss';
import { render } from 'solid-js/web';

//routing

render(
    () => <h1>header</h1>,
    document.body.appendChild(document.createElement('div')),
);
