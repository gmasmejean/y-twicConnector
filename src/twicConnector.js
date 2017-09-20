'use strict'

function extend (Y) {
    class twicConnector extends Y.AbstractConnector {
        constructor (y, options) {
            if (options === undefined) {
                throw new Error('Options must not be undefined!');
            }
            else if ( !options.room ) {
                throw new Error('You must define a room name!');
            }
            else if( !options.socket ){
                throw new Error('You have to set a websocket object');
            }

            options.role = 'slave';
            super(y, options);

            var socket = options.socket,
                self = this;

            self._messageid = 1;
            self._eventid = 1;

            self._socket = options.socket;
            self._room = options.room;

            self.timeout_ids = {};

            // DEFINE EVENTS HANDLERS
            // ON ROOM JOINED
            this._onJoin = function( data ){
                console.log('joinRoom', data, self._eventid++ );
                self.setUserId(data.peer_id);
                // SET ROOM PEERS
                data.peers.forEach(function(peer_id){
                    if( peer_id != data.peer_id ){
                        self.userJoined( peer_id, 'master');
                    }
                });
                // LISTEN TO ROOM MESSAGES
                socket.on('yjs_'+options.room+'_message', self._onMessage);
            };
            // ON MESSAGE
            this._onMessage = function( data ){
                if( data.type === 'yjs_confirm' ){
                    if( self.timeout_ids[data.payload] ){
                        clearTimeout( self.timeout_ids[data.payload] );
                        delete( self.timeout_ids[data.payload] );
                    }
                }else if( data.type === 'yjs_data' ){
                    self.receiveMessage( data.peer_id, data.payload );

                    if( data.need_confirm && data.id ){
                        socket.emit('yjs_message', {room: options.room, type:'yjs_confirm', payload: data.id, to: data.peer_id });
                    }
                }
            };
            // WHEN A PEER JOIN THE ROOM.
            this._onNewPeer = function( data ){
                console.log('newPeer', data.peer_id, self._eventid++ );
                self.userJoined( data.peer_id, 'master');
            };
            // WHEN A PEER LEAVE THE ROOM.
            this._onOldPeer = function( data ){
                console.log('oldPeer', data.peer_id, self._eventid++ );
                self.userLeft(data.peer_id);
            };

            // WHEN SOCKET RECONNECT & IS AUTHENTICATED
            this._onAuth = function(){
                self.reconnect();
            };
            // WHEN SOCKET IS DISCONNECTED -> DISCONNECT
            this._onDisconnect = function(){
                self.disconnect();
            };

            // BIND EVENTS
            socket.on('yjs_'+options.room+'_newpeer', this._onNewPeer);
            socket.on('yjs_'+options.room+'_oldpeer', this._onOldPeer);
            socket.on('yjs_'+options.room+'_joined', this._onJoin);
            socket.on('authenticated', this._onAuth);
            socket.on('disconnect', this._onDisconnect);

            // JOIN YJS ROOM
            socket.emit( 'yjs_joinroom', {room:options.room} );
        }
        destroy(){
            console.log('connector destroyed');
            // UNBIND EVENTS
            this._socket.off('yjs_'+this._room+'_newpeer', this._onNewPeer);
            this._socket.off('yjs_'+this._room+'_oldpeer', this._onOldPeer);
            this._socket.off('yjs_'+this._room+'_joined', this._onJoin);
            this._socket.off('authenticated', this._onAuth );
            this._socket.off('disconnect', this._onDisconnect );
            // THEN DISCONNECT
            this.disconnect();
        }
        disconnect () {
            console.log('disconnect', this._eventid++ );
            this._socket.off('yjs_'+this._room+'_message', this._onMessage);
            this._socket.emit('yjs_leaveroom',{room:this._room});
            super.disconnect()
        }
        reconnect () {
            console.log('reconnect', this._eventid++);
            this._socket.emit( 'yjs_joinroom', {room:this._room} );
            super.reconnect()
        }
        send (uid, message) {
            this._messageid++;

            var self= this,
                send = function(){
                    console.log('messageSentTo', uid, message, self._messageid, self._eventid++ );

                    self._socket.emit('yjs_message',{
                        room:self._room,
                        type:'yjs_data',
                        to: uid,
                        payload: message,
                        id: self._messageid,
                        need_confirm: true
                    });

                    self.timeout_ids[self._messageid] = setTimeout( send, 500);
                };

            send();
        }
        broadcast (message) {
            console.log('messageBroadcast', message, this._messageid++, this._eventid++ );

            this._socket.emit('yjs_message',{
                room:this._room,
                type:'yjs_data',
                payload: message,
                id: this._messageid
            });
        }
        isDisconnected () {
            return this._socket.disconnected;
        }
    }
    Y.extend('twic', twicConnector);
}

module.exports = extend;
if (typeof Y !== 'undefined') {
    extend(Y);
}
