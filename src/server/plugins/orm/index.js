import r from 'rethinkdb'

import Events from './events'
import Settings from './settings'

type Connection = {
  use: (db: string) => void
}

type HapiPluginOptions = {
  host: string,
  port: number,
  db: string,
  user: string,
  password: string
}

type HapiServer = {
  expose: (s: string, a: any) => void,
  statsd: Object
}

const plugin = {
  async register (
    server: HapiServer,
    options: HapiPluginOptions = {
      host: 'localhost',
      port: 28015,
      db: 'test',
      user: 'admin',
      password: ''
    },
    next: (e?: Error) => void
  ) {
    try {
      // get a connection to rethink
      const connection: Connection = await r.connect(options)

      // this allows us to do r.table() instead of r.db().table() in models
      connection.use(options.db)

      server.expose('events', new Events(connection, server.statsd))
      server.expose('settings', new Settings(connection, server.statsd))
    } catch (error) {
      next(error)
    }

    next()
  }
}

plugin.register.attributes = {
  name: 'orm',
  version: '1.0.0'
}

export default plugin
