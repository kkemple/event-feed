import debug from 'debug'
import React, { Component } from 'react'

import AdminHeader from '../components/admin/header'
import EventList from '../components/admin/event-list'
import SettingsToggle from '../components/admin/settings-toggle'
import SettingsSlideout from '../components/admin/settings-slideout'
import TimelineFilter from '../components/admin/timeline-filter'

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
    const {
      events,
      offline,
      onFilterDateRange,
      onPublish,
      onUnpublish,
      onRemove,
      onSettingsUpdate,
      settings
    } = this.props

    return (
      <div className='admin-view'>
        <AdminHeader
          classes={['admin']}
          offline={offline}
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

        <EventList
          classes={['admin']}
          items={events}
          offline={offline}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          onRemove={onRemove}
        />

        {
          offline
            ? null
            : <TimelineFilter
              from={settings.from}
              onFilterDateRange={onFilterDateRange}
              to={settings.to}
              />
        }
      </div>
    )
  }

  onSettingsToggle (active) {
    logger('[onSettingsToggle] settings slideout toggled to: %s', active)
    this.setState({ settingsActive: active })
  }
}
