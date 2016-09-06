import debug from 'debug'
import r from 'rethinkdb'

type Connection = {}

type Cursor = {
  eachAsync: (lambda: (row: Row) => void) => Promise<void>
}

type Logger = (s: string, ...a: any) => void

type SettingsSchema = {
  autoPublishAll: boolean,
  from: Date,
  hashtags: Array<string>,
  publishers: Array<string>,
  to: Date
}

type Result = {
  deleted: number,
  errors: number,
  inserted: number,
  replaced: number,
  skipped: number,
  unchanged: number
}

type Row = {
  new_val: SettingsSchema,
  old_val: SettingsSchema
}

type SettingsTable = {
  changes: () => SettingsSchema,
  filter: (x: Object|(e: SettingsSchema) => boolean) => SettingsSchema,
  get: (id: string) => Promise<SettingsSchema>,
  insert: (data: SettingsSchema) => Promise<Result>,
  run: (c: Connection) => Promise<any>,
  update: (data: SettingsSchema) => Promise<Result>
}

type Statsd = {
  timing: (s: string, d: Date) => void
}

const logger: Logger = debug('server:plugins:orm:settings')

export default class Settings {
  connection: Connection
  statsd: Statsd
  settings: SettingsTable
  fns: Array<Function>

  constructor (connection: Connection, statsd: Statsd) {
    this.connection = connection
    this.fns = []
    this.settings = r.table('settings')
    this.statsd = statsd

    this.initChangeListener()
  }

  async onRowChange (row: Row): void {
    logger('[change] Row updated: %j', row)
    this.fns.forEach(fn => fn(row))
  }

  async initChangeListener (): void {
    try {
      const cursor: Cursor = await this.settings
        .get('settings')
        .changes()
        .run(this.connection)

      await cursor.eachAsync(this.onRowChange.bind(this))
    } catch (error) {
      logger('[change] Error for realtime changes: %j', error)
      throw error
    }
  }

  async fetch (): Promise<SettingsSchema> {
    try {
      const timer: Date = new Date()
      const result: SettingsSchema = await this.settings
        .get('settings')
        .run(this.connection)

      this.statsd.timing('orm.settings.fetch', timer)
      logger('[fetch] Fetched: %j', result)

      return result
    } catch (error) {
      logger('[Error] Error fetching settings: ', error)
      throw error
    }
  }

  async update (data: SettingsSchema): Promise<Result> {
    try {
      const timer: Date = new Date()

      const result: Result = await this.settings
        .get('settings')
        .update(data)
        .run(this.connection)

      this.statsd.timing('orm.settings.update', timer)
      logger('[update] Updated: %j', result)

      return result
    } catch (error) {
      logger('[Error] Error updating settings: ', data, error)
      throw error
    }
  }

  onChange (fn: (r: Row) => void): void {
    this.fns.push(fn)
  }
}
