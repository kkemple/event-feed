import constants from 'constants'
import debug from 'debug'
import io from 'socket.io-client'
import React, { Component } from 'react'

import AdminView from '../views/admin'

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

type Logger = (s: string, ...a: any) => void

type SettingsSchema = {
  autoPublishAll: boolean,
  from: Date,
  hashtags: Array<string>,
  publishers: {
    instagram: Array<string>,
    twitter: Array<string>,
    facebook: Array<string>
  },
  to: Date
}

type Socket = {
  on: (event: string, cb: (d?: any) => void) => void
}

type State = {
  events: Array<EventSchema>,
  settings: SettingsSchema
}

const logger: Logger = debug('client:provider:admin')

export default class AdminProvider extends Component {
  socket: Socket
  state: State

  constructor (): void {
    super(...arguments)

    this.handleEventsEvent = this.handleEventsEvent.bind(this)
    this.handleSocketConnection = this.handleSocketConnection.bind(this)

    this.socket = io()
    this.state = { events: [], settings: {} }
  }

  componentDidMount (): void {
    this.socket.emit(constants.sockets.CONNECT_ADMIN)

    // add listeners
    this.socket.on(constants.sockets.ADMIN_EVENTS, this.handleEventsEvent)
    this.socket.on(constants.sockets.ADMIN_EVENT_ADDED, this.handleEventAddedEvent)
    this.socket.on(constants.sockets.ADMIN_EVENT_REMOVED, this.handleEventRemovedEvent)
    this.socket.on(constants.sockets.ADMIN_EVENT_UPDATED, this.handleEventUpdatedEvent)
    this.socket.on(constants.sockets.CONNECTED_ADMIN, this.handleSocketConnection)
    this.socket.on(constants.sockets.SETTINGS_UPDATED, this.handleSettingsUpdatedEvent)

    // request initial data
    window.requestAnimationFrame(() => {
      this.socket.emit(constants.sockets.ADMIN_SETTINGS_FETCH)
      this.socket.emit(constants.sockets.ADMIN_EVENTS_FETCH)
    })
  }

  componentWillUnmount (): void {
    // remove listeners
    this.socket.off(constants.sockets.ADMIN_EVENTS, this.handleEventsEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_ADDED, this.handleEventAddedEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_REMOVED, this.handleEventRemovedEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_UPDATED, this.handleEventUpdatedEvent)
    this.socket.off(constants.sockets.CONNECTED_ADMIN, this.handleSocketConnection)
    this.socket.off(constants.sockets.ADMIN_SETTINGS_UPDATED, this.handleSettingsUpdatedEvent)
  }

  render (): void {
    const { events, settings } = this.state
    return <AdminView events={events} settings={settings} />
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
    logger('[socket] connected to admin room, waiting for updates...')
  }
}
