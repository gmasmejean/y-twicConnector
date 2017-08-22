'use strict'

function extend (Y) {
    class twicConnector extends Y.AbstractConnector {
        constructor (y, options) {
            if (options === undefined) {
                throw new Error('Options must not be undefined!');
            }
            if (options.room == null) {
                throw new Error('You must define a room name!');
            }
            if( options.socket == null ){
                throw new Error('You have to set a websocket object');
            }
            if( options.user_id == null ){
                throw new Error('You have to define user id');
            }

            options.role = 'slave';
            super(y, options);

            console.log('yTwic - CONSTRUCTOR', y, options, this);

            var socket = options.socket,
                self = this;

            self._socket = options.socket;
            self._room = options.room;
            self._user_id = options.user_id;

            self.setUserId(options.user_id);

            socket.on('yjs_'+options.room+'_newpeer',function( data ){
                console.log('NEWPEER', data , self._user_id );
                if( data.user_id != self._user_id ){
                    socket.emit('yjs_roommember', {room:self._room, id:self._user_id, to: data.user_id } );
                    self.userJoined( data.user_id, 'master');
                }
            });

            socket.on('yjs_'+options.room+'_prevpeer', function(data){
                console.log('PREVPEER', data , self._user_id );
                self.userJoined( data.user_id, 'master');
            });

            socket.on('yjs_'+options.room+'_message', function( data ){
                console.log('YMESSAGE', data, self._user_id );
                if( data.user_id != self._user_id ){
                    self.receiveMessage( data.user_id, data.message );
                }
            });

            socket.on('yjs_'+options.room+'_oldpeer',function( data ){
                console.log('OLDPEER', data, self._user_id );
                self.userLeft(data.user_id);
            });

            socket.emit( 'yjs_joinroom', {room:options.room, id:options.user_id} );

            socket.on('authenticated', function(){
                self.reconnect();
            });

            socket.on('disconnect', function(){
                self.disconnect();
            });
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
            console.log('yTwic - SEND', uid, message, this );
            this._socket.emit('yjs_message',{room:this._room, to: uid, message: message, author:this._user_id});
        }
        broadcast (message) {
            console.log('yTwic - BROADCAST', message, this );
            this._socket.emit('yjs_message',{room:this._room, message: message, author:this._user_id});
        }
        isDisconnected () {
            return false;
        }
    }
    Y.extend('twic', twicConnector);
}

module.exports = extend;
if (typeof Y !== 'undefined') {
    extend(Y);
}
