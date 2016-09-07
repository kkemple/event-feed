import React, { Component } from 'react'

import LazyRender from '../lazy-render'
import EventActions from './event-actions'

export default class EventList extends Component {
  render (): void {
    const { classes } = this.props

    return (
      <ul className={`event-list ${classes.join(' ')}`}>
        {this.renderColumns()}
      </ul>
    )
  }

  renderColumns (): Array<Component> {
    const { items, onPublish, onUnpublish, onRemove } = this.props

    const COLUMN_COUNT = 4
    let remainder = items.length % COLUMN_COUNT
    const numPerColumn = Math.floor(items.length / COLUMN_COUNT)
    let i = 0

    const itemsCopy = items.slice()

    const columns = []

    for (; i < COLUMN_COUNT; i++) {
      let numItemsToAdd = numPerColumn

      if (remainder > 0) {
        numItemsToAdd++
        remainder++
      }

      const columnItems = itemsCopy.splice(0, numItemsToAdd)

      columns.push((
        <div key={i} className='event-list-column'>
          {columnItems.map(ci => (
            <li key={ci.id} className='event'>
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
            </li>
          ))}
        </div>
      ))
    }

    return columns
  }
}

EventList.defaultProps = {
  classes: [],
  items: []
}
