//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var querystring = require('querystring');
var https = require('https');
var http = require('http');
var path = require('path');
var _ = require('underscore');
var twitter = require('ntwitter');

var redis = require('redis');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');


var client = redis.createClient(16379, process.env.IP);

client.on("error", function (err) {
        console.log("Error " + err);
    });


//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

router.get('/blink/:id', function(req, res){
   var blinkName = req.params.id;
   
   client.get(blinkName, function(err, resp){
      res.send(JSON.parse(resp)); 
   });
});

router.delete('/blink/:id', function(req, res){
    var blinkName = req.params.id;
    
    client.del(blinkName, function(err){
        if (err) return console.log(err);
        
        res.send('');
    })
})

var messages = [];
var sockets = [];

io.on('connection', function(socket) {
    messages.forEach(function(data) {
        socket.emit('message', data);
    });

    client.keys('*', function (err, keys) {
      if (err) return console.log(err);
    
        socket.emit('blinkNames', keys);
    });
    
    sockets.push(socket);

    socket.on('disconnect', function() {
        sockets.splice(sockets.indexOf(socket), 1);
        updateRoster();
    });

    socket.on('message', function(msg) {
        var text = String(msg || '');

        if (!text) return;

        socket.get('name', function(err, name) {
            var data = {
                name: name,
                text: text
            };

            broadcast('message', data);
            messages.push(data);
        });
    });

    socket.on('identify', function(name) {
        socket.set('name', String(name || 'Anonymous'), function(err) {
            updateRoster();
        });
    });

    socket.on('saveFrames', function(blink) {
        client.set(blink.name, JSON.stringify(blink.frames));
    });

    socket.on('sendFrames', function(frames) {
        sendFrames(frames);
    });

});

function sendFrames(frames) {
    console.log("received frames: " + frames.length);

    _.each(frames, function(item){item.time = item.time * 0.1;});
    
    var post_data = JSON.stringify({
        buffer: frames
    });
    console.log(post_data);

    // An object of options to indicate where to post to
    var post_options = {
        host: 'agent.electricimp.com',
        port: '443',
        path: '/W2IM5eP3Ct7l',
        method: 'POST',
        headers: {
            'Content-Length': post_data.length
        }
    };

    console.log("Post options set");

    // Set up the request
    var post_req = https.request(post_options);

    console.log("Request Created");
    // post the data
    post_req.write(post_data);
    console.log("Request Writtern");
    post_req.end();
    console.log("Rqeuest Ended");

}

function updateRoster() {
    async.map(
    sockets,

    function(socket, callback) {
        socket.get('name', callback);
    },

    function(err, names) {
        broadcast('roster', names);
    });
}

function broadcast(event, data) {
    sockets.forEach(function(socket) {
        socket.emit(event, data);
    });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
    var addr = server.address();
    console.log("Chat server listening at", addr.address + ":" + addr.port);
});

function startTwitterStream() {
    // Twitter symbols array
    var watchSymbols = ['android'];

    //This structure will keep the total number of tweets received and a map of all the symbols and how many tweets received of that symbol
    var watchList = {
        total: 0,
        symbols: {}
    };

    //Set the watch symbols to zero.
    _.each(watchSymbols, function(v) {
        watchList.symbols[v] = 0;
    });

    //Instantiate the twitter component
    //You will need to get your own key. Don't worry, it's free. But I cannot provide you one
    //since it will instantiate a connection on my behalf and will drop all other streaming connections.
    //Check out: https://dev.twitter.com/
    var t = new twitter({
        consumer_key: 'w7SoGcpmbtV1h51MocTWDQ', // <--- FILL ME IN
        consumer_secret: 'Dd4AKiNmg3X4PmcgiUswPb0ey0Zm076I5FBx2qPRo', // <--- FILL ME IN
        access_token_key: '15485073-M1Z9b31zVf6wbjvOGLmwKLyMjPZS1Q4lmuKPItW3I', // <--- FILL ME IN
        access_token_secret: 'HIleJoa9rSbHCwLW1A6Q2pCWBMNENk0p8ysWj4rDldcij' // <--- FILL ME IN
    });
    console.log("Twitter client created");

    //Tell the twitter API to filter on the watchSymbols 
    t.stream('statuses/filter', {
        track: watchSymbols
    }, function(stream) {

        console.log("Setting up data receive handler");
        

        //We have a connection. Now watch the 'data' event for incomming tweets.
        stream.on('data', function(tweet) {

            //This variable is used to indicate whether a symbol was actually mentioned.
            //Since twitter doesnt why the tweet was forwarded we have to search through the text
            //and determine which symbol it was ment for.Sometimes we can 't tell, in which case we don't
            //want to increment the total counter...
            var claimed = false;

            //Make sure it was a valid tweet
            if (tweet.text !== undefined) {

                //We're gunna do some indexOf comparisons and we want it to be case agnostic.
                var text = tweet.text.toLowerCase();

                //Go through every symbol and see if it was mentioned. If so, increment its counter and
                //set the 'claimed' variable to true to indicate something was mentioned so we can increment
                //the 'total' counter!
                _.each(watchSymbols, function(v) {
                    if (text.indexOf(v.toLowerCase()) !== -1) {
                        watchList.symbols[v]++;
                        claimed = true;
                    }
                });

                //If something was mentioned, increment the total counter and send the update to all the clients
                if (claimed) {
                    //Increment total
                    watchList.total++;
                    
                    if (watchList.total % 100 === 0)
                        console.log(watchList.total + " hashtags received");

                    //Send to all the clients
                    //sockets.sockets.emit('data', watchList);
                    if (watchList.total % 100 === 0) {
                        var frames = [{
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "on",
                            "red": "on",
                            "blue": "on",
                            "time": 0.1
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "on",
                            "red": "on",
                            "blue": "off",
                            "time": 0.2
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "on",
                            "red": "off",
                            "blue": "off",
                            "time": 0.3
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "off",
                            "red": "off",
                            "blue": "off",
                            "time": 0.4
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "off",
                            "yellow": "off",
                            "red": "off",
                            "blue": "off",
                            "time": 0.5
                        }, {
                            "purple": "on",
                            "pink": "off",
                            "white": "off",
                            "yellow": "off",
                            "red": "off",
                            "blue": "off",
                            "time": 0.6
                        }, {
                            "purple": "off",
                            "pink": "off",
                            "white": "off",
                            "yellow": "off",
                            "red": "off",
                            "blue": "off",
                            "time": 0.7
                        }, {
                            "purple": "on",
                            "pink": "off",
                            "white": "off",
                            "yellow": "off",
                            "red": "off",
                            "blue": "off",
                            "time": 0.6
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "off",
                            "yellow": "off",
                            "red": "off",
                            "blue": "off",
                            "time": 0.5
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "off",
                            "red": "off",
                            "blue": "off",
                            "time": 0.4
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "on",
                            "red": "off",
                            "blue": "off",
                            "time": 0.3
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "on",
                            "red": "on",
                            "blue": "off",
                            "time": 0.2
                        }, {
                            "purple": "on",
                            "pink": "on",
                            "white": "on",
                            "yellow": "on",
                            "red": "on",
                            "blue": "on",
                            "time": 0.1
                        }];
                        sendFrames(frames);
                    }
                }
            }
        });
    });
}

//startTwitterStream();
