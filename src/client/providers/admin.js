import constants from 'constants'
import debug from 'debug'
import io from 'socket.io-client'
import React, { Component } from 'react'

import AdminView from '../views/admin'

type EventFetchOptions = {
  from: string,
  to: string,
  published: boolean,
  viewed: boolean
}

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
  publishers: Array<string>,
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
    this.handleEventAddedEvent = this.handleEventAddedEvent.bind(this)
    this.handleEventRemovedEvent = this.handleEventRemovedEvent.bind(this)
    this.handleEventUpdatedEvent = this.handleEventUpdatedEvent.bind(this)
    this.handleSettingsEvent = this.handleSettingsEvent.bind(this)
    this.handleSettingsUpdatedEvent = this.handleSettingsUpdatedEvent.bind(this)
    this.handleSocketConnection = this.handleSocketConnection.bind(this)
    this.onEventsFetch = this.onEventsFetch.bind(this)
    this.onPublish = this.onPublish.bind(this)
    this.onUnpublish = this.onUnpublish.bind(this)
    this.onRemove = this.onRemove.bind(this)
    this.onSettingsUpdate = this.onSettingsUpdate.bind(this)

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
    this.socket.on(constants.sockets.ADMIN_SETTINGS, this.handleSettingsEvent)
    this.socket.on(constants.sockets.ADMIN_SETTINGS_UPDATED, this.handleSettingsUpdatedEvent)
    this.socket.on(constants.sockets.CONNECTED_ADMIN, this.handleSocketConnection)

    // request initial data
    window.requestAnimationFrame(() => {
      this.socket.emit(constants.sockets.ADMIN_SETTINGS_FETCH)
    })
  }

  componentWillUnmount (): void {
    // remove listeners
    this.socket.off(constants.sockets.ADMIN_EVENTS, this.handleEventsEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_ADDED, this.handleEventAddedEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_REMOVED, this.handleEventRemovedEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_UPDATED, this.handleEventUpdatedEvent)
    this.socket.off(constants.sockets.ADMIN_SETTINGS, this.handleSettingsEvent)
    this.socket.off(constants.sockets.ADMIN_SETTINGS_UPDATED, this.handleSettingsUpdatedEvent)
    this.socket.off(constants.sockets.CONNECTED_ADMIN, this.handleSocketConnection)
  }

  render (): void {
    const { events, settings } = this.state
    return <AdminView
      events={events}
      settings={settings}
      onEventsFetch={this.onEventsFetch}
      onPublish={this.onPublish}
      onUnpublish={this.onUnpublish}
      onRemove={this.onRemove}
      onSettingsUpdate={this.onSettingsUpdate}
    />
  }

  handleEventsEvent (events: Array<EventSchema>): void {
    logger('[handleEventsEvent] incoming events...', events)
    this.setState({ events })
  }

  handleEventAddedEvent (event: EventSchema): void {
    logger('[handleEventAddedEvent] event added...', event)
    const { events } = this.state

    events.push(event)

    this.setState({ events })
  }

  handleEventRemovedEvent (id: string): void {
    logger('[handleEventRemovedEvent] event removed...', id)
    const { events } = this.state

    const updatedEvents = events.filter(e => e.id !== id)

    this.setState({ events: updatedEvents })
  }

  handleEventUpdatedEvent (event: EventSchema): void {
    logger('[handleEventUpdatedEvent] event updated...', event)
    const { events } = this.state

    const updatedEvents = events.map(e => e.id === event.id ? event : e)

    this.setState({ events: updatedEvents })
  }

  handleSettingsEvent (settings: SettingsSchema): void {
    logger('[handleSettingsEvent] incoming settings...', settings)

    this.setState({ settings })

    const { from, to } = settings
    this.socket.emit(constants.sockets.ADMIN_EVENTS_FETCH, { from, to })
  }

  handleSettingsUpdatedEvent (settings: SettingsSchema): void {
    logger('[handleSettingsUpdatedEvent] settings updated...', settings)

    this.setState({ settings })
  }

  handleSocketConnection (): void {
    logger('[handleSocketConnection] connected to admin room, waiting for updates...')
  }

  onEventsFetch (options: EventFetchOptions): void {
    logger('[onEventsFetch] fetching events with options: ', options)

    this.socket.emit(constants.sockets.ADMIN_EVENTS_FETCH, options)
  }

  onPublish (id: string): void {
    logger('[onPublish] publishing event: %s', id)

    this.socket.emit(constants.sockets.ADMIN_EVENT_PUBLISH, id)
  }

  onUnpublish (id: string): void {
    logger('[onUnpublish] unpublishing event: %s', id)

    this.socket.emit(constants.sockets.ADMIN_EVENT_UNPUBLISH, id)
  }

  onRemove (id: string): void {
    logger('[onRemove] unpublishing event: %s', id)

    this.socket.emit(constants.sockets.ADMIN_EVENT_REMOVE, id)
  }

  onSettingsUpdate (newSettings: SettingsSchema): void {
    logger('[onSettingsUpdate] new settings...', newSettings)

    this.socket.emit(constants.sockets.ADMIN_SETTINGS_UPDATE, newSettings)
  }
}
