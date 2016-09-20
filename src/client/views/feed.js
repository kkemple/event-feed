import debug from 'debug'
import React, { Component } from 'react'

import FeedItem from '../components/feed/item'
import NoFeedItem from '../components/feed/no-item'

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('views:feed')

export default class FeedView extends Component {
  render (): void {
    const { event } = this.props

    return event ? (
      <div className='feed-view'>
        <FeedItem
          event={event}
        />
      </div>
    ) : (
      <div className='feed-view'>
        <NoFeedItem />
      </div>
    )
  }
}
