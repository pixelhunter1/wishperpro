import React from 'react';
import ReactDOM from 'react-dom/client';
import Overlay from './overlay';

const root = document.getElementById('overlay-root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Overlay />
    </React.StrictMode>
  );
}
