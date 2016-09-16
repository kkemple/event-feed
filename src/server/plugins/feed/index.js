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
      socket.on(constants.sockets.CONNECT_FEED, async () => {
        socket.join('feed')

        socket.on(constants.sockets.FEED_EVENTS_FETCH, async () => {
          try {
            logger('[socket] received events fetch request')
            const data = await events.fetch({ published: true })
            socket.emit(constants.sockets.FEED_EVENTS, data)
            logger('[socket] fetched events', options, data)
          } catch (error) {
            logger('[Error] Error fetching events: ', error)
          }
        })

        socket.on(constants.sockets.FEED_EVENT_VIEW, async id => {
          try {
            await events.update(id, { viewed: true })
            logger('[socket] published event: %s', id)
          } catch (error) {
            logger('[Error] Error publishing event: %s', id, error)
          }
        })

        events.onChange(data => {
          const { old_val: oldVal, new_val: newVal } = data

          if (!newVal && oldVal.published) {
            const { id } = oldVal

            socket.emit(constants.sockets.FEED_EVENT_REMOVED, id)
            logger('[onEventChange] event removed %s', id)
          } else if (!oldVal && newVal.published) {
            socket.emit(constants.sockets.FEED_EVENT_ADDED, newVal)
            logger('[onEventChange] new event added...')
          } else if (newVal && oldVal) {
            socket.emit(constants.sockets.FEED_EVENT_UPDATED, newVal)
            logger('[onEventChange] event updated...')
          }
        })

        socket.emit(constants.sockets.CONNECTED_FEED)
        logger('[socket] joined feed room...')
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
