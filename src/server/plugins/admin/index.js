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
  publishers: {
    twitter: Array<string>,
    facebook: Array<string>,
    instagram: Array<string>
  },
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
      socket.on(constants.sockets.CONNECT_ADMIN, async () => {
        socket.join('admin')

        socket.on(constants.sockets.ADMIN_EVENTS_FETCH, async options => {
          try {
            const data = await events.fetch(options)
            socket.emit(constants.sockets.ADMIN_EVENTS, data)
            logger('[socket] fetched events', options, data)
          } catch (error) {
            logger('[Error] Error fetching events: ', error)
          }
        })

        socket.on(constants.sockets.ADMIN_EVENT_PUBLISH, async id => {
          try {
            await events.update(id, { published: true })
            logger('[socket] published event: %s', id)
          } catch (error) {
            logger('[Error] Error publishing event: %s', id, error)
          }
        })

        socket.on(constants.sockets.ADMIN_EVENT_UNPUBLISH, async id => {
          try {
            await events.update(id, { published: false })
            logger('[socket] unpublished event: %s', id)
          } catch (error) {
            logger('[Error] Error unpublishing event: %s', id, error)
          }
        })

        socket.on(constants.sockets.ADMIN_EVENT_REMOVE, async id => {
          try {
            await events.remove(id)
            logger('[socket] removed event: %s', id)
          } catch (error) {
            logger('[Error] Error removing event: %s', id, error)
          }
        })

        socket.on(constants.sockets.ADMIN_SETTINGS_FETCH, async () => {
          try {
            const data: SettingsSchema = await settings.fetch()

            socket.emit(constants.sockets.ADMIN_SETTINGS, data)
            logger('[socket] fetched settings: ', data)
          } catch (error) {
            logger('[Error] Error fetching settings: ', error)
          }
        })

        socket.on(constants.sockets.ADMIN_SETTINGS_UPDATE, async data => {
          try {
            await settings.update(data)
            logger('[socket] updated settings: ', data)
          } catch (error) {
            logger('[Error] Error updating settings: ', data, error)
          }
        })

        events.onChange(data => {
          const { old_val: oldVal, new_val: newVal } = data

          if (!newVal) {
            const { id } = oldVal

            socket.emit(constants.sockets.ADMIN_EVENT_REMOVED, id)
            logger('[onEventChange] event removed %s', id)
          } else if (!oldVal) {
            socket.emit(constants.sockets.ADMIN_EVENT_ADDED, newVal)
            logger('[onEventChange] new event added...')
          } else {
            socket.emit(constants.sockets.ADMIN_EVENT_UPDATED, newVal)
            logger('[onEventChange] event updated...')
          }
        })

        settings.onChange(data => {
          const { new_val: newVal } = data

          socket.emit(constants.sockets.ADMIN_SETTINGS_UPDATED, newVal)
          logger('[onSettingsChange] settings updated...')
        })

        socket.emit(constants.sockets.CONNECTED_ADMIN)
        logger('[socket] joined admin room...')
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
