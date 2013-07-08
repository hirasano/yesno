exports.sockMngr = function(io){
    var _this = this;
    _this.run = function(){
        _this.ns = io.of('/ns').on('connection', function(socket){

            console.log('connected!');

            socket.emit('whichroom',null);

            socket.on('disconnect', function(){
                console.log('disconnected');
                var rooms = _this.ns.manager.roomClients[socket.id];
                console.log(rooms);
                for(var name in rooms){
                    if(name != "" && name != "/ns"){
                        name = name.substr(name.lastIndexOf('/')+1);
                        var room = _this.ns.in(name);
                        console.log("room owner? "+(room.owner==socket));
                        if(room.owner == socket){
                            console.log("close room");
                            room.owner = null;
                            room.emit('close',{reason:'noowner'});
                        } else if(room.viewer == socket){
                            console.log("viewer closed");
                            room.viewer = null;
                        }
                        socket.leave(name);
                    }
                }
            });

            socket.on('join', function(data){
                // 本当はここから入る部屋情報をもらう
                socket.join('yesno');
                console.log(data);
                var room = _this.ns.in('yesno');
                if(data.owner) {
                    if(room.owner == null){
                        room.owner = socket;
                        room.emit('open',{});
                    }
                } else if(data.viewer) {
                    if(room.viewer == null){
                        room.viewer = socket;
                        room.owner && room.owner.emit('request:answer',{});
                    }
                } else {
                    if(room.owner == null){
                        socket.emit('close',{reason:'noowner'});
                    }else{
                        socket.emit('open',{});
                    }
                }
            });

            socket.on('put:answer', function(data){
                var room = _this.ns.in('yesno');
                room.owner && room.owner.emit('pub:answer', data);
            });

            socket.on('put:question', function(data){
                console.log('=== question ===');
                console.log(data);
                if(data.sockid){
                    var all_clients = io.of('/ns').clients('yesno');
                    for(var i in all_clients){
                        var c = all_clients[i];
                        if(c.id == data.sockid){
                            c.emit('pub:question', data);
                            break;
                        }
                    }
                } else {
                    _this.ns.in('yesno').emit('pub:question', data); 
                }
            });

            socket.on('get:question', function(data){
                console.log('get:question');
                console.log(data);
                var room = _this.ns.in('yesno');
                console.log("<owner>");
                console.log(room.owner);
                if(room.owner != null){
                    console.log("emit request:question to owner");
                    room.owner.emit('request:question',{sockid:socket.id});
                }
            });

            // viewerに回答状況を転送
            socket.on('forward:answer',function(data){
                console.log('forward:answer');
                var room = _this.ns.in('yesno');
                if(room.viewer){
                    room.viewer.emit('pub:answer', data);
                }
            });

            socket.on('get:users', function(data){
                console.log(io.of('/ns').clients('yesno'));
            });
        });
    };
};
