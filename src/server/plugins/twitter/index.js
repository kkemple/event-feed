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
  statsd: {
    timing: (s: string, d: Date) => void,
    increment: (s: string) => void
  }
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
  publishers: {
    facebook: Array<string>,
    instagram: Array<string>,
    twitter: Array<string>
  },
  to: Date
}

type SettingsModel = {
  onChange: (lambda: (row: SettingsRow) => void) => void,
  fetch: () => Promise<SettingsSchema>,
  get: (id: string) => Promise<SettingsSchema>,
  update: (data: SettingsSchema) => Promise<Result>
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
    timestamp: new Date().toISOString(),
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

const plugin = {
  async register (
    server: HapiServer,
    options: HapiPluginOptions,
    next: (e?: Error) => void
  ) {
    const { events, settings } = server.plugins.orm

    const client = new Twitter({
      access_token_key: options.accessToken,
      access_token_secret: options.accessSecret,
      consumer_key: options.consumerKey,
      consumer_secret: options.consumerSecret
    })

    // settings are not constant, they can be updated by admin
    const config: SettingsSchema = await settings.fetch()
    let { hashtags, publishers, autoPublishAll } = config
    let from: Date = new Date(config.from)
    let to: Date = new Date(config.to)

    settings.onChange(data => {
      const { new_val: config } = data

      // update config
      from = new Date(config.from)
      to = new Date(config.to)
      hashtags = config.hashtags
      publishers = config.publishers
      autoPublishAll = config.autoPublishAll
    })

    client.stream('statuses/filter', {
      track: hashtags.join(',')
    }, (stream) => {
      logger('[stream] Stream connected, waiting for matching events...')

      stream.on('data', async (tweet: Tweet) => {
        // if not within target time range don't process
        const now: Date = new Date(parseInt(tweet.timestamp_ms, 10))
        if (now < from || now > to) return

        // don't process retweets
        if (tweet.retweeted_status) return

        // skip if no matched hashtags
        if (!tweet.entities || !hasRequiredHashtag(hashtags, tweet.entities.hashtags)) return

        logger('[stream] Event received: ', JSON.stringify(tweet, null, 2))
        server.statsd.increment('twitter.tweets')

        const timer: Date = new Date()

        try {
          // check for publisher for auto publishing
          const publisher:string = publishers.twitter
            .filter(p => p === tweet.user.screen_name)[0]

          await events.add(mapTweetToEvent(tweet, !!publisher || autoPublishAll))

          server.statsd.timing('twitter.parse', timer)
        } catch (error) {
          logger('[stream] error adding event to database!', error)
          server.statsd.increment('twitter.error')
        }
      })

      stream.on('error', (error: Error) => {
        logger('[stream] Error from stream: ', error)
      })
    })

    next()
  }
}

plugin.register.attributes = {
  name: 'twitter',
  verion: '1.0.0'
}

export default plugin
