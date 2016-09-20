import cuid from 'cuid'
import debug from 'debug'
import r from 'rethinkdb'

type Connection = {}

type Cursor = {
  eachAsync: (lambda: (row: Row) => void) => Promise<void>,
  toArray: () => Promise<Array<EventSchema>>
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

type EventsTable = {
  changes: () => EventsTable,
  filter: (x: Object|(e: EventSchema) => boolean) => EventsTable,
  get: (id: string) => Promise<EventSchema>,
  insert: (data: EventSchema) => Promise<Result>,
  run: (c: Connection) => Promise<any>,
  update: (data: EventSchema) => Promise<Result>
}

type FetchOptions = {
  from: Date,
  to: Date,
  published: Boolean,
  viewed: Boolean
}

type Logger = (s: string, ...a: any) => void

type Row = {
  new_val: EventSchema,
  old_val: EventSchema
}

type Result = {
  deleted: number,
  errors: number,
  inserted: number,
  replaced: number,
  skipped: number,
  unchanged: number
}

type Statsd = {
  increment: (s: string, ...a: any) => void,
  timing: (s: string, d: Date) => void
}

const logger: Logger = debug('server:plugin:orm:events')

export default class Events {
  connection: Connection
  statsd: Statsd
  events: EventsTable
  fns: Array<Function>

  constructor (connection: Connection, statsd: Statsd) {
    this.connection = connection
    this.events = r.table('events')
    this.fns = []
    this.statsd = statsd

    this.initChangeListener()
  }

  async onRowChange (row: Row): void {
    logger('[change] Row updated: %j', row)
    this.fns.forEach(fn => fn(row))
  }

  async initChangeListener (): void {
    try {
      const cursor: Cursor = await this.events
        .changes()
        .run(this.connection)

      await cursor.eachAsync(this.onRowChange.bind(this))
    } catch (error) {
      logger('[change] Error for realtime changes: %j', error)
      throw error
    }
  }

  async fetch (options: FetchOptions): Promise<Array<EventSchema>> {
    const { from, published, to, viewed } = options

    try {
      const timer: Date = new Date()

      let query: r.table = this.events

      logger('[fetch] fetching with options: ', options)

      // create initial query by filtering within given range
      if (from && to) {
        query = query
          .filter(event => r.ISO8601(event('timestamp'))
            .during(
              r.ISO8601(from),
              r.ISO8601(to)
            ))
      }

      if (typeof published !== 'undefined') {
        query = query.filter({ published })
      }

      if (typeof viewed !== 'undefined') {
        query = query.filter({ viewed })
      }

      query = query.orderBy(r.desc('timestamp'))

      const cursor: Cursor = await query.run(this.connection)

      const events: Array<EventSchema> = await cursor.toArray()

      this.statsd.timing('orm.events.fetch', timer)
      logger('[fetch] Fetched events: %j', events)

      return events
    } catch (error) {
      logger('[fetch] Error fetching events: %j', error)
      throw error
    }
  }

  async add (data: EventSchema): Promise<Result> {
    try {
      const timer: Date = new Date()

      const result: Result = await this.events
        .insert({ ...data, id: cuid() })
        .run(this.connection)

      this.statsd.timing('orm.events.add', timer)
      this.statsd.increment('events.count')

      logger('[add] Added event: %j', data)

      return result
    } catch (error) {
      throw error
    }
  }

  async remove (id: string): void {
    try {
      const timer: Date = new Date()

      const result: Result = await this.events
        .get(id)
        .delete()
        .run(this.connection)

      this.statsd.timing('orm.events.remove', timer)
      this.statsd.decrement('events.count')
      logger('[remove] Removed event: %s', id)

      return result
    } catch (error) {
      logger('[remove] Error removing event: %s', id)
      throw error
    }
  }

  async update (id: string, data: EventSchema): Promise<Result> {
    try {
      const timer: Date = new Date()

      const result: Result = await this.events
        .get(id)
        .update(data)
        .run(this.connection)

      this.statsd.timing('orm.events.update', timer)
      logger('[update] Updated event: %s, data: %j, result: %j', id, data, result)

      return result
    } catch (error) {
      logger('[update] Error updating event: %s, data: %j', id, data)
      throw error
    }
  }

  onChange (fn: (r: Row) => void): void {
    this.fns.push(fn)
  }
}
