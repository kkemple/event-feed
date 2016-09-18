import React, { Component } from 'react'
import { Router, Route } from 'react-router'

// `getComponent` prop functions to enable webpack code splitting via `require.ensure`
function asyncLoadAdminProvider (nextState, cb): Component {
  require.ensure([], () => {
    const AdminProvider = require('./providers/admin')
    cb(null, AdminProvider)
  })
}

function asyncLoadFeedProvider (nextState, cb): Component {
  require.ensure([], () => {
    const FeedProvider = require('./providers/feed')
    cb(null, FeedProvider)
  })
}

export default class AppRouter extends Component {
  render (): void {
    const { history } = this.props

    return (
      <Router history={history}>
        <Route path='/' getComponent={asyncLoadFeedProvider} />
        <Route path='/admin' getComponent={asyncLoadAdminProvider} />
        <Route path='*' getComponent={asyncLoadFeedProvider} />
      </Router>
    )
  }
}
