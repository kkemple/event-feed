import debug from 'debug'
import React, { Component } from 'react'

import FeedItem from '../components/feed/item'
import NoFeedItem from '../components/feed/no-item'

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('views:feed')

export default class FeedView extends Component {
  render (): void {
    const { events } = this.props

    logger('[view] events length', events.length)

    return events.length ? (
      <div className='feed-view'>
        <FeedItem
          event={events[0]}
        />
      </div>
    ) : (
      <div className='feed-view'>
        <NoFeedItem />
      </div>
    )
  }
}
