import classnames from 'classnames'
import debounce from 'lodash.debounce'
import debug from 'debug'
import isEqual from 'lodash.isequal'
import moment from 'moment'
import React, { Component } from 'react'
import Draggable from 'react-draggable'

type Logger = (s: string, ...a: any) => void

type State = {
  containerWidth: number,
  duration: number,
  filterFromX: number,
  filterToX: number,
  from: moment,
  to: moment
}

type TimelineFilterProps = {
  from: Date,
  to: Date
}

type TimelineTimeState = {
  duration: number,
  from: moment,
  to: moment
}

const HOUR: number = 1000 * 60 * 60

const logger: Logger = debug('client:components:admin:timeline-filter')

// called during instantiation and when to and from props are updated
function mapTimePropsToState (props: TimelineFilterProps): TimelineTimeState {
  let { from, to } = props

  from = moment(from)
  to = moment(to)

  const duration: number = to.valueOf() - from.valueOf()

  logger('[mapTimePropsToState] state: ', { duration, from, to })

  return {
    duration,
    from,
    to
  }
}

export default class TimelineFilter extends Component {
  state: State

  constructor (props: TimelineFilterProps): void {
    super(props)

    this.fetchEvents = debounce(this.fetchEvents.bind(this), 250)
    this.handleFromDragEvent = this.handleFromDragEvent.bind(this)
    this.handleToDragEvent = this.handleToDragEvent.bind(this)
    this.updateDimensions = debounce(this.updateDimensions.bind(this), 250)

    this.state = {
      ...mapTimePropsToState(props),
      containerWidth: 0,
      filterFromX: 0,
      filterToX: 0
    }
  }

  componentWillReceiveProps (nextProps: TimelineFilterProps): void {
    const { containerWidth, from: currentFrom, to: currentTo } = this.state
    const { from: nextFrom, to: nextTo } = nextProps

    // unless 'from' or 'to' have changed, ignore updates
    if (currentFrom.valueOf() === moment(nextFrom).valueOf() &&
      currentTo.valueOf() === moment(nextTo).valueOf()) return

    this.setState({
      ...mapTimePropsToState(nextProps),
      filterFromX: 0,
      filterToX: containerWidth
    })
  }

  shouldComponentUpdate (
    nextProps: TimelineFilterProps,
    nextState: State
  ): boolean {
    return !isEqual(this.props, nextProps) || !isEqual(this.state, nextState)
  }

  componentDidMount (): void {
    const { width } = this.container.getBoundingClientRect()

    this.setState({
      containerWidth: width,
      filterFromX: 0,
      filterToX: width
    })

    window.addEventListener('resize', this.updateDimensions)
  }

  componentWillUnmount (): void {
    window.removeEventListener('resize', this.updateDimensions)
  }

  render (): void {
    const { classes } = this.props
    const { filterFromX, filterToX } = this.state

    return (
      <div
        className={`timeline-filter ${classes.join(' ')}`}
        ref={ref => { this.container = ref }}>

        <Draggable
          axis='x'
          bounds={{ left: 0 }}
          onDrag={this.handleFromDragEvent}
          initialPosition={{ x: filterFromX }}>

          <div className='handle from' />
        </Draggable>
        <Draggable
          axis='x'
          bounds={{ right: 0 }}
          onDrag={this.handleToDragEvent}
          initialPosition={{ x: filterToX }}>

          <div className='handle to' />
        </Draggable>

        {this.renderMarkers()}
        {this.renderFilterRangeOverlay()}
      </div>
    )
  }

  renderFilterRangeOverlay (): Component {
    const { filterFromX, filterToX } = this.state

    const styles = {
      left: filterFromX || 0,
      width: filterToX - filterFromX || 0
    }

    return (
      <div
        className='filter-range-overlay'
        style={styles}
      />
    )
  }

  renderMarkers (): Array<Component> {
    const { duration, from, to } = this.state

    // get number of hours in duration
    const hoursCount: number = Math.ceil(duration / HOUR)

    // [...Array(hoursCount).keys()] creates a ranged array [0,1,2,3,...N]
    const range = [...Array(hoursCount).keys()]

    // get start|end timestamps
    const endTimestamp: number = to.valueOf()
    const startTimestamp: number = from.valueOf()

    // create an array of timestamps
    const timestamps: Array<number> = range.map(i => {
      // round timestamp to nearset hour
      const timestamp: number = startTimestamp + (HOUR * i)

      // only return timestamp if it is less than our end time - 30 minutes
      // otherwise we are within a half our of end time
      return (timestamp < (endTimestamp - 30))
        ? moment(timestamp)
        : moment(endTimestamp)
    })

    return timestamps.map((t, i, self) => {
      const classes = classnames({
        'day-marker': t.hour() === 0,
        first: i === 0,
        last: i === self.length - 1,
        marker: true
      })

      return t.hour() === 0
        ? (
        <div key={i} className={classes}>
          <span>{moment(t).format('ddd, Do hA')}</span>
        </div>
        )
        : (
        <div key={i} className={classes} />
        )
    })
  }

  fetchEvents (): void {
    const {
      containerWidth,
      duration,
      filterFromX,
      filterToX,
      from,
      to
    } = this.state

    // get our action to fire once we calculate filtered timestamps
    const { onEventsFetch } = this.props

    // get the percentages from the edges of the timeline slider
    const fromPercentageIncrease: number = filterFromX / containerWidth
    const toPercentageDecrease: number = (containerWidth - filterToX) / containerWidth

    // if we have moved the from handle, calculate the percentage of time from 'from' we have moved to
    const filteredFrom: Date = filterFromX > 0
      ? new Date(from.valueOf() + (duration * fromPercentageIncrease)).toISOString()
      : new Date(from.valueOf()).toISOString()

    // if we have moved the to handle, calculate the percentage of time from 'to' we have moved to
    const filteredTo: Date = filterToX < containerWidth
      ? new Date(to.valueOf() - (duration * toPercentageDecrease)).toISOString()
      : new Date(to.valueOf()).toISOString()

    // request events for new time range
    onEventsFetch({ from: filteredFrom, to: filteredTo })
  }

  handleFromDragEvent (e, ui): void|false {
    const { filterToX } = this.state
    const filterFromX = ui.x

    // make sure we don't cross over the 'to' handle
    if (!(filterFromX < (filterToX - 5))) return false

    // once state is updated, fetch events
    this.setState({ filterFromX }, () => this.fetchEvents())
  }

  handleToDragEvent (e, ui): void|false {
    const { containerWidth, filterFromX } = this.state
    const filterToX = containerWidth - Math.abs(ui.x)

    // make sure we don't cross over the 'from' handle
    if (filterToX < (filterFromX + 7)) return false

    // once state is updated, fetch events
    this.setState({ filterToX }, () => this.fetchEvents())
  }

  updateDimensions (): void {
    const { width } = this.container.getBoundingClientRect()

    this.setState({ containerWidth: width })
  }
}

TimelineFilter.defaultProps = {
  classes: [],
  from: new Date(),
  to: new Date(Date.now() + (1000 * 60 * 60 * 24))
}
