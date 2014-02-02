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

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var moment = require('moment');

//This structure will keep the total number of tweets received and a map of all the symbols and how many tweets received of that symbol
var watchList = {
    total: 0,
    symbols: {}
};

var client;

if (process.env.REDISTOGO_URL){
    client = require('redis-url').connect(process.env.REDISTOGO_URL);
} else {
    var redis = require('redis');
    client = redis.createClient(6379, process.env.IP);
}

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

router.get('/blink/:user/:id', function(req, res){
    var user = req.params.user;
    var blinkName = req.params.id;
   
    client.hget(user, "blinks", function(err, data){
        var blinks = JSON.parse(data);
        var resp = blinks[blinkName];
        res.send(resp); 
   });
});

router.get('/blink/:user', function(req, res){
    var user = req.params.user;

    client.hget(user, "blinks", function(err, data){
        var blinks = JSON.parse(data);
        var resp = [];
        for (var name in blinks)
            {resp.push({id: name});}
            
        res.send(resp); 
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

    client.hget("reese", "blinks", function (err, data) {
      if (err) return console.log(err);
    
        socket.emit('blinkNames', JSON.parse(data));
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
        client.hdel("reese", "blinks");
        client.hget("reese", "blinks", function(err, data){
            var blinks = data || {};
            blinks[blink.name] = blink.frames;
            client.hset("reese", "blinks", JSON.stringify(blinks));
        });
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

function mentionReceived(mention, timestamp){
    mentionTime = moment(timestamp);
    minute = mentionTime.minute();

    var currmention = watchList.symbols[mention][minute]
    currmention.count++;
    currmention.timestamp = mentionTime;

    watchList[minute].count++;
    watchList[minute].timestamp = mentionTime;
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
    var addr = server.address();
    console.log("Chat server listening at", addr.address + ":" + addr.port);
});

function startTwitterStream(watchSymbols, notifyCallback) {

    for (var i = 1; i <= 60; i++){
        watchList[i] = {count: 0, lastUpdated: moment()};
    }

    //Set the watch symbols to zero.
    _.each(watchSymbols, function(v) {
        watchList.symbols[v] = {};
        for (var i = 1; i <= 60; i++){
            watchList.symbols[v][i] = {count: 0, lastUpdated: moment()};
        }
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
                var timestamp = tweet.created_at.replace(/( \+)/, ' UTC$1')

                //Go through every symbol and see if it was mentioned. If so, increment its counter and
                //set the 'claimed' variable to true to indicate something was mentioned so we can increment
                //the 'total' counter!
                _.each(watchSymbols, function(v) {
                    if (text.indexOf(v.toLowerCase()) !== -1) {
                        claimed = true;
                        notifyCallback(v, timestamp);
                    }
                });

                //If something was mentioned, increment the total counter and send the update to all the clients
                if (claimed) {
                    //Increment total
                    watchList.total++;

                    if (watchList.total%100 === 0){
                        console.log(JSON.stringify(watchList));
                    }
                }
            }
        });
    });
}

//client.hset("reese", "twitter", JSON.stringify({hashtags: ["reesepower", "teamreese"]}));
startTwitterStream(["reesepower", "teamreese", "android"], mentionReceived);
