// import constants from 'constants'
import debug from 'debug'
import io from 'socket.io-client'
import React, { Component } from 'react'

import FeedView from '../views/feed'

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('client:provider:admin')

export default class AdminProvider extends Component {
  socket: Object
  state: Object

  constructor (): void {
    super(...arguments)

    this.handleSocketConnection = this.handleSocketConnection.bind(this)
    this.handleEventsEvent = this.handleEventsEvent.bind(this)
    this.handleEventAddedEvent = this.handleEventAddedEvent.bind(this)
    this.handleEventRemovedEvent = this.handleEventRemovedEvent.bind(this)
    this.handleEventUpdatedEvent = this.handleEventUpdatedEvent.bind(this)
    this.handleSettingsUpdatedEvent = this.handleSettingsUpdatedEvent.bind(this)

    this.socket = io()
    this.state = { events: [], settings: {} }
  }

  componentDidMount (): void {
    // add listeners
    // this.socket.on(constants.sockets.CONNECTED_FEED, this.handleSocketConnection)
    // this.socket.on(constants.sockets.EVENTS, this.handleEventsEvent)
    // this.socket.on(constants.sockets.EVENT_ADDED, this.handleEventAddedEvent)
    // this.socket.on(constants.sockets.EVENT_REMOVED, this.handleEventRemovedEvent)
    // this.socket.on(constants.sockets.EVENT_UPDATED, this.handleEventUpdatedEvent)
    // this.socket.on(constants.sockets.SETTINGS_UPDATED, this.handleSettingsUpdatedEvent)

    // connect to admin room
    // this.socket.emit(constants.sockets.CONNECT_FEED)

    // request initial data
    window.requestAnimationFrame(() => {
      // this.socket.emit(constants.sockets.SETTINGS_FETCH)
      // this.socket.emit(constants.sockets.EVENTS_FETCH)
    })
  }

  componentWillUnmount (): void {
    // remove listeners
    // this.socket.off(constants.sockets.CONNECTED_FEED, this.handleSocketConnection)
    // this.socket.off(constants.sockets.EVENTS, this.handleEventsEvent)
    // this.socket.off(constants.sockets.EVENT_ADDED, this.handleEventAddedEvent)
    // this.socket.off(constants.sockets.EVENT_REMOVED, this.handleEventRemovedEvent)
    // this.socket.off(constants.sockets.EVENTS_UPDATED, this.handleEventUpdatedEvent)
    // this.socket.off(constants.sockets.SETTINGS_UPDATED, this.handleSettingsUpdatedEvent)
  }

  render (): void {
    const { events, settings } = this.state
    return <FeedView events={events} settings={settings} />
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

  handleSettingsUpdatedEvent (settings): void {
    logger('[socket] settings updated...', settings)

    this.setState({ settings })
  }

  handleSocketConnection (): void {
    logger('[socket] connected to feed room, waiting for updates...')
  }
}
