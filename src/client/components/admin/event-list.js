import React, { Component } from 'react'

import LazyRender from '../lazy-render'
import EventActions from './event-actions'

const COLUMN_WIDTH = 400

export default class EventList extends Component {
  state: { containerWidth: number }

  constructor (): void {
    super(...arguments)

    this.state = { containerWidth: 0 }
    this.updateDimensions = this.updateDimensions.bind(this)
  }

  componentDidMount (): void {
    const { width: containerWidth } = this.container.getBoundingClientRect()
    this.setState({ containerWidth })
    window.addEventListener('resize', this.updateDimensions)
  }

  componentWillUnmount (): void {
    window.removeEventListener('resize', this.updateDimensions)
  }

  render (): void {
    const { classes } = this.props

    return (
      <div
        className={`event-list ${classes.join(' ')}`}
        ref={ref => { this.container = ref }}>
        {this.renderColumns()}
      </div>
    )
  }

  renderColumns (): Array<Component> {
    const { containerWidth } = this.state
    const { items, onPublish, onUnpublish, onRemove } = this.props
    const COLUMN_COUNT: number = containerWidth > 800
      ? Math.floor(containerWidth / COLUMN_WIDTH)
      : 1

    // get left over items so we can push onto columns later
    let remainder: number = items.length % COLUMN_COUNT

    // figure out how many items to drop into each column
    const numPerColumn: number = Math.floor(items.length / COLUMN_COUNT)

    // create copy of items so we can chunk them out into columns
    const itemsCopy = items.slice()

    // create a mappable range for iterating our columns
    const range: Array<number> = [...Array(COLUMN_COUNT).keys()]

    const columns: Array<Component> = range.map(i => {
      let numItemsToAdd = numPerColumn

      if (remainder > 0) {
        numItemsToAdd++
        remainder++
      }

      const columnItems = itemsCopy.splice(0, numItemsToAdd)

      return (
        <div key={i} className='event-list-column'>
          {columnItems.map(ci => (
            <div key={ci.id} className='event'>
              {
                ci.media
                  ? (
                  <LazyRender>
                    <img src={ci.media.url} />
                  </LazyRender>
                  )
                  : null
              }

              <blockquote>
                <p>{ci.content}</p>
                <cite>@{ci.username}</cite>
              </blockquote>

              <EventActions
                itemId={ci.id}
                onPublish={onPublish}
                onUnpublish={onUnpublish}
                onRemove={onRemove}
                published={ci.published}
                viewed={ci.viewed}
              />
            </div>
          ))}
        </div>
      )
    })

    return columns
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
