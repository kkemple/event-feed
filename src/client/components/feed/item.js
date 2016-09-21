import moment from 'moment'
import React, { Component } from 'react'

export default class Item extends Component {
  // state: { imageStyles: Object }
  //
  // constructor (): void {
  //   super(...arguments)
  //
  //   this.state = {
  //     imageStyles: {}
  //   }
  // }

  componentDidMount (): void {
    // if (this.image) {
    //   this.image.onload = () => {
    //     const { height, width } = this.image.getBoundingClientRect()
    //
    //     if (height > width) {
    //       this.setState({
    //         imageStyles: {
    //           clipPath: `url(#svgPath)`,
    //           WebkitClipPath: `url(#svgPath)`,
    //           MSClipPath: `url(#svgPath)`
    //         }
    //       })
    //     } else {
    //       this.setState({
    //         imageStyles: {
    //           clipPath: `url(#svgPath)`,
    //           WebkitClipPath: `url(#svgPath)`,
    //           MSClipPath: `url(#svgPath)`
    //         }
    //       })
    //     }
    //   }
    // }
  }

  componentDidUpdate (): void {
    // if (this.image) {
    //   this.image.onload = () => {
    //     const { height, width } = this.image.getBoundingClientRect()
    //
    //     if (height > width) {
    //       const radius = Math.floor(width / 2)
    //       this.setState({
    //         imageStyles: {
    //           clipPath: `url(#svgPath)`,
    //           WebkitClipPath: `url(#svgPath)`,
    //           MSClipPath: `url(#svgPath)`
    //         }
    //       })
    //     } else {
    //       const radius = Math.floor(height / 2)
    //       this.setState({
    //         imageStyles: {
    //           clipPath: `url(#svgPath)`,
    //           WebkitClipPath: `url(#svgPath)`,
    //           MSClipPath: `url(#svgPath)`
    //         }
    //       })
    //     }
    //   }
    // }
  }

  render () {
    const imageStyles = {
      clipPath: `url(#svgPath)`,
      WebkitClipPath: `url(#svgPath)`,
      MSClipPath: `url(#svgPath)`
    }

    const { event } = this.props

    return (
      <div className='event'>
        <div className='content'>
          {
            event.media
              ? (
                <img
                  ref={ref => { this.image = ref }}
                  src={event.media.url}
                  style={imageStyles}
                />
              )
              : null
          }

          <blockquote>
            <span className='timestamp'>{moment(event.timestamp).fromNow()}</span>
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
