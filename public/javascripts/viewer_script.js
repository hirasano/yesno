$(function(){


    var socket = io.connect('/ns');

    var sock = (function(s){
        var _this = this;
        _this.run = function(){
            // 回答を受け取った場合 
            s.on('pub:answer', function(data){
                _this.yesno_info.set({
                    question: data.text || _this.yesno_info.get('question'),
                    series: [data.yes, data.no]
                });
            });


            // 新しい質問
            s.on('pub:question', function(data){
                // 新しい質問がきたのでアップデートする
                _this.yesno_info.set({
                    question: data.text,
                    series: [0, 0]
                });
                
            });

            s.on('whichroom', function(data){
                console.log('viewer: join in the room');
                s.emit('join',{viewer:true});
            });

            s.on('close', function(data){
            });
            s.on('open', function(data){
                s.emit('request:answer',{});
            });

            s.emit('request:question',{});
        };

        _this.yesno_info = null;

        return _this;
    }(socket));

    sock.run();


    var chart = new Highcharts.Chart({
            chart: {
                renderTo: 'graph',
                type: 'bar'
            },
            title: {
                text: ''
            },
            subtitle: {
                text: ''
            },
            xAxis: {
                categories: ['YES', 'NO'],
                title: {
                    text: null
                }
            },
            yAxis: {
                min: 0,
                max: 50,
                title: {
                    text: '結果(人)',
                    align: 'high'
                },
                labels: {
                    overflow: 'justify'
                }
            },
            tooltip: {
                valueSuffix: ' 人'
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            /*
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                x: -100,
                y: 100,
                floating: true,
                borderWidth: 1,
                backgroundColor: '#FFFFFF',
                shadow: true
            },
           */
            credits: {
                enabled: false
            },
            series: [{
                name: '回答',
                data: [0, 0]
            }]
        });
    

    var Viewer = function(sock){
        var questionUpdateBtn = $('#change_question'),
            yesCounter = $('#yes-count'),
            noCounter = $('#no-count'),
            question = $('#question'),
            yesno_info = new Backbone.Model(
                {
                    'series':[],
                    'question':''
                });

        function bind(){
            sock.yesno_info = yesno_info;

            yesno_info.on({
                'change:series':function(){
                    console.log(chart.series);
                    chart.series[0].setData(this.get('series'));
                },
                'change:question':function(){
                    question.html(this.get('question'));
                }
            });
        }

        bind();
    };

    new Viewer(sock);
});
