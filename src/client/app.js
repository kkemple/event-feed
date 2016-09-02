import React, { Component } from 'react'
import { browserHistory } from 'react-router'

import Router from './router'

// shell for any bootstrapping
export default class App extends Component {
  render (): void {
    return <Router history={browserHistory} />
  }
}
