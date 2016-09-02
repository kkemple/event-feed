import debug from 'debug'
import socketio from 'socket.io'

type HapiPluginOptions = {}

type HapiServer = {
  expose: (name: string, a: any) => void,
  listener: any,
  statsd: {
    increment: (s: string) => void,
    decrement: (s: string) => void
  }
}

type IO = {
  on: (event: string, cb: (s: Socket) => void) => void
}

type Logger = (s: string, ...a: any) => void

type Socket = {
  on: (event: string, cb: (d?: any) => void) => void
}

const logger: Logger = debug('server:plugins:sockets')

const plugin = {
  register (
    server: HapiServer,
    options: HapiPluginOptions,
    next: (e?: Error) => void
  ) {
    function handleConnection (socket: Socket) {
      server.statsd.increment('sockets.connection.count')
      logger('[socket.io] connection...')

      socket.on('disconnect', () => {
        server.statsd.decrement('sockets.connection.count')
        logger('[socket.io] connection closed...')
      })

      socket.on('error', (error) => {
        server.statsd.increment('sockets.error.count')
        logger('[Error] Error from socket:', error)
      })
    }

    const io: IO = socketio(server.listener)
    io.on('connection', handleConnection)
    server.expose('io', io)

    next()
  }
}

plugin.register.attributes = {
  name: 'sockets',
  version: '1.0.0'
}

export default plugin
