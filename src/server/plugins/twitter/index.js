import debug from 'debug'
import Twitter from 'twitter'

type EventSchema = {
  content: string,
  media: EventMediaSchema|null,
  provider: string,
  published: boolean,
  timestamp: Date,
  viewed: boolean
}

type EventMediaSchema = {
  type: "photo"|"video",
  url: string
}

type EventsModel = {
  get: (id: string) => Promise<EventSchema>,
  add: (data: EventSchema) => Promise<Result>,
  update: (data: EventSchema) => Promise<Result>
}

type HapiPluginOptions = {
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessSecret: string
}

type HapiServer = {
  plugins: {
    orm: {
      events: EventsModel,
      settings: SettingsModel
    }
  },
  statsd: Statsd
}

type Logger = (s: string, ...a: any) => void

type Result = {
  deleted: number,
  errors: number,
  inserted: number,
  replaced: number,
  skipped: number,
  unchanged: number
}

type SettingsRow = {
  new_val: SettingsSchema,
  old_val: SettingsSchema
}

type SettingsSchema = {
  autoPublishAll: boolean,
  from: Date,
  hashtags: Array<string>,
  publishers: Array<string>,
  to: Date
}

type SettingsModel = {
  onChange: (lambda: (row: SettingsRow) => void) => void,
  fetch: () => Promise<SettingsSchema>,
  get: (id: string) => Promise<SettingsSchema>,
  update: (data: SettingsSchema) => Promise<Result>
}

type Statsd = {
  timing: (s: string, d: Date) => void,
  increment: (s: string) => void
}

type TweetMedia = {
  media_url: string,
  type: "photo"|"video",
  video_info: {
    variants: Array<Object>
  }
}

type Tweet = {
  entities: {
    hashtags: Array<string>
  },
  extended_entities: {
    media: Array<TweetMedia>
  },
  retweeted_status: Object,
  text: string,
  timestamp_ms: string,
  user: {
    screen_name: string
  }
}

type TwitterClient = {
  stream: (endpoint: string, config: { track: string }) => TwitterStream
}

type TwitterStream = {
  destroy: () => void,
  on: (event: string, cb: (...a?: any) => void) => void
}

const logger: Logger = debug('server:plugins:twitter')

function getImageUrl (media: TweetMedia): string {
  return media.media_url || ''
}

function getTweetMedia (tweet: Tweet): TweetMedia|typeof undefined {
  return tweet.extended_entities
    ? tweet.extended_entities.media[0]
    : undefined
}

function getVideoUrl (media: TweetMedia): string {
  const { video_info: videoInfo } = media
  const { variants } = videoInfo
  const videos = variants.filter(v => v.content_type === 'video/mp4')
  const videosByBitRate = videos.sort((a, b) => a.bitrate > b.bitrate)

  return videosByBitRate[0].url
}

function hasRequiredHashtag (
  allowed: Array<string>,
  actual: Array<string>
): boolean {
  let result = false
  actual.forEach(ac => {
    allowed.forEach(al => {
      if (ac.text.toLowerCase() === al.toLowerCase()) result = true
    })
  })
  return result
}

function mapTweetToEvent (
  tweet: Tweet,
  publish: boolean
): EventSchema {
  const media: TweetMedia = getTweetMedia(tweet)

  return {
    content: tweet.text,
    media: mapTwitterMediaToEventMedia(media),
    provider: 'twitter',
    published: publish,
    timestamp: new Date(parseInt(tweet.timestamp_ms, 10)).toISOString(),
    username: tweet.user.screen_name,
    viewed: false
  }
}

function mapTwitterMediaToEventMedia (media: TweetMedia): EventMediaSchema|null {
  if (!media) return null

  const { type } = media

  switch (type) {
    case 'photo':
      return { type, url: getImageUrl(media) }
    case 'video':
      return { type, url: getVideoUrl(media) }
    default:
      return null
  }
}

function createStream (
  config: SettingsSchema,
  client: TwitterClient,
  model: EventsModel,
  statsd: Statsd
): TwitterStream {
  let stream: TwitterStream = client.stream('statuses/filter', {
    track: config.hashtags.join(',')
  })

  stream.on('data', processTweet(config, model, statsd))
  stream.on('error', (error) => logger('[stream] Error from stream: ', error))

  return stream
}

function processTweet (
  config: SettingsSchema,
  model: EventsModel,
  statsd: Statsd
): (tweet: Tweet) => void {
  const from = new Date(config.from)
  const to = new Date(config.to)

  return async (tweet: Tweet) => {
    const timer: Date = new Date()

    // if not within target time range don't process
    const now: Date = new Date(parseInt(tweet.timestamp_ms, 10))
    if (now < from || now > to) return

    // don't process retweets
    if (tweet.retweeted_status) return

    // skip if no matched hashtags
    if (!tweet.entities ||
      !hasRequiredHashtag(config.hashtags, tweet.entities.hashtags)) return

    logger('[processTweet] tweet received: ', JSON.stringify(tweet, null, 2))
    statsd.increment('twitter.tweets')

    try {
      // check for publisher for auto publishing
      const publisher: string = config.publishers
        .filter(p => p === tweet.user.screen_name)[0]
      const publish = !!publisher || config.autoPublishAll

      await model.add(mapTweetToEvent(tweet, publish))

      statsd.timing('twitter.parse', timer)
    } catch (error) {
      logger('[processTweet] error adding to database!', error)
      statsd.increment('twitter.error')
    }
  }
}

const plugin = {
  async register (
    server: HapiServer,
    options: HapiPluginOptions,
    next: (e?: Error) => void
  ) {
    const { events, settings } = server.plugins.orm

    const client: TwitterClient = new Twitter({
      access_token_key: options.accessToken,
      access_token_secret: options.accessSecret,
      consumer_key: options.consumerKey,
      consumer_secret: options.consumerSecret
    })

    // settings are not constant, they can be updated by admin
    let config: SettingsSchema = await settings.fetch()

    // stream is not constant, it can be changed by settings changes
    let stream: TwitterStream = createStream(config, client, events, server.statsd)
    logger('[stream] Stream connected, waiting for matching events...')

    // reset stream on settings updates
    settings.onChange(data => {
      const { new_val: config } = data

      // reset strem
      stream.destroy()
      stream = createStream(config, client, events, server.statsd)
    })

    next()
  }
}

plugin.register.attributes = {
  name: 'twitter',
  verion: '1.0.0'
}

export default plugin
