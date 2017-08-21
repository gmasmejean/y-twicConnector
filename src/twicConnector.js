/* global Y */
'use strict'

function extend (Y) {
  class twicConnector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.room == null) {
        throw new Error('You must define a room name!')
      }
      if( options.socket == null ){
          throw new Error('You have to set a websocket object')
      }
      if( options.user_id == null ){
          throw new Error('You have to define user id')
      }

      options.role = 'slave'
      super(y, options)

      var socket = this._twicSocket;
      var self = this

      self.setUserId(options.user_id);

      socket.emit( 'yjs_joinroom', {room:options.room, id:options.user_id} );

      socket.on('yjs_'+options.room+'_newpeer',function( data ){
          if( data.user_id != self.options.user_id ){
              self.userJoined( data.user_id, 'master')
          }
      });

      socket.on('yjs_'+options.room+'_message', function( data ){
          if( data.user_id != self.options.user_id ){
              self.receiveMessage( data.user_id, data.message );
          }
      });

      socket.on('yjs_'+options.room+'_oldpeer',function( data ){
          self.userLeft(data.user_id)
      });


      /*swr.once('connectionReady', function (userId) {
        // SimpleWebRTC (swr) is initialized
        swr.joinRoom(self.webrtcOptions.room)

        swr.once('joinedRoom', function () {
          self.setUserId(userId)

          swr.on('channelMessage', function (peer, room_, message) {
            // The client received a message
            // Check if the connector is already initialized,
            // only then forward the message to the connector class
            if (message.type != null) {
              self.receiveMessage(peer.id, message.payload)
            }
          })
        })

        swr.on('createdPeer', function (peer) {
          // a new peer/client joined the session.
          // Notify the connector class, if the connector
          // is already initialized
          self.userJoined(peer.id, 'master')
        })

        swr.on('peerStreamRemoved', function (peer) {
          // a client left the session.
          // Notify the connector class, if the connector
          // is already initialized
          self.userLeft(peer.id)
        })
    })*/
    }
    disconnect () {
      //this.swr.leaveRoom()
      this.options.socket.emit('yjs_leaveroom',{room:this.options.room, id:this.options.user_id});
      super.disconnect()
    }
    reconnect () {
      //this.swr.joinRoom(this.webrtcOptions.room)
      this.options.socket.emit( 'yjs_joinroom', {room:this.options.room, id:this.options.user_id} );
      super.reconnect()
    }
    send (uid, message) {
      this.options.socket.emit('yjs_message',{room:this.options.room, to: uid, message: message, author:this.options.user_id});
      /*
      // we have to make sure that the message is sent under all circumstances
      var send = function () {
        // check if the clients still exists
        var peer = self.swr.webrtc.getPeers(uid)[0]
        var success
        if (peer) {
          // success is true, if the message is successfully sent
          success = peer.sendDirectly('simplewebrtc', 'yjs', message)
        }
        if (!success) {
          // resend the message if it didn't work
          setTimeout(send, 500)
        }
      }
      // try to send the message
      send()*/
    }
    broadcast (message) {
        this.options.socket.emit('yjs_message',{room:this.options.room, message: message, author:this.options.user_id});
      //this.swr.sendDirectlyToAll('simplewebrtc', 'yjs', message)
    }
    isDisconnected () {
      return false
    }
  }
  Y.extend('twic', twicConnector)
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}
