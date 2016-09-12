import 'react-datepicker/dist/react-datepicker.css'

import classnames from 'classnames'
import isEqual from 'lodash.isequal'
import moment from 'moment'
import DatePicker from 'react-datepicker'
import debug from 'debug'
import React, { Component } from 'react'

import clearIcon from '../../assets/clear-icon.svg'

type Logger = (s: string, ...a: any) => void

type SettingsSchema = {
  autoPublishAll: boolean,
  from: Date,
  hashtags: Array<string>,
  publishers: Array<string>,
  to: Date
}

function mapPropsToState (props: SettingsSchema): SettingsSchema {
  return {
    autoPublishAll: props.autoPublishAll,
    from: moment(props.from),
    hashtags: props.hashtags,
    publishers: props.publishers,
    to: moment(props.to)
  }
}

const logger: Logger = debug('components:admin:settings-slideout')

export default class SettingsSlideout extends Component {
  state: SettingsSchema

  constructor (props: SettingsSchema): void {
    super(props)

    logger('[constructor] received props: ', props)

    this.handleAutoPublishAllChangeEvent = this.handleAutoPublishAllChangeEvent.bind(this)
    this.handleClearClickEvent = this.handleClearClickEvent.bind(this)
    this.handleFormOnSubmitEvent = this.handleFormOnSubmitEvent.bind(this)
    this.handleFromDateChangeEvent = this.handleFromDateChangeEvent.bind(this)
    this.handleHashtagsChangeEvent = this.handleHashtagsChangeEvent.bind(this)
    this.handlePublishersChangeEvent = this.handlePublishersChangeEvent.bind(this)
    this.handleToDateChangeEvent = this.handleToDateChangeEvent.bind(this)

    this.state = mapPropsToState(props)

    logger('[constructor] default state: ', this.state)
  }

  shouldComponentUpdate (
    nextProps: SettingsSchema,
    nextSettingsSchema: SettingsSchema
  ): boolean {
    return !isEqual(this.props, nextProps) || !isEqual(this.state, nextSettingsSchema)
  }

  componentWillReceiveProps (nextProps: SettingsSchema): void {
    this.setState(mapPropsToState(nextProps))
  }

  render (): void {
    const { active } = this.props
    const { autoPublishAll, from, hashtags, publishers, to } = this.state
    const classes = classnames({ active, 'settings-slideout': true })

    return (
      <div className={classes}>
        <div className='close'>
          <img src={clearIcon} onClick={this.handleClearClickEvent} />
        </div>

        <h2>Settings</h2>

        <form onSubmit={this.handleFormOnSubmitEvent}>
          <fieldset>
            <div>
              <label>From:</label>
              <DatePicker
                selected={from}
                onChange={this.handleFromDateChangeEvent}
              />
            </div>

            <div>
              <label>To:</label>
              <DatePicker
                selected={to}
                onChange={this.handleToDateChangeEvent}
              />
            </div>
          </fieldset>

          <fieldset>
            <label>Hashtags (Do not include #):</label>
            <input
              type='text'
              name='hashtags'
              value={hashtags.join(', ')}
              placeholder='Comma separated list of hashtags'
              onChange={this.handleHashtagsChangeEvent}
              ref={ref => { this.hashtags = ref }}
            />

            <label>Auto Publishers (Do not include @):</label>
            <input
              type='text'
              name='publishers'
              value={publishers.join(', ')}
              placeholder='Comma separated list of publishers'
              onChange={this.handlePublishersChangeEvent}
              ref={ref => { this.publishers = ref }}
            />

            <label>Auto Publish All Events: </label>
            <input
              type='checkbox'
              checked={autoPublishAll}
              onChange={this.handleAutoPublishAllChangeEvent}
              ref={ref => { this.autoPublishAll = ref }}
            />
          </fieldset>
          <button type='submit'>Save</button>
        </form>
      </div>
    )
  }

  handleAutoPublishAllChangeEvent (): void {
    this.setState({ autoPublishAll: !!this.autoPublishAll.checked })
  }

  handleFromDateChangeEvent (date): void {
    this.setState({ from: date })
  }

  handleHashtagsChangeEvent (): void {
    this.setState({ hashtags: this.hashtags.value.split(/,\s+?/) })
  }

  handlePublishersChangeEvent (): void {
    this.setState({ publishers: this.publishers.value.split(/,\s+?/) })
  }

  handleToDateChangeEvent (date): void {
    this.setState({ to: date })
  }

  handleFormOnSubmitEvent (e): void {
    e.preventDefault()

    const { onSettingsUpdate } = this.props
    const { autoPublishAll, from, hashtags, publishers, to } = this.state

    onSettingsUpdate({
      autoPublishAll,
      hashtags,
      publishers,
      from: from.format(), // moment to ISOString
      to: to.format() // moment to ISOString
    })
  }

  handleClearClickEvent (): void {
    const { onToggle } = this.props
    onToggle(false)
  }
}

SettingsSlideout.defaultProps = {
  active: false,
  autoPublishAll: false,
  from: moment(),
  hashtags: [],
  publishers: [],
  onSettingsUpdate (): void {
    logger('[onToggle] no onToggle method provided!', ...arguments)
  },
  onToggle (): void {
    logger('[onToggle] no onToggle method provided!', ...arguments)
  },
  to: moment()
}
