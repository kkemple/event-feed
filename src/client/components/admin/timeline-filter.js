import classnames from 'classnames'
import debounce from 'lodash.debounce'
import debug from 'debug'
import isEqual from 'lodash.isequal'
import moment from 'moment'
import React, { Component } from 'react'
import Draggable from 'react-draggable'
import Pinchable from 'react-tappable/lib/Pinchable'

type Logger = (s: string, ...a: any) => void

type State = {
  containerLeft: number,
  containerWidth: number,
  duration: number,
  filterFromX: number,
  filterToX: number,
  from: moment,
  fromDraggablePosition: {
    x: number,
    y: number
  },
  to: moment,
  toDraggablePosition: {
    x: number,
    y: number
  }
}

type Props = {
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
function mapTimePropsToState (props: Props): TimelineTimeState {
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

  constructor (props: Props): void {
    super(props)

    this.fetchEvents = debounce(this.fetchEvents.bind(this), 250)
    this.handleFromDragEvent = this.handleFromDragEvent.bind(this)
    this.handleOverlayPinchEvent = this.handleOverlayPinchEvent.bind(this)
    this.handleToDragEvent = this.handleToDragEvent.bind(this)
    this.updateDimensions = this.updateDimensions.bind(this)

    this.state = {
      ...mapTimePropsToState(props),
      containerLeft: 0,
      containerWidth: 0,
      filterFromX: 0,
      filterToX: 0
    }
  }

  shouldComponentUpdate (nextProps: Props, nextState: State) {
    return !isEqual(this.props, nextProps) || !isEqual(this.state, nextState)
  }

  componentWillReceiveProps (nextProps: Props): void {
    const { containerWidth, from: currentFrom, to: currentTo } = this.state
    const { from: nextFrom, to: nextTo } = nextProps

    // unless 'from' or 'to' have changed, ignore updates
    if (currentFrom.valueOf() === moment(nextFrom).valueOf() &&
      currentTo.valueOf() === moment(nextTo).valueOf()) return

    this.setState({
      ...mapTimePropsToState(nextProps),
      filterFromX: 0,
      filterToX: containerWidth,
      fromDraggablePosition: { x: 0, y: 0 },
      toDraggablePosition: { x: 0, y: 0 }
    }, () => this.fetchEvents())
  }

  componentDidMount (): void {
    const { width, left } = this.container.getBoundingClientRect()

    this.setState({
      containerLeft: left,
      containerWidth: width,
      filterFromX: 0,
      filterToX: width,
      fromDraggablePosition: { x: 0, y: 0 },
      toDraggablePosition: { x: 0, y: 0 }
    })

    window.addEventListener('resize', this.updateDimensions)
  }

  componentWillUnmount (): void {
    window.removeEventListener('resize', this.updateDimensions)
  }

  render (): void {
    const { classes } = this.props
    const {
      filterFromX,
      filterToX,
      fromDraggablePosition,
      toDraggablePosition
    } = this.state

    console.log('hi')

    return (
      <div
        className={`timeline-filter ${classes.join(' ')}`}
        ref={ref => { this.container = ref }}>

        <Draggable
          axis='x'
          bounds={{ left: 0 }}
          initialPosition={{ x: filterFromX }}
          onDrag={this.handleFromDragEvent}
          position={fromDraggablePosition}>

          <div className='handle from' />
        </Draggable>

        <Draggable
          axis='x'
          bounds={{ right: 0 }}
          initialPosition={{ x: filterToX }}
          onDrag={this.handleToDragEvent}
          position={toDraggablePosition}>

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
      <Pinchable
        onTap={this.handleOverlayPinchEvent}
        onPinch={this.handleOverlayPinchEvent}
        preventDefault={true}>

        <div
          className='filter-range-overlay'
          style={styles}
        />
      </Pinchable>
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
          <span>{moment(t).format('ddd, MMM Do')}</span>
        </div>
        )
        : (
        <div key={i} className={classes} />
        )
    })
  }

  fetchEvents (): void {
    // get our action to fire once we calculate filtered timestamps
    const { onFilterDateRange } = this.props

    // get our state needed for calculations
    const {
      containerWidth,
      duration,
      filterFromX,
      filterToX,
      from,
      to
    } = this.state

    // get the percentages from the edges of the timeline slider
    const fromPercentageIncrease: number = filterFromX / containerWidth
    const toPercentageDecrease: number = (containerWidth - filterToX) / containerWidth

    // if we have moved the 'from' handle, calculate the percentage of time we have moved to
    const filteredFrom: Date = filterFromX > 0
      ? new Date(from.valueOf() + (duration * fromPercentageIncrease)).toISOString()
      : new Date(from.valueOf()).toISOString()

    // if we have moved the 'to' handle, calculate the percentage of time from 'to' we have moved to
    const filteredTo: Date = filterToX < containerWidth
      ? new Date(to.valueOf() - (duration * toPercentageDecrease)).toISOString()
      : new Date(to.valueOf()).toISOString()

    // call handler
    onFilterDateRange({ from: filteredFrom, to: filteredTo })
  }

  handleFromDragEvent (e, position): void|false {
    const { filterToX } = this.state
    const { x } = position
    const filterFromX = x

    // make sure we don't cross over the 'to' handle
    if (!(filterFromX < (filterToX - 5))) return false

    // once state is updated, fetch events
    this.setState({
      filterFromX,
      fromDraggablePosition: { x, y: 0 }
    }, () => this.fetchEvents())
  }

  handleOverlayPinchEvent (e): void|false {
    const { containerLeft } = this.state
    console.log({...arguments})
    console.log('hi')
    const { pageX: fromX } = e.touches[0]
    const { pageX: toX } = e.touches[1]
    const distance = e.distance

    // toDo: alphabetize

    // once state is updated, fetch events
    this.setState({
      filterFromX: fromX - containerLeft,
      fromDraggablePosition: { x: fromX, y: 0 },
      filterToX: toX - containerLeft,
      toDraggablePosition: { x: fromX + distance, y: 0 }
    }, () => this.fetchEvents())
  }

  handleToDragEvent (e, position): void|false {
    const { containerWidth, filterFromX } = this.state
    const x = Math.abs(position.x)

    // make sure we don't cross over the 'from' handle
    if (x > (containerWidth - filterFromX + 7)) return false

    // once state is updated, fetch events
    this.setState({
      filterToX: containerWidth - x,
      toDraggablePosition: { x: -x, y: 0 }
    }, () => this.fetchEvents())
  }

  updateDimensions (): void {
    const {
      containerWidth,
      filterFromX,
      filterToX,
      fromDraggablePosition,
      toDraggablePosition
    } = this.state

    const { width, left } = this.container.getBoundingClientRect()

    // update slider positions
    const widthPercentageDifference = width / containerWidth

    const newFilterFromX = Math.round(filterFromX * widthPercentageDifference)
    const newFilterToX = Math.round(filterToX * widthPercentageDifference)
    const newFromDraggableX = Math.round(fromDraggablePosition.x * widthPercentageDifference)
    const newToDraggableX = Math.round(toDraggablePosition.x * widthPercentageDifference)

    this.setState({
      containerWidth: width,
      containerLeft: left,
      filterFromX: newFilterFromX,
      filterToX: newFilterToX,
      fromDraggablePosition: { x: newFromDraggableX, y: 0 },
      toDraggablePosition: { x: newToDraggableX, y: 0 }
    })
  }
}

TimelineFilter.defaultProps = {
  classes: [],
  from: new Date(),
  to: new Date(Date.now() + (1000 * 60 * 60 * 24))
}
