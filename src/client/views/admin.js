import debug from 'debug'
import React, { Component } from 'react'

import AdminHeader from '../components/admin-header'
import SettingsToggle from '../components/settings-toggle'
import SettingsSlideout from '../components/settings-slideout'

type Logger = (s: string, ...a: any) => void

type State = {
  settingsActive: boolean
}

const logger: Logger = debug('views:admin')

export default class AdminView extends Component {
  state: State

  constructor (): void {
    super(...arguments)

    this.onSettingsToggle = this.onSettingsToggle.bind(this)

    this.state = { settingsActive: false }
  }

  render (): void {
    const { settingsActive } = this.state
    const { onSettingsUpdate, settings } = this.props

    return (
      <div className='admin-view'>
        <AdminHeader
          classes={['admin']}
          title='Event Feed'>

          <SettingsToggle
            active={settingsActive}
            onToggle={this.onSettingsToggle}
          />
        </AdminHeader>

        <SettingsSlideout
          active={settingsActive}
          autoPublishAll={settings.autoPublishAll}
          from={settings.from}
          hashtags={settings.hashtags}
          onSettingsUpdate={onSettingsUpdate}
          onToggle={this.onSettingsToggle}
          publishers={settings.publishers}
          to={settings.to}
        />
      </div>
    )
  }

  onSettingsToggle (active) {
    logger('[onSettingsToggle] settings slideout toggled to: %s', active)
    this.setState({ settingsActive: active })
  }
}
