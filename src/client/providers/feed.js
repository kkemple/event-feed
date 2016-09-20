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
  events: Array<EventSchema>
}

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('client:provider:feed')

export default class FeedProvider extends Component {
  socket: Socket
  state: State

  constructor (): void {
    super(...arguments)

    this.handleSocketMessage = this.handleSocketMessage.bind(this)
    this.handleInternetConnection = this.handleInternetConnection.bind(this)
    this.handleInternetDisconnect = this.handleInternetDisconnect.bind(this)
    this.handleInternetReconnect = this.handleInternetReconnect.bind(this)

    this.socket = io()
    this.state = { events: [] }
  }

  componentDidMount (): void {
    this.socket.on('message', this.handleSocketMessage)
    this.socket.on('connect', this.handleInternetConnection)
    this.socket.on('disconnect', this.handleInternetDisconnect)
    this.socket.on('reconnect', this.handleInternetReconnect)

    window.addEventListener('online', this.handleInternetReconnect)
    window.addEventListener('offline', this.handleInternetDisconnect)

    this.socket.emit('message', {
      type: constants.sockets.CONNECT_FEED
    })
  }

  componentWillUnmount (): void {
    this.socket.off('message', this.handleSocketMessage)
    this.socket.off('connect', this.handleInternetConnection)
    this.socket.off('disconnect', this.handleInternetDisconnect)
    this.socket.off('reconnect', this.handleInternetReconnect)

    window.removeEventListener('online', this.handleInternetReconnect)
    window.removeEventListener('offline', this.handleInternetDisconnect)
  }

  componentWillReceiveProps (nextProps: Object): void {
    logger('[component] things')
    this.setState({
      events: nextProps.events
    });
  }

  render (): void {
    const { events } = this.state
    return <FeedView
      events={events}
    />
  }

  handleConnectedFeedEvent (): void {
    logger('[socket] connected to feed room, waiting for updates...')
    this.socket.emit('message', {
      type: constants.sockets.FEED_EVENTS_FETCH
    })
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

  handleSocketMessage (message) {
    const { payload, type } = message

    logger('[handleSocketMessage] type: %s, payload: ', type, payload)

    switch (type) {
      case constants.sockets.FEED_EVENTS:
        this.handleEventsEvent(payload)
        break
      case constants.sockets.FEED_EVENT_ADDED:
        this.handleEventAddedEvent(payload)
        break
      case constants.sockets.FEED_EVENT_UPDATED:
        this.handleEventUpdatedEvent(payload)
        break
      case constants.sockets.FEED_EVENT_REMOVED:
        this.handleEventRemovedEvent(payload)
        break
      case constants.sockets.CONNECTED_FEED:
        this.handleConnectedFeedEvent(payload)
        break
    }
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
