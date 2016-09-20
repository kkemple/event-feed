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

async function cacheEvents (events: Array<EventSchema>): void {
  try {
    const doc = await cache.get('events')
    const { _id, _rev } = doc

    cache.put({ _id, _rev, events })
  } catch (error) {
    if (error.reason === 'missing') cache.put({ _id: 'events', events })
    else console.error(error)
  }
}

async function cacheSettings (settings: SettingsSchema): void {
  try {
    const doc = await cache.get('settings')
    const { _id, _rev } = doc

    cache.put({ _id, _rev, settings })
  } catch (error) {
    if (error.reason === 'missing') cache.put({ _id: 'settings', settings })
    else console.error(error)
  }
}

const logger: Logger = debug('client:provider:admin')

export default class AdminProvider extends Component {
  socket: Socket
  state: State

  constructor (): void {
    super(...arguments)

    this.handleInternetConnection = this.handleInternetConnection.bind(this)
    this.handleInternetDisconnect = this.handleInternetDisconnect.bind(this)
    this.handleInternetReconnect = this.handleInternetReconnect.bind(this)
    this.handleSocketMessage = this.handleSocketMessage.bind(this)
    this.onFilterDateRange = this.onFilterDateRange.bind(this)
    this.onPublish = this.onPublish.bind(this)
    this.onUnpublish = this.onUnpublish.bind(this)
    this.onRemove = this.onRemove.bind(this)
    this.onSettingsUpdate = this.onSettingsUpdate.bind(this)

    this.socket = io()
    this.state = { events: [], offline: true, settings: {} }
  }

  async componentDidMount (): void {
    this.socket.on('connect', this.handleInternetConnection)
    this.socket.on('disconnect', this.handleInternetDisconnect)
    this.socket.on('message', this.handleSocketMessage)
    this.socket.on('reconnect', this.handleInternetReconnect)
    window.addEventListener('offline', this.handleInternetDisconnect)
    window.addEventListener('online', this.handleInternetReconnect)

    this.socket.emit('message', {
      type: constants.sockets.CONNECT_ADMIN
    })

    try {
      const settings = await cache.get('settings')
      const events = await cache.get('events')

      this.setState({ events: events.events, settings: settings.settings })
    } catch (error) {
      console.warn('Unable to load events or settings from cache!', error)
    }
  }

  componentWillUnmount (): void {
    this.socket.off('connect', this.handleInternetConnection)
    this.socket.off('disconnect', this.handleInternetDisconnect)
    this.socket.off('message', this.handleSocketMessage)
    this.socket.off('reconnect', this.handleInternetReconnect)
    window.removeEventListener('offline', this.handleInternetDisconnect)
    window.removeEventListener('online', this.handleInternetReconnect)
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
    this.socket.emit('message', {
      type: constants.sockets.ADMIN_EVENTS_FETCH
    })
  }

  handleEventsEvent (events: Array<EventSchema>): void {
    logger('[handleEventsEvent] incoming events...', events)
    this.setState({ events }, () => cacheEvents(events))
  }

  handleEventAddedEvent (event: EventSchema): void {
    logger('[handleEventAddedEvent] event added...', event)

    const { events } = this.state

    events.push(event)

    this.setState({ events }, () => cacheEvents(events))
  }

  handleEventRemovedEvent (id: string): void {
    logger('[handleEventRemovedEvent] event removed...', id)

    const { events } = this.state
    const updatedEvents = events.filter(e => e.id !== id)

    this.setState({ events: updatedEvents }, () => cacheEvents(updatedEvents))
  }

  handleEventUpdatedEvent (event: EventSchema): void {
    logger('[handleEventUpdatedEvent] event updated...', event)

    const { events } = this.state
    const updatedEvents = events.map(e => e.id === event.id ? event : e)

    this.setState({ events: updatedEvents }, () => cacheEvents(updatedEvents))
  }

  handleSettingsEvent (settings: SettingsSchema): void {
    logger('[handleSettingsEvent] incoming settings...', settings)

    const { from, to } = settings

    this.setState({ settings }, () => {
      cacheSettings(settings)
      this.socket.emit('message', {
        payload: { from, to },
        type: constants.sockets.ADMIN_EVENTS_FETCH
      })
    })
  }

  handleSettingsUpdatedEvent (settings: SettingsSchema): void {
    logger('[handleSettingsUpdatedEvent] settings updated...', settings)
    this.setState({ settings }, () => cacheSettings(settings))
  }

  handleSocketMessage (message) {
    const { payload, type } = message

    logger('[handleSocketMessage] type: %s, payload: ', type, payload)

    switch (type) {
      case constants.sockets.ADMIN_EVENTS:
        this.handleEventsEvent(payload)
        break
      case constants.sockets.ADMIN_EVENT_ADDED:
        this.handleEventAddedEvent(payload)
        break
      case constants.sockets.ADMIN_EVENT_UPDATED:
        this.handleEventUpdatedEvent(payload)
        break
      case constants.sockets.ADMIN_EVENT_REMOVED:
        this.handleEventRemovedEvent(payload)
        break
      case constants.sockets.ADMIN_SETTINGS:
        this.handleSettingsEvent(payload)
        break
      case constants.sockets.ADMIN_SETTINGS_UPDATED:
        this.handleSettingsUpdatedEvent(payload)
        break
      case constants.sockets.CONNECTED_ADMIN:
        this.handleConnectedAdminEvent(payload)
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

  onFilterDateRange (options: EventFetchOptions): void {
    logger('[onFilterDateRange] fetching events with options: ', options)

    this.socket.emit('message', {
      payload: options,
      type: constants.sockets.ADMIN_EVENTS_FETCH
    })
  }

  onPublish (id: string): void {
    logger('[onPublish] publishing event: %s', id)

    this.socket.emit('message', {
      payload: id,
      type: constants.sockets.ADMIN_EVENT_PUBLISH
    })
  }

  onUnpublish (id: string): void {
    logger('[onUnpublish] unpublishing event: %s', id)

    this.socket.emit('message', {
      payload: id,
      type: constants.sockets.ADMIN_EVENT_UNPUBLISH
    })
  }

  onRemove (id: string): void {
    logger('[onRemove] unpublishing event: %s', id)

    this.socket.emit('message', {
      payload: id,
      type: constants.sockets.ADMIN_EVENT_REMOVE
    })
  }

  onSettingsUpdate (newSettings: SettingsSchema): void {
    logger('[onSettingsUpdate] new settings...', newSettings)

    this.socket.emit('message', {
      payload: newSettings,
      type: constants.sockets.ADMIN_SETTINGS_UPDATE
    })
  }
}
