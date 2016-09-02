import React, { Component } from 'react'

import AppHeader from '../components/app-header'

export default class FeedView extends Component {
  render (): void {
    return (
      <div className='feed-view'>
        <AppHeader classes={['feed']} title='Event Feed' />
      </div>
    )
  }
}
