import classnames from 'classnames'
import debug from 'debug'
import React, { Component } from 'react'

import settingsIcon from '../assets/settings-icon.svg'

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('components:settings-toggle')

export default class SettingsToggle extends Component {
  constructor (): void {
    super(...arguments)

    this.handleClickEvent = this.handleClickEvent.bind(this)
  }

  render (): void {
    const { active } = this.props

    const classes = classnames({
      active,
      'settings-toggle': true
    })

    return (
      <div
        className={classes}
        onClick={this.handleClickEvent}>

        <img src={settingsIcon} />
      </div>
    )
  }

  handleClickEvent (): void {
    const { active, onToggle } = this.props
    onToggle(!active)
  }
}

SettingsToggle.defaultProps = {
  onToggle (): void {
    logger('[onToggle] no onToggle method provided!', ...arguments)
  }
}
