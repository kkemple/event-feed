import constants from 'constants'
import debug from 'debug'

type HapiPluginOptions = {}

type HapiServer = {
  plugins: {
    sockets: {
      io: {
        on: Function,
        in: Function
      }
    }
  },
  statsd: {
    increment: (s: string) => void,
    timing: (s: string, d: Date) => void
  }
}

type IO = {
  on: (event: string, cb: (s: Socket) => void) => void
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

const logger: Logger = debug('server:plugins:admin')

const plugin = {
  async register (
    server: HapiServer,
    options: HapiPluginOptions,
    next: (e?: Error) => void
  ) {
    const io: IO = server.plugins.sockets.io
    const { events, settings } = server.plugins.orm

    io.on('connection', socket => {
      socket.on('message', async message => {
        const { type, payload } = message

        switch (type) {
          case constants.sockets.ADMIN_EVENTS_FETCH:
            try {
              logger('[socket] received events fetch request', payload)

              const data = await events.fetch(payload)

              socket.emit('message', {
                payload: data,
                type: constants.sockets.ADMIN_EVENTS
              })

              logger('[socket] fetched events', payload, data)
            } catch (error) {
              logger('[Error] Error fetching events: ', error)
            }

            break
          case constants.sockets.ADMIN_EVENT_PUBLISH:
            try {
              await events.update(payload, { published: true })
              logger('[socket] published event: %s', payload)
            } catch (error) {
              logger('[Error] Error publishing event: %s', payload, error)
            }

            break
          case constants.sockets.ADMIN_EVENT_UNPUBLISH:
            try {
              await events.update(payload, { published: false })
              logger('[socket] unpublished event: %s', payload)
            } catch (error) {
              logger('[Error] Error unpublishing event: %s', payload, error)
            }

            break
          case constants.sockets.ADMIN_EVENT_REMOVE:
            try {
              await events.remove(payload)
              logger('[socket] removed event: %s', payload)
            } catch (error) {
              logger('[Error] Error removing event: %s', payload, error)
            }

            break
          case constants.sockets.ADMIN_SETTINGS_FETCH:
            try {
              const data: SettingsSchema = await settings.fetch()

              socket.emit('message', {
                payload: data,
                type: constants.sockets.ADMIN_SETTINGS
              })
              logger('[socket] fetched settings: ', data)
            } catch (error) {
              logger('[Error] Error fetching settings: ', error)
            }

            break
          case constants.sockets.ADMIN_SETTINGS_UPDATE:
            try {
              await settings.update(payload)
              logger('[socket] updated settings: ', payload)
            } catch (error) {
              logger('[Error] Error updating settings: ', payload, error)
            }

            break
          case constants.sockets.CONNECT_ADMIN:
            socket.join('admin')

            socket.emit('message', {
              type: constants.sockets.CONNECTED_ADMIN
            })

            logger('[socket] joined admin room...')

            break
          default:
            console.warn('No handler for message type: ', type)
            break
        }
      })

      events.onChange(data => {
        const { old_val: oldVal, new_val: newVal } = data

        if (!newVal) {
          const { id } = oldVal

          socket.emit('message', {
            payload: id,
            type: constants.sockets.ADMIN_EVENT_REMOVED
          })

          logger('[onEventChange] event removed %s', id)
        } else if (!oldVal) {
          socket.emit('message', {
            payload: newVal,
            type: constants.sockets.ADMIN_EVENT_ADDED
          })

          logger('[onEventChange] new event added...')
        } else {
          socket.emit('message', {
            payload: newVal,
            type: constants.sockets.ADMIN_EVENT_UPDATED
          })

          logger('[onEventChange] event updated...')
        }
      })

      settings.onChange(data => {
        const { new_val: newVal } = data

        socket.emit('message', {
          payload: newVal,
          type: constants.sockets.ADMIN_SETTINGS_UPDATED
        })
        logger('[onSettingsChange] settings updated...')
      })
    })

    next()
  }
}

plugin.register.attributes = {
  name: 'admin',
  version: '1.0.0'
}

export default plugin
