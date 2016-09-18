import debug from 'debug'
import React, { Component } from 'react'
import registerEvents from 'serviceworker-webpack-plugin/lib/browser/registerEvents'
import runtime from 'serviceworker-webpack-plugin/lib/runtime'
import { browserHistory } from 'react-router'

import Router from './router'

type Logger = (s: string, ...a: any) => void

const logger: Logger = debug('client:app')

// shell for any bootstrapping
export default class App extends Component {
  componentDidMount ():void {
    // bootstrap service worker if supported
    if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost')) {
      const registration = runtime.register()

      registerEvents(registration, {
        onInstalled (): void {
          logger('[ServiceWorker] a new serviceworker was installed')
        },
        onUpdateReady (): void {
          logger('[ServiceWorker] a new serviceworker update is ready')
        },
        onUpdating (): void {
          logger('[ServiceWorker] a new serviceworker is updating')
        },
        onUpdateFailed (): void {
          logger('[ServiceWorker] a new serviceworker update failed')
        },
        onUpdated (): void {
          logger('[ServiceWorker] a new serviceworker was updated')
        }
      })
    }
  }

  render (): void {
    return <Router history={browserHistory} />
  }
}
