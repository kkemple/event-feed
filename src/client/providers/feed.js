import constants from 'constants'
import debug from 'debug'
import io from 'socket.io-client'
import React, { Component } from 'react'

import FeedView from '../views/feed'

type EventSchema = {
  content: string,
  media: {
    type: "photo"|"video",
    url: string
  },
  provider: string,
  published: boolean,
  timestamp: Date,
  viewed: boolean
}

type Socket = {
  on: (event: string, cb: (d?: any) => void) => void
}

type State = {
  events: Array<EventSchema>,
  offline: boolean
}

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('client:provider:feed')

export default class FeedProvider extends Component {
  socket: Socket
  state: State

  constructor (): void {
    super(...arguments)

    this.handleSocketConnection = this.handleSocketConnection.bind(this)
    this.handleEventsEvent = this.handleEventsEvent.bind(this)
    this.handleEventAddedEvent = this.handleEventAddedEvent.bind(this)
    this.handleEventRemovedEvent = this.handleEventRemovedEvent.bind(this)
    this.handleEventUpdatedEvent = this.handleEventUpdatedEvent.bind(this)

    this.socket = io()
    this.state = { events: [] }
  }

  componentDidMount (): void {
    this.socket.emit(constants.sockets.CONNECT_FEED)

    this.socket.on(constants.sockets.FEED_EVENTS, this.handleEventsEvent)
    this.socket.on(constants.sockets.FEED_EVENT_ADDED, this.handleEventAddedEvent)
    this.socket.on(constants.sockets.FEED_EVENT_REMOVED, this.handleEventRemovedEvent)
    this.socket.on(constants.sockets.FEED_EVENT_UPDATED, this.handleEventUpdatedEvent)
    this.socket.on(constants.sockets.CONNECTED_FEED, this.handleSocketConnection)

    this.socket.on('connect', this.handleInternetConnection)
    this.socket.on('disconnect', this.handleInternetDisconnect)
    this.socket.on('reconnect', this.handleInternetReconnect)

    window.addEventListener('online', this.handleInternetReconnect)
    window.addEventListener('offline', this.handleInternetDisconnect)

    // request initial data
    window.requestAnimationFrame(() => {
      this.socket.emit(constants.sockets.FEED_EVENTS_FETCH)
    })
  }

  componentWillUnmount (): void {
    this.socket.off(constants.sockets.FEED_EVENTS, this.handleEventsEvent)
    this.socket.off(constants.sockets.FEED_EVENT_ADDED, this.handleEventAddedEvent)
    this.socket.off(constants.sockets.FEED_EVENT_REMOVED, this.handleEventRemovedEvent)
    this.socket.off(constants.sockets.FEED_EVENT_UPDATED, this.handleEventUpdatedEvent)
    this.socket.off(constants.sockets.CONNECTED_FEED, this.handleSocketConnection)

    this.socket.off('connect', this.handleInternetConnection)
    this.socket.off('disconnect', this.handleInternetDisconnect)
    this.socket.off('reconnect', this.handleInternetReconnect)

    window.removeEventListener('online', this.handleInternetReconnect)
    window.removeEventListener('offline', this.handleInternetDisconnect)
  }

  render (): void {
    const { events, offline } = this.state
    return <FeedView
      events={events}
      offline={offline}
    />
  }

  handleEventsEvent (events): void {
    logger('[socket] incoming events...', events)
    this.setState({ events })
  }

  handleEventAddedEvent (event): void {
    logger('[socket] event added...', event)
    const { events } = this.state

    events.push(event)

    this.setState({ events })
  }

  handleEventRemovedEvent (event): void {
    logger('[socket] event added...', event)
    const { events } = this.state

    events.filter(e => e.id !== event.id)

    this.setState({ events })
  }

  handleEventUpdatedEvent (event): void {
    logger('[socket] event updated...', event)
    const { events } = this.state

    events.forEach(e => { if (e.id === event.id) e = event })

    this.setState({ events })
  }

  handleSocketConnection (): void {
    logger('[socket] connected to feed room, waiting for updates...')
  }

  handleInternetConnection (): void {
    this.setState({ offline: false })
  }

  handleInternetDisconnect (): void {
    this.setState({ offline: true })
  }

  handleInternetReconnect (): void {
    this.setState({ offline: false })
  }

}
