import React, { Component } from 'react'

import offlineIcon from '../../assets/offline-icon.svg'
import onlineIcon from '../../assets/online-icon.svg'

export default class AppHeader extends Component {
  render (): void {
    const { classes, offline, title, children } = this.props

    return (
      <div className={`admin-header ${classes.join(' ')}`}>
        <h1>
          {title}
          <span className='connectionStatus'>
            <img src={offline ? offlineIcon : onlineIcon} />
          </span>
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
