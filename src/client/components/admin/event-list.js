import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import React, { Component } from 'react'

import Event from './event'

function mapPropsToState (
  props: Object = {
    items: []
  }
): Object {
  return {
    itemsToRender: props.items.slice(0, 50),
    pageNumber: 1,
    hasMoreItems: props.items.length > 50
  }
}

const COLUMN_WIDTH = 400

export default class EventList extends Component {
  state: {
    itemsToRender: Array<Object>,
    pageNumber: number
  }

  constructor (props): void {
    super(props)

    this.handleScrollEvent = debounce(this.handleScrollEvent.bind(this), 50)
    this.updateDimensions = this.updateDimensions.bind(this)

    this.state = {
      ...mapPropsToState(props),
      containerWidth: 0
    }
  }

  componentDidMount (): void {
    const { width: containerWidth } = this.container.getBoundingClientRect()
    this.setState({ containerWidth })
    window.addEventListener('scroll', this.handleScrollEvent)
    window.addEventListener('resize', this.updateDimensions)
  }

  componentWillUnmount (): void {
    window.removeEventListener('scroll', this.handleScrollEvent)
    window.removeEventListener('resize', this.updateDimensions)
  }

  componentWillReceiveProps (props: Object): void {
    this.setState(mapPropsToState(props))
  }

  shouldComponentUpdate (nextProps, nextState): boolean {
    return !isEqual(this.props, nextProps) || !isEqual(this.state, nextState)
  }

  render (): void {
    const { containerWidth, itemsToRender } = this.state
    const { classes, onPublish, onUnpublish, onRemove } = this.props

    const COLUMN_COUNT: number = containerWidth > 800
      ? Math.floor(containerWidth / COLUMN_WIDTH)
      : 1

    // create a mappable range for iterating our columns
    const range: Array<number> = [...Array(COLUMN_COUNT).keys()]

    // add items to columns
    const itemsByColumn = range.map(i => [])
    let columnIndex = 0

    itemsToRender.forEach(item => {
      itemsByColumn[columnIndex].push(item)

      if (columnIndex === COLUMN_COUNT - 1) columnIndex = 0
      else columnIndex++
    })

    return (
      <div
        className={`event-list ${classes.join(' ')}`}
        ref={ref => { this.container = ref }}>
        {
          range.map(i => {
            return (
              <div key={i} className='event-list-column'>
                {
                  itemsByColumn[i].map(e => (
                    <Event
                      key={e.id}
                      event={e}
                      onPublish={onPublish}
                      onUnpublish={onUnpublish}
                      onRemove={onRemove}
                    />
                  ))
                }
              </div>
            )
          })
        }
      </div>
    )
  }

  handleScrollEvent (): void {
    const { items } = this.props
    const { itemsToRender, pageNumber, hasMoreItems } = this.state

    if (!hasMoreItems) return

    const { bottom, height } = this.container.getBoundingClientRect()

    if (bottom <= height - 100) {
      this.setState({
        itemsToRender: itemsToRender.concat(items.slice(pageNumber * 50, pageNumber * 50 + 50)),
        hasMoreItems: items.length > pageNumber * 50 + 50,
        pageNumber: pageNumber + 1
      })
    }
  }

  updateDimensions (): void {
    const { width: containerWidth } = this.container.getBoundingClientRect()

    this.setState({ containerWidth })
  }
}

EventList.defaultProps = {
  classes: [],
  items: []
}
