import React, { Component } from 'react'

export default class AppHeader extends Component {
  render (): void {
    const { classes, offline, title, children } = this.props
    const connectionState = offline ? 'offline' : 'online'

    return (
      <div className={`admin-header ${classes.join(' ')}`}>
        <h1>
          {title} <span className={connectionState} title={connectionState} />
        </h1>
        {children}
      </div>
    )
  }
}

AppHeader.defaultProps = {
  classes: []
}

AppHeader.propTypes = {
  classes: React.PropTypes.array,
  title: React.PropTypes.string.isRequired
}
