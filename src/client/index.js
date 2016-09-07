import 'normalize.css/normalize.css'
import 'react-datepicker/dist/react-datepicker.css'

import './styles/app.css'

import debug from 'debug'
import React from 'react'
import { render } from 'react-dom'

import App from './app'

// expose debug module if not production
if (process.env.NODE_ENV !== 'production') {
  window.__d = debug
}

render(<App />, document.getElementById('app'))
