import isEqual from 'lodash.isequal'
import moment from 'moment'
import React, { Component } from 'react'

import EventActions from './event-actions'
import LazyRender from '../lazy-render'

export default class Event extends Component {
  shouldComponentUpdate (nextProps, nextState): boolean {
    return !isEqual(this.props, nextProps) || !isEqual(this.state, nextState)
  }

  render () {
    const { event, offline, onPublish, onUnpublish, onRemove } = this.props

    return (
      <div key={event.id} className='event'>
        <div className='content'>
          {
            event.media
              ? <LazyRender><img src={event.media.url.replace('http:', '')} /></LazyRender>
              : null
          }

          <blockquote>
            <span className='timestamp'>{moment(event.timestamp).calendar()}</span>
            <p>{event.content}</p>
            <cite>
              <a href={`https://twitter.com/${event.username}`}>
                @{event.username}
              </a>
            </cite>
          </blockquote>

          <EventActions
            itemId={event.id}
            offline={offline}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onRemove={onRemove}
            published={event.published}
            viewed={event.viewed}
          />
        </div>
      </div>
    )
  }
}
