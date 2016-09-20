import moment from 'moment'
import React, { Component } from 'react'

import LazyRender from '../lazy-render'

export default class Item extends Component {
  render () {
    const { event } = this.props

    return (
      <div className='event'>
        <div className='content'>
          {
            event.media
              ? <LazyRender><img src={event.media.url} /></LazyRender>
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
        </div>
      </div>
    )
  }
}
