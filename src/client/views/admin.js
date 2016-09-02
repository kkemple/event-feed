import React, { Component } from 'react'

import AppHeader from '../components/app-header'

export default class AdminView extends Component {
  render (): void {
    return (
      <div className='admin-view'>
        <AppHeader classes={['admin']} title='Event Feed' />
      </div>
    )
  }
}
