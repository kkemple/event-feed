import throttle from 'lodash.throttle'
import React, { Component } from 'react'

type State = {
  visible: boolean
}

// only render children when the Component is within the viewport
class LazyRender extends Component {
  state: State

  constructor (): void {
    super(...arguments)

    this.handleScrollEvent = throttle(this.handleScrollEvent.bind(this), 250)
    this.state = { visible: false }
  }

  handleScrollEvent (): void {
    if (!this.container) return

    const cutoff = window.innerHeight
    const { top } = this.container.getBoundingClientRect()

    if (top <= cutoff) this.setState({ visible: true })
    else this.setState({ visible: false })
  }

  componentDidMount (): void {
    this.handleScrollEvent()
    window.addEventListener('scroll', this.handleScrollEvent)
  }

  componentWillUnmount (): void {
    window.removeEventListener('scroll', this.handleScrollEvent)
  }

  render (): Component {
    const { visible } = this.state
    const { children, classes } = this.props

    return (
      <div
        className={`lazy-load ${classes.join(' ')}`}
        ref={ref => { this.container = ref }}>

          {visible ? children : null}
      </div>
    )
  }
}

LazyRender.defaultProps = {
  classes: []
}

export default LazyRender
