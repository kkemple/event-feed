import React, { Component } from 'react'

export default class AppHeader extends Component {
  render (): void {
    const { classes, title, children } = this.props
    return (
      <div className={`app-header ${classes.join(' ')}`}>
        <h1>{title}</h1>
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
