import path from 'path'

import debug from 'debug'
import hapi from 'hapi'
import healthcheck from 'jasper-hapi-healthcheck'
import inert from 'inert'
import metrics from 'jasper-hapi-metrics'
import pino from 'hapi-pino'
import statsd from 'hapi-statsd'

import admin from './plugins/admin'
import feed from './plugins/feed'
import orm from './plugins/orm'
import sockets from './plugins/sockets'
import twitter from './plugins/twitter'

type HapiPluginOptions = {}

type HapiServer = {
  connection: (port: number|string|typeof undefined) => void,
  register: (p: Plugin|Array<Plugin>, cb: (e?: Error) => void) => void,
  route: (r: Route|Array<Route>) => void,
  start: (e?: Error) => void
}

type Logger = (s: string, ...a: any) => void

type OrmOptions = {
  host: string|typeof undefined,
  port: string|number|typeof undefined,
  db: string|typeof undefined,
  user: string|typeof undefined,
  password: string|typeof undefined
}

type Plugin = {
  options?: Object,
  register: (
    server: HapiServer,
    options: HapiPluginOptions,
    next: (e?: Error) => void
  ) => void
}

type Route = {
  config: {
    handler: {
      file: string
    }
  },
  method: string,
  path: string
}

type TwitterOptions = {
  accessSecret: string|typeof undefined,
  accessToken: string|typeof undefined,
  consumerKey: string|typeof undefined,
  consumerSecret: string|typeof undefined
}

type StatsdOptions = {
  host: string,
  port: string|number
}

const logger: Logger = debug('server')

const ormOptions: OrmOptions = {
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  db: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD
}

const statsdOptions: StatsdOptions = {
  host: 'localhost',
  port: 8025
}

const twitterOptions: TwitterOptions = {
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET
}

const plugins: Array<Plugin> = [
  { register: inert },
  { register: pino },
  { register: statsd, options: statsdOptions },
  { register: healthcheck },
  { register: metrics },
  { register: orm, options: ormOptions },
  { register: sockets },
  { register: admin },
  { register: feed },
  { register: twitter, options: twitterOptions }
]

const server = new hapi.Server({
  connections: {
    routes: {
      files: {
        relativeTo: path.join(__dirname, '..', 'client')
      }
    }
  }
})

server.connection({ port: process.env.PORT || 3000 })

server.register(plugins, error => {
  if (error) {
    console.log('[Error] Error registering plugins:', error)
    return
  }

  logger('[register] plugins loaded successfully...')

  server.route([
    // register script path for app
    {
      method: 'GET',
      path: '/public/{path*}',
      config: {
        cache: {
          // assest file names are hashed so we can have long TTL
          expiresIn: 1000 * 60 * 60 * 24 * 10
        },
        handler: {
          directory: {
            path: 'public'
          }
        }
      }
    },

    // register route for service worker
    {
      method: 'GET',
      path: '/sw.js',
      handler (request, reply) {
        reply.file('sw.js').type('text/javascript')
      }
    },

    // register route for service worker
    {
      method: 'GET',
      path: '/manifest.json',
      handler (request, reply) {
        reply.file('manifest.json').type('application/json')
      }
    },

    // register catch all route for the SPA
    {
      method: 'GET',
      path: '/{path*}',
      config: {
        cache: {
          // shorter TTL for index.html
          expiresIn: 1000 * 60 * 60 * 24
        },
        handler: {
          file: 'index.html'
        }
      }
    }
  ])

  logger('[routes] client routes added to server...')

  server.start(error => {
    if (error) {
      console.log('[Error] Error starting server:', error)
      process.exit(1)
    }

    logger('[start] server started successfully...')
  })
})
