import { render } from 'react-dom';
import React from 'react';

render(<h1>test</h1>, document.body.appendChild(document.createElement('div')));
