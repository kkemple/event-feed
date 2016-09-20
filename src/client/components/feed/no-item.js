import React, { Component } from 'react'

export default class NoItem extends Component {
  render () {
    return (
      <div className='event'>
        <div className='content'>
          <p>No events yet.</p>
        </div>
      </div>
    )
  }
}
