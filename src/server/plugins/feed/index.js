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

type Socket = {
  on: (event: string, cb: (d?: any) => void) => void
}

const logger: Logger = debug('server:plugins:feed')

const plugin = {
  async register (
    server: HapiServer,
    options: HapiPluginOptions,
    next: (e?: Error) => void
  ) {
    const io: IO = server.plugins.sockets.io
    const { events } = server.plugins.orm

    io.on('connection', socket => {
      socket.on('message', async message => {
        const { type, payload } = message

        switch (type) {
          case constants.sockets.FEED_EVENTS_FETCH:
            try {
              logger('[socket] received events fetch request', payload)

              const data = await events.fetch(payload)

              socket.emit('message', {
                payload: data,
                type: constants.sockets.FEED_EVENTS
              })

              logger('[socket] fetched events', payload, data)
            } catch (error) {
              logger('[Error] Error fetching events: ', error)
            }
            break

          case constants.sockets.FEED_EVENT_VIEW:
            try {
              await events.update(id, { viewed: true })
              logger('[socket] published event: %s', id)
            } catch (error) {
              logger('[Error] Error publishing event: %s', id, error)
            }
            break

          case constants.sockets.CONNECT_FEED:
            socket.join('admin')

            socket.emit('message', {
              type: constants.sockets.CONNECTED_FEED
            })

            logger('[socket] joined feed room...')
            break

          default:
            console.warn('No handler for message type: ', type)
          break
        }
      })

      events.onChange(data => {
        const { old_val: oldVal, new_val: newVal } = data

        if (!newVal && oldVal.published) {
          const { id } = oldVal

          socket.emit('message', {
            payload: id,
            type: constants.sockets.FEED_EVENT_REMOVED
          })
          logger('[onEventChange] event removed %s', id)

        } else if (!oldVal && newVal.published) {
          socket.emit('message', {
            payload: newVal,
            type: constants.sockets.FEED_EVENT_ADDED
          })
          logger('[onEventChange] new event added...')

        } else if (newVal && oldVal) {
          socket.emit('message', {
            payload: newVal,
            type: constants.sockets.FEED_EVENT_UPDATED
          })
          logger('[onEventChange] event updated...')
        }
      })
    })

    next()
  }
}

plugin.register.attributes = {
  name: 'feed',
  version: '1.0.0'
}

export default plugin
