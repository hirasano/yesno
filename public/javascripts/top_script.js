$(function(){

    var touchEventHandler = function(e) {
        if (e.type === 'touchstart') {
            $(this).addClass('tapped');
        } else {
            $(this).removeClass('tapped');
        }
    };
    $('.btn').on('touchstart touchend', touchEventHandler);
 
    var socket = io.connect('/ns');
    var sock = (function(s){
        var _this = this;
        _this.info = null;
        _this.run = function(){
            s.on('pub:question',function(data){
                _this.info.set('question', data.text); 
            });

            s.on('whichroom',function(data){
                s.emit('join',{owner:false});
            });

            s.on('close',function(data){
                // オーナー不在なのでロックする
                _this.info.set({
                    lock: true,
                    reason: data && data.reason || 'unknown'
                });
            });

            s.on('open',function(data){
                _this.info.set({
                    lock: false,
                    reason: null
                });
            });
        };

        // 回答する
        _this.answer = function(answer) {
            s.emit('put:answer',{type:answer});
        };

        _this.get_question = function() {
            s.emit('get:question', null);
        };

        return _this;
    }(socket));

    sock.run();


    var Member = function(sock){
        var question = $('#question'),
            yes = $('#yesno-yes'),
            no = $('#yesno-no'),
            reason = $('#reason'),
            info = new Backbone.Model(
                {
                    lock    : false,
                    reason  : '',
                    question: ''
                });

        function bind(){
            sock.info = info;
            info.on({
                'change:question':function(){
                    question.html(this.get('question'));
                },
                'change:lock':function(){
                    if(info.get('lock')){
                        yes.addClass('disabled');
                        no.addClass('disabled');
                    }else{
                        yes.removeClass('disabled');
                        no.removeClass('disabled');
                    }
                },
                'change:reason':function(){
                    reason.text(this.get('reason'));
                }
            });

            yes.on('click',function(){
                !info.get('lock') && sock.answer('yes');
            });
            no.on('click',function(){
                !info.get('lock') && sock.answer('no');
            });
        }

        bind();

        // 最新の質問を取得
        sock.get_question();
    };

    var member = new Member(sock);
});
