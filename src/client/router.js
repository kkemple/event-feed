import React, { Component } from 'react'
import { Router, Route } from 'react-router'

import AdminProvider from './providers/admin'
import FeedProvider from './providers/feed'

export default class AppRouter extends Component {
  render (): void {
    const { history } = this.props

    return (
      <Router history={history}>
        <Route path='/' component={FeedProvider} />
        <Route path='/admin' component={AdminProvider} />
        <Route path='*' component={FeedProvider} />
      </Router>
    )
  }
}
