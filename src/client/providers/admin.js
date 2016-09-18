import constants from 'constants'
import debug from 'debug'
import io from 'socket.io-client'
import React, { Component } from 'react'

import cache from '../cache'
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
  offline: boolean,
  settings: SettingsSchema
}

const logger: Logger = debug('client:provider:admin')

export default class AdminProvider extends Component {
  socket: Socket
  state: State

  constructor (): void {
    super(...arguments)

    this.handleConnectedAdminEvent = this.handleConnectedAdminEvent.bind(this)
    this.handleEventsEvent = this.handleEventsEvent.bind(this)
    this.handleEventAddedEvent = this.handleEventAddedEvent.bind(this)
    this.handleEventRemovedEvent = this.handleEventRemovedEvent.bind(this)
    this.handleEventUpdatedEvent = this.handleEventUpdatedEvent.bind(this)
    this.handleInternetConnection = this.handleInternetConnection.bind(this)
    this.handleInternetDisconnect = this.handleInternetDisconnect.bind(this)
    this.handleInternetReconnect = this.handleInternetReconnect.bind(this)
    this.handleSettingsEvent = this.handleSettingsEvent.bind(this)
    this.handleSettingsUpdatedEvent = this.handleSettingsUpdatedEvent.bind(this)
    this.onFilterDateRange = this.onFilterDateRange.bind(this)
    this.onPublish = this.onPublish.bind(this)
    this.onUnpublish = this.onUnpublish.bind(this)
    this.onRemove = this.onRemove.bind(this)
    this.onSettingsUpdate = this.onSettingsUpdate.bind(this)

    this.socket = io()
    this.state = { events: [], offline: true, settings: {} }
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
    this.socket.on(constants.sockets.CONNECTED_ADMIN, this.handleConnectedAdminEvent)
    this.socket.on('connect', this.handleInternetConnection)
    this.socket.on('disconnect', this.handleInternetDisconnect)
    this.socket.on('reconnect', this.handleInternetReconnect)

    window.addEventListener('online', this.handleInternetReconnect)
    window.addEventListener('offline', this.handleInternetDisconnect)

    setTimeout(async () => {
      try {
        const settings = await cache.get('settings')
        const events = await cache.get('events')

        this.setState({ events: events.events, settings: settings.settings })
      } catch (error) {
        console.warn('Unable to load events or settings from cache!', error)
      }

      this.socket.emit(constants.sockets.ADMIN_SETTINGS_FETCH)
    }, 500)
  }

  componentWillUnmount (): void {
    // remove listeners
    this.socket.off(constants.sockets.ADMIN_EVENTS, this.handleEventsEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_ADDED, this.handleEventAddedEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_REMOVED, this.handleEventRemovedEvent)
    this.socket.off(constants.sockets.ADMIN_EVENT_UPDATED, this.handleEventUpdatedEvent)
    this.socket.off(constants.sockets.ADMIN_SETTINGS, this.handleSettingsEvent)
    this.socket.off(constants.sockets.ADMIN_SETTINGS_UPDATED, this.handleSettingsUpdatedEvent)
    this.socket.off(constants.sockets.CONNECTED_ADMIN, this.handleConnectedAdminEvent)
    this.socket.off('connect', this.handleInternetConnection)
    this.socket.off('disconnect', this.handleInternetDisconnect)
    this.socket.off('reconnect', this.handleInternetReconnect)

    window.removeEventListener('online', this.handleInternetReconnect)
    window.removeEventListener('offline', this.handleInternetDisconnect)
  }

  render (): void {
    const { events, offline, settings } = this.state
    return <AdminView
      events={events}
      offline={offline}
      settings={settings}
      onFilterDateRange={this.onFilterDateRange}
      onPublish={this.onPublish}
      onUnpublish={this.onUnpublish}
      onRemove={this.onRemove}
      onSettingsUpdate={this.onSettingsUpdate}
    />
  }

  handleConnectedAdminEvent (): void {
    logger('[handleInternetConnection] connected to admin room, waiting for updates...')
  }

  handleEventsEvent (events: Array<EventSchema>): void {
    logger('[handleEventsEvent] incoming events...', events)
    this.setState({ events }, async () => {
      try {
        const doc = await cache.get('events')
        const { _id, _rev } = doc

        cache.put({ _id, _rev, events })
      } catch (error) {
        if (error.reason === 'missing') cache.put({ _id: 'events', events })
        else console.error(error)
      }
    })
  }

  handleEventAddedEvent (event: EventSchema): void {
    logger('[handleEventAddedEvent] event added...', event)
    const { events } = this.state

    events.push(event)

    this.setState({ events }, async () => {
      try {
        const doc = await cache.get('events')
        const { _id, _rev } = doc

        cache.put({ _id, _rev, events })
      } catch (error) {
        if (error.reason === 'missing') cache.put({ _id: 'events', events })
        else console.error(error)
      }
    })
  }

  handleEventRemovedEvent (id: string): void {
    logger('[handleEventRemovedEvent] event removed...', id)
    const { events } = this.state

    const updatedEvents = events.filter(e => e.id !== id)

    this.setState({ events: updatedEvents }, async () => {
      try {
        const doc = await cache.get('events')
        const { _id, _rev } = doc

        cache.put({ _id, _rev, events: updatedEvents })
      } catch (error) {
        if (error.reason === 'missing') cache.put({ _id: 'events', events })
        else console.error(error)
      }
    })
  }

  handleEventUpdatedEvent (event: EventSchema): void {
    logger('[handleEventUpdatedEvent] event updated...', event)
    const { events } = this.state

    const updatedEvents = events.map(e => e.id === event.id ? event : e)

    this.setState({ events: updatedEvents }, async () => {
      try {
        const doc = await cache.get('events')
        const { _id, _rev } = doc

        cache.put({ _id, _rev, events: updatedEvents })
      } catch (error) {
        if (error.reason === 'missing') cache.put({ _id: 'events', updatedEvents })
        else console.error(error)
      }
    })
  }

  handleSettingsEvent (settings: SettingsSchema): void {
    logger('[handleSettingsEvent] incoming settings...', settings)

    this.setState({ settings }, async () => {
      try {
        const doc = await cache.get('settings')
        const { _id, _rev } = doc

        cache.put({ _id, _rev, settings })
      } catch (error) {
        if (error.reason === 'missing') cache.put({ _id: 'settings', settings })
        else console.error(error)
      }
    })

    const { from, to } = settings
    setTimeout(() => {
      this.socket.emit(constants.sockets.ADMIN_EVENTS_FETCH, { from, to })
    }, 500)
  }

  handleSettingsUpdatedEvent (settings: SettingsSchema): void {
    logger('[handleSettingsUpdatedEvent] settings updated...', settings)

    this.setState({ settings }, async () => {
      try {
        const doc = await cache.get('settings')
        const { _id, _rev } = doc

        cache.put({ _id, _rev, settings })
      } catch (error) {
        if (error.reason === 'missing') cache.put({ _id: 'settings', settings })
        else console.error(error)
      }
    })
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

  onFilterDateRange (options: EventFetchOptions): void {
    logger('[onFilterDateRange] fetching events with options: ', options)

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
