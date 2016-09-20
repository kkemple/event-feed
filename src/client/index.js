import 'normalize.css/normalize.css'
import 'react-datepicker/dist/react-datepicker.css'

import './styles/app.css'

import debug from 'debug'
import React from 'react'
import { render } from 'react-dom'

import App from './app'

// if we are landing on /index.html we are loading from PWA home screen install
// redirect to app
if (window.location.pathname === '/index.html') window.location = '/admin'

// expose debug module if not production
if (process.env.NODE_ENV !== 'production') {
  window.__d = debug
}

render(<App />, document.getElementById('app'))
