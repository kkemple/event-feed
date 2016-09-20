// import debug from 'debug'
import React, { Component } from 'react'

import FeedItem from '../components/feed/item'

// type Logger = (s: string, ...a: any) => void

// const logger: Logger = debug('views:feed')

export default class FeedView extends Component {
  render (): void {
    const {
      events
    } = this.props

    return (
      <div className='feed-view'>
        <FeedItem
          event={events[0]}
        />
      </div>
    )
  }
}
