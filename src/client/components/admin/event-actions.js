import debug from 'debug'
import React, { Component } from 'react'

import publishIcon from '../../assets/publish-icon.svg'
import publishedIcon from '../../assets/published-icon.svg'
import removeIcon from '../../assets/clear-icon.svg'
import notViewedIcon from '../../assets/not-viewed-icon.svg'
import viewedIcon from '../../assets/viewed-icon.svg'

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('components:admin:event-actions')

export default class EventActions extends Component {
  constructor (): void {
    super(...arguments)

    this.handlePublishEvent = this.handlePublishEvent.bind(this)
    this.handleUnpublishEvent = this.handleUnpublishEvent.bind(this)
    this.handleRemoveEvent = this.handleRemoveEvent.bind(this)
  }

  render (): void {
    const { published, viewed } = this.props

    return (
      <div className='actions'>
        {
          viewed
            ? (
            <span className='viewed'>
              <img src={viewedIcon} />
            </span>
            )
            : (
            <span className='not-viewed'>
              <img src={notViewedIcon} />
            </span>
            )
        }

        {
          published
            ? (
            <span className='published' onClick={this.handleUnpublishEvent}>
              <img src={publishedIcon} />
            </span>
            )
            : (
            <span className='publish' onClick={this.handlePublishEvent}>
              <img src={publishIcon} />
            </span>
            )
        }
        <span className='remove' onClick={this.handleRemoveEvent}>
          <img src={removeIcon} />
        </span>
      </div>
    )
  }

  handlePublishEvent (): void {
    const { itemId, onPublish } = this.props
    onPublish(itemId)
  }

  handleUnpublishEvent (): void {
    const { itemId, onUnpublish } = this.props
    onUnpublish(itemId)
  }

  handleRemoveEvent (): void {
    const { itemId, onRemove } = this.props
    onRemove(itemId)
  }
}

EventActions.defaultProps = {
  onPublish (): void {
    logger('[onPublish] no method provided to component!')
  },

  onUnpublish (): void {
    logger('[onUnpublish] no method provided to component!')
  },

  onRemove (): void {
    logger('[onRemove] no method provided to component!')
  }
}
