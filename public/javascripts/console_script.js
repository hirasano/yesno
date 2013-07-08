document.addEventListener("touchstart", function() {},false);
$(function(){
    var socket = io.connect('/ns');

    var sock = (function(s){
        var _this = this;
        _this.run = function(){
            // 回答を受け取った場合 
            s.on('pub:answer', function(data){
                var cnt = 0,
                    yesno_info = _this.model;
                switch(data.type){
                    case 'yes':
                        cnt = yesno_info.get('yes');
                        yesno_info.set('yes', cnt+1);
                        break;

                    case 'no':
                        cnt = yesno_info.get('no');
                        yesno_info.set('no', cnt+1);
                        break;
                }

                s.emit('forward:answer',{
                    yes: yesno_info.get('yes'),
                    no : yesno_info.get('no')
                });
            });

            // 新しい質問
            s.on('pub:question', function(data){
                // 新しい質問がきたのでアップデートする
                _this.model.set('question', data.text);
            });

            s.on('whichroom', function(data){
                console.log('owner: join in the room');
                s.emit('join',{owner:true});
            });

            s.on('request:question', function(data){
                console.log('owner: got request question');
                data.text = _this.model.get('question');
                s.emit('put:question',data);
            });

            s.on('request:answer', function(data){
                s.emit('forward:answer',{
                    yes: yesno_info.get('yes'),
                    no:  yesno_info.get('no')
                });
            });
        };
        // 質問を投げる
        _this.question = function(model){
            _this.model = model;
            _this.model.set({
                text: model.get('text')
            });
            s.emit('put:question', {text:model.get('text')});
        };

        _this.members = function(){
            s.emit('get:users');
        };

        return _this;
    }(socket));

    sock.run();

    var QuestionModel = Backbone.Model.extend({
        defaults: {
            text: '',
            yes : 0,
            no  : 0,
            view: null
        }
    });

    var QuestionView = Backbone.View.extend({
        tagName: 'tr',
        yescnt: null,
        nocnt: null,
        initialize: function(){
            this.listenTo(this.model, 'change', this.render);
            this.yescnt = this.$('.yescnt');
            this.nocnt  = this.$('.nocnt');
        },
        events: {
            'click a.remove':'clickRemoveLink',
            'click a.publish':'clickPublishLink',
            'click a.reset':'clickResetLink'
        },
        render: function(model) {
            var el = this.$el;
            if(model.get('published') == true) {
                el.addClass('published');
            } else {
                el.removeClass('published');
            }
            this.yescnt.text(this.model.get('yes'));
            this.nocnt.text(this.model.get('no'));

        },
        clickRemoveLink: function(e) {
            this.attributes.collection.remove(this.model);
        },
        clickPublishLink: function(e) {
            this.attributes.sock.question(this.model);
            this.attributes.questionsView.model.set('current', this.model);
        },
        clickResetLink: function(e) {
            this.model.set({
                'yes': 0,
                'no' : 0
            });
            this.attributes.sock.question(this.model);
        }
    });

    var QuestionsView = Backbone.View.extend({
        tagName: 'tbody',
        events: {
        },
        initialize: function(){
            this.listenTo(this.collection, 'add', this.addLine);
            this.listenTo(this.collection, 'remove', this.removeLine);
            this.listenTo(this.model, 'change:current', this.updateCurrent);
        },
        addLine: function(model) {
            var tr = $('<tr><td>'+model.cid+'</td><td>'+$(model.get('text')).text()+'</td><td>Yes:<span class="yescnt">0</span><br>No:<span class="nocnt">0</span></td><td><a class="remove">remove</a><br><a class="publish">publish</a><br><a class="reset">reset</a></td></tr>');

            var questionView = new QuestionView({
                el: tr,
                model: model,
                attributes: {
                    collection: this.collection,
                    sock: this.attributes.sock,
                    questionsView: this
                }
            });

            this.$el.append(questionView.el);
            model.set('view', questionView);
        },
        removeLine: function(model) {
            var child = model.get('view').el;
            child.remove();
        },
        updateCurrent: function(model) {
            var prev = model.previous('current');
            prev && prev.set('published', false);

            model.get('current').set('published', true);
        }
    });

    var questionsView = new QuestionsView({
        el: 'table.table',
        collection: new Backbone.Collection([]),
        model: new Backbone.Model({
           current:null
        }), 
        attributes:{
            sock: sock
        }
    });

    
    var ConsoleView = Backbone.View.extend({
        tagName: 'body',
        events: {
            'click #change_question': 'registQuestion'
        },
        initialize: function(){
            this.attributes.sock.model = this.model;
            this.listenTo(this.model, 'change:yes', this.renderYes);
            this.listenTo(this.model, 'change:no', this.renderNo);
            this.listenTo(this.model, 'change:text', this.renderQuestion);
        },
        renderYes: function(){
            this.$('#yesno-yes').text(this.model.get('yes'));
        },
        renderNo: function(){
            this.$('#yesno-no').text(this.model.get('no'));
        },
        renderQuestion: function(){
            this.$('#question_container').html(this.model.get('text'));
        },
        registQuestion: function(){
            var html = markdown.toHTML(this.$('#question_input').val());
            this.attributes.questionsView.collection.add(new QuestionModel({
                'text': html
            }));
        }
    });

    new ConsoleView({
        el: 'body',
        model: new QuestionModel(),
        attributes:{
            sock: sock,
            questionsView: questionsView
        }
    });

   /*
    var Console = function(sock){
        var questionUpdateBtn = $('#change_question'),
            yesCounter = $('#yesno-yes'),
            noCounter = $('#yesno-no'),
            question = $('#question'),
            question_input = $('#question_input'),
            yesno_info = new Backbone.Model(
                {
                    'yes':0,
                    'no':0,
                    'question':'これは事故？'
                });

        function bind(){
            sock.yesno_info = yesno_info;
            questionUpdateBtn.on('click', function(){
                var html = markdown.toHTML(question_input.val());
                sock.question(html);
            });
            $('#chk').on('click',function(){
                sock.members();
            });

            yesno_info.on({
                'change:yes':function(){
                    yesCounter.text(this.get('yes'));
                },
                'change:no':function(){
                    noCounter.text(this.get('no'));
                },
                'change:question':function(){
                    question.html(this.get('question'));
                }
            });

            sock.question(yesno_info.get('question'));
        }

        bind();
    };

    new Console(sock);
   */
});
