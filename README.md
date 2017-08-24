# TWIC Connector for [Yjs](https://github.com/y-js/yjs)

TWIC platform connector used for QuillJS collaborative editor.
Uses TWIC Socket.io server to help users collaborate in a SyncAll way.

### Example

```
CLIENT SIDE =>
Y({
    db: {
        name: 'memory'
    },
    connector: {
        name: 'twic',//'twic',
        room: scope.shared.room,
        user_id: scope.shared.user_id,
        socket: socket
    },
    share: {
        richtext: 'Richtext'
    }
}).then(function( y ){
    var options = {
        modules: {
            toolbar: {
                container : ['bold', 'italic', 'underline', 'link', { 'list': 'bullet' }]
            }
        },
        theme: 'snow'
    };
    var editor = new Quill(document.querySelector("#text-editor"), options);

    y.share.richtext.bindQuill( editor );
});

SERVER SIDE =>
server.on('connection',function(socket){

    // LISTEN TO USER JOINING ROOM -> Join the room / Tell everybody you're there / Set disconnect leave handler.
    socket.on('yjs_joinroom', function(data){ // data:{room:ROOM, id:USERID}
        socket.join( data.room );
        socket.join( data.room+'#'+data.id );
        server.to( data.room ).emit('yjs_'+data.room+'_newpeer', {user_id:data.id} );

        if( !socket.rooms ){
            socket.rooms = {};
        }

        socket.rooms[data.room+'#'+data.id] = function(){
            socket.leave( data.room );
            socket.leave( data.room+'#'+data.id );
            server.to( data.room ).emit('yjs_'+data.room+'_oldpeer', {user_id:data.id} );
        }

        socket.on('disconnect',socket.rooms[data.room+'#'+data.id]);
    });

    // LISTEN TO PEER ANSWERING TO 'JOIN ROOM EVENT' SO NEWCOMERS ARE NOTIFIED OF ROOM MEMBERS.
    socket.on('yjs_roommember',function(data){ // data:{room:ROOM, id:USERID, to:USERID }
        server.to( data.room+'#'+data.to ).emit('yjs_'+data.room+'_prevpeer', {user_id:data.id} );
    });

    // LISTEN TO USER LEAVING ROOM
    socket.on('yjs_leaveroom', function(data){ // data:{room:ROOM, id:USERID}
        socket.leave( data.room );
        socket.leave( data.room+'#'+data.id );
        server.to( data.room ).emit('yjs_'+data.room+'_oldpeer', {user_id:data.id} );

        if( socket.rooms && socket.rooms[data.room+'#'+data.id] ){
            socket.removeListener('disconnect', socket.rooms[data.room+'#'+data.id] );
            delete( socket.rooms[data.room+'#'+data.id] );
        }
    });

    // LISTEN TO MESSAGE.
    socket.on('yjs_message', function(data){ // data:{room:ROOM, to:USERID , message:MESSAGE, author:USERID}
        if( data.to ){
            socket.to( data.room+'#'+data.to ).emit('yjs_'+data.room+'_message',{message:data.message,user_id:data.author});
        }else{
            socket.to( data.room ).emit('yjs_'+data.room+'_message',{message:data.message,user_id:data.author});
        }
    });
```

## License
Yjs is licensed under the [MIT License](./LICENSE).
