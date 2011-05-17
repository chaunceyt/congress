
/**
 * Module dependencies.
 */

var express = require('express');
var Client = require('mysql').Client;
var faye = require('faye');
var http = require('http');
var gently = new (require('gently'));
var app = module.exports = express.createServer();
//var Reston = require('Reston');
//
var broadcast = new faye.NodeAdapter({
    mount:    '/faye',
    timeout:  45
});



client = new Client();
client.user = 'root';
client.password = 'vibespin';

//_apikey_ = '5abe0558b3e3735144dc4d2e1b6640d7';
//APIURL = 'http://www.opensecrets.org/api/?method=';

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use(express.favicon());
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  //app.use(express.session({ secret: 'the debator' }));
  app.use(express.static(__dirname + '/public'));
  app.use(express.logger());        
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res) {
        res.render('index', {message: "Lawmakers"});

});

app.get('/lawmaker/:param1', function(req, res) {
        var param1 = req.params.param1;
        client.connect();
        client.query('USE lawmakers');

        var sql = 'SELECT * FROM lawmakers WHERE bioguide_id = \''+ param1+'\'';

        //console.log(sql);

        client.query(sql, gently.expect(function selectCb(err, results, fields) {
            if(err) {
                res.send(500, {'Content-Type': 'application/json'}, { error: err.error });
            }
            
            //set up template locals
            var site_locals = {
                    items: results,
                    message: results[0].firstname + ' ' + results[0].middlename + ' '  + results[0].lastname,
            };

            //render content
            res.render('lawmaker', {
                    locals: { site: site_locals }
                    });

            })
        );
        client.end();
});

app.get('/congress/:controller/:param1?/:param2?', function(req, res) {

    var controller = req.params.controller;
    var param1 = req.params.param1;
    var param2 = req.params.param2;

    client.connect();
    client.query('USE lawmakers;');
    
    var lawmaker_title;
    var where;

    if(controller == 'representatives') {
    
        lawmaker_title = 'Rep';
        where = ' WHERE title = \''+ lawmaker_title + '\'';

        var sql = 'SELECT * FROM lawmakers ' + where; 

        if(param1) {
            sql += ' AND state = \'' + param1 + '\'';
        }
        if(param2) {
            sql += ' AND district = \''+ param2 + '\'';
        }
        sql += ' AND in_office = \'1\'';
    }

    else if(controller == 'senators') {
        lawmaker_title = 'Sen';
        where = ' WHERE title = \''+ lawmaker_title + '\'';

        var sql = 'SELECT * FROM lawmakers ' + where; 

        if(param1) {
            sql += ' AND state = \'' + param1 + '\'';
        }
        if(param2) {
            sql += ' AND district = \''+ param2 + '\'';
        }

        sql += ' AND in_office = \'1\'';
    }

    else if(controller == 'district') {
        if(param1) {
            var state = param1;
        }
        var sql = 'SELECT * FROM lawmakers WHERE title = \'Rep\'';
        sql += ' AND state = \'' + state + '\'';
        sql += ' AND in_office = \'1\'';
        if(param2) {
            sql += ' AND district = \''+ param2 + '\'';
        }
        sql += ' OR title = \'Sen\'';
        sql += ' AND state = \'' + state + '\'';
        sql += ' AND in_office = \'1\'';
        
        sql += ' ORDER BY lastname ASC';

    }
    //console.log(sql);

    client.query(sql, gently.expect(function selectCb(err, results, fields) {

                //catch error
                if(err) {
                    res.send(500, {'Content-Type': 'application/json'}, { error: err.error });
                }
            
                //set up template locals
                var site_locals = {
                    items: results,
                    message: '',
                };

                //render content
                res.render('congress', {
                    locals: { site: site_locals }
                });

            })
        );
    client.end();

});

app.post('/post', function(req, res) {
    var _username = {username: req.body.username}
    var _title = {title: req.body.title} 
    var _content = {content: req.body.content} 

    broadcast.getClient().publish('/debate', {text0: _username, text1: _title, text2: _content});
    res.redirect('/');
});

app.get('/debate', function(req, res) {
        res.render('debate');
});

if (!module.parent) {
  broadcast.attach(app);    
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
