import debug from 'debug'
import React, { Component } from 'react'

import FeedItem from '../components/feed/item'
import NoFeedItem from '../components/feed/no-item'

type Logger = (s: string, ...a: any) => void

type State = {
  intervalId: number,
  eventIndex: number
}

const logger: Logger = debug('views:feed')

export default class FeedView extends Component {
  state: State

  constructor (): void {
    super(...arguments)

    this.refreshEvent = this.refreshEvent.bind(this)
    this.state = {
      eventIndex: 0,
      intervalId: 0
    }
  }

  componentDidMount (): void {
    const intervalId = setInterval(this.refreshEvent, 1000 * 5)
    this.setState({ intervalId })
  }

  componentWillUnmount (): void {
    const { intervalId } = this.state
    clearInterval(intervalId)
  }

  render (): void {
    const { eventIndex } = this.state
    const { events } = this.props
    const event = events[eventIndex]

    return event
      ? (
      <div className='feed-view'>
        <FeedItem event={event} />
      </div>
      )
      : (
      <div className='feed-view'>
        <NoFeedItem />
      </div>
      )
  }

  refreshEvent (): void {
    const { eventIndex } = this.state
    const { events } = this.props

    if (events.length === eventIndex - 1) {
      logger('[refreshEvent] resetting slideshow')
      this.setState({ eventIndex: 0 })
    } else {
      const newIndex = eventIndex + 1
      logger('[refreshEvent] incrementing slideshow', newIndex)
      this.setState({ eventIndex: newIndex })
    }
  }
}
