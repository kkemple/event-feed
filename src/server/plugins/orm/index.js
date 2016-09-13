import debug from 'debug'
import moment from 'moment'
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

type Logger = (s: string, ...a: any) => void

type DefaultSettings = {
  autoPublishAll: boolean,
  from: Date,
  hashtags: Array<string>,
  id: string,
  publishers: Array<string>,
  to: Date
}

const defaultSettings: DefaultSettings = {
  autoPublishAll: true,
  from: moment().add(1, 'day').startOf('day').format(),
  hashtags: [
    'javascript',
    'js',
    'node',
    'nodejs',
    'rethinkdb',
    'react',
    'socketio'
  ],
  id: 'settings',
  publishers: [],
  to: moment().add(2, 'day').startOf('day').format()
}

const logger: Logger = debug('server:orm')

const TABLES: Array<string> = [
  'events',
  'settings'
]

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
    logger('[register] setting up database...')

    try {
      // get a connection to rethink
      const connection: Connection = await r.connect(options)

      // this allows us to do r.table() instead of r.db().table() in models
      connection.use(options.db)
      logger('[register] database connection established...')

      const tables: Array<string> = await r.tableList().run(connection)
      logger('[register] found `%s` tables in database...', tables.join(', '))

      // create the tables we need if they don't exist
      await Promise.all(TABLES.map(async T => {
        if (!~tables.indexOf(T)) {
          logger('[register] creating table %s...', T)

          await r.tableCreate(T).run(connection)

          logger('[register] table %s created...', T)
          return Promise.resolve()
        }

        return Promise.resolve()
      }))

      // ensure we have settings or set defaults
      const settings = await r.table('settings').get('settings').run(connection)
      if (!settings) {
        logger('[register] no settings found, settings defaults: ', defaultSettings)
        await r.table('settings').insert(defaultSettings).run(connection)
      }

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
