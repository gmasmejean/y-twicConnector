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
            else if( !options.user_id ){
                throw new Error('You have to define user id');
            }

            options.role = 'slave';
            super(y, options);

            console.log('yTwic - CONSTRUCTOR', y, options, this);

            var socket = options.socket,
                self = this;

            self._messageid = 1;
            self._eventid = 1;

            self._socket = options.socket;
            self._room = options.room;
            self._user_id = options.user_id;

            self.setUserId(options.user_id);

            // DEFINE EVENTS HANDLERS
            // WHEN A PEER JOIN THE ROOM.
            this._onNewPeer = function( data ){
                if( data.user_id != self._user_id ){
                    console.log('newPeer', data , self._user_id, self._eventid++ );
                    socket.emit('yjs_roommember', {room:self._room, id:self._user_id, to: data.user_id } );
                    self.userJoined( data.user_id, 'master');
                }
            };
            // WHEN A PEER LEAVE THE ROOM.
            this._onOldPeer = function( data ){
                console.log('oldPeer', data, self._user_id, self._eventid++ );
                self.userLeft(data.user_id);
            };
            // AFTER WE JOINED THE ROOM, EACH PEER TELL US THEY'RE IN...
            this._onPrevPeer = function(data){
                console.log('newPeer', data , self._user_id, self._eventid++ );
                self.userJoined( data.user_id, 'master');
            };
            // ON MESSAGE
            this._onMessage = function( data ){
                if( data.user_id != self._user_id ){
                    console.log('receive', data.count, data.message.type, data, self._eventid++ );
                    self.receiveMessage( data.user_id, data.message );
                }
            };
            // WHEN SOCKET RECONNECT & IS AUTHENTICATED
            this._onAuth = function(){
                self.reconnect();
            };

            // BIND EVENTS
            socket.on('yjs_'+options.room+'_newpeer', this._onNewPeer);
            socket.on('yjs_'+options.room+'_oldpeer', this._onOldPeer);
            socket.on('yjs_'+options.room+'_prevpeer', this._onPrevPeer);
            socket.on('yjs_'+options.room+'_message', this._onMessage);
            socket.on('authenticated', this._onAuth);

            // JOIN YJS ROOM
            socket.emit( 'yjs_joinroom', {room:options.room, id:options.user_id} );

            // WHEN SOCKET IS DISCONNECTED -> DISCONNECT
            socket.on('disconnect', function(){
                self.disconnect();
            });
        }
        destroy(){
            // UNBIND EVENTS
            this._socket.off('yjs_'+this._room+'_newpeer', this._onNewPeer);
            this._socket.off('yjs_'+this._room+'_oldpeer', this._onOldPeer);
            this._socket.off('yjs_'+this._room+'_prevpeer', this._onPrevPeer);
            this._socket.off('yjs_'+this._room+'_message', this._onMessage);
            this._socket.off('authenticated', this._onAuth );

            this.disconnect();
            super.destroy();
        }
        disconnect () {
            console.log('yTwic - DISCONNECT', arguments, this );
            this._socket.emit('yjs_leaveroom',{room:this._room, id:this._user_id});
            super.disconnect()
        }
        reconnect () {
            console.log( 'yTwic - RECONNECT', arguments, this);
            this._socket.emit( 'yjs_joinroom', {room:this._room, id:this._user_id} );
            super.reconnect()
        }
        send (uid, message) {
            this._messageid++;
            console.log('yTwic - SEND', uid, message );
            this._socket.emit('yjs_message',{room:this._room, to: uid, message: message, author:this._user_id, count: this._messageid });
        }
        broadcast (message) {
            this._messageid++;
            console.log('yTwic - BROADCAST', message );
            this._socket.emit('yjs_message',{room:this._room, message: message, author:this._user_id, count: this._messageid });
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
