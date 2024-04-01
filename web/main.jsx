import { createRoot } from 'react-dom/client';
import React from 'react';

const root = createRoot(document.body.appendChild(document.createElement('div')));

root.render(<h1>test</h1>);
