var express = require("express");
var bodyParser  = require("body-parser");
var multer = require('multer');
var fs = require('fs');
var http = require("http");
var speak = require("node-speak");
var app  = express();

var baseUrl = 'http://127.0.0.1:4444'
var request = require('request');
var querystring = require('querystring');

// UPLOAD FILES
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname +'/www/uploads/')			// DESTINATION FILES
    },
    filename: function (req, file, cb) {
		if(typeof file === 'undefined')
			return;
		//var ext = file.originalname.split('.').pop();
        cb(null, file.originalname);
  }
});

var upload = multer({ storage: storage });

// CORS middleware
var allowCrossDomain = function(req, res, next){

	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');
	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
}
	
	app.use(allowCrossDomain);
	app.use(express.static(__dirname + '/www'));                 	// set the static files location /www/img will be /img for users
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
	
	// application -------------------------------------------------------------
	app.get("*",function(req,res){
        // load the single view file (angular will handle the page changes on the front-end)
		res.sendFile(__dirname +'/www/index.html'); 
    });
	
	// GET ALL ENTRIES
	app.post('/getRecentFiles', function(req, res){
		
		var obj = JSON.parse(fs.readFileSync(__dirname+'/controls/recents_files.json', 'utf8'));
		//console.log(JSON.stringify(obj));
		res.send(obj);
	});
	
	// UPLOAD FILE
	app.post('/upload', upload.single('file'), function(req, res){
		res.status(204).end();
	});
	
	// UPDATE RECENT FILES LIST
	app.post('/updateRecentsFiles', function(req, res){
		
		console.log("body: "+JSON.stringify(req.body));//.replace(/\\/g, ""));
		if(typeof req.body !== 'undefined'){
			// WRITE THE WHOLE ARRAY IN FILE
			fs.writeFile(__dirname+"/controls/recents_files.json", JSON.stringify(req.body).replace(/\\/g, ""), function(err){
				if(err){
					return console.log(err);
				}
				console.log("the list is modified");
			}); 
		}
		res.status(204).end();
	});
	
	// GET FILE CONTENT
	app.post('/readFile/:name', function(req, res){
		
		console.log("body: "+JSON.stringify(req.body)); // form fields
		//console.log("query: "+JSON.stringify(req.query));
		//console.log("param: "+JSON.stringify(req.param));
		
		fs.readFile(__dirname+'/www/uploads/'+req.body['file_name'], function (err, data){
			if(err){
				return console.log(err);
			}
			res.type('text/plain'); // set content-type
			return res.send(data);
		});
		
		//res.status(204).end();
	});
		
	// OLD SPEECH API
	app.post('/espeak', function(req, res){
		
		//console.log("speak: "+JSON.stringify(req.body));
		var audio = "";
		if(req.body.text){
			speak(req.body.text, {	
				callback: function(src){
					audio = src;
				}
			});
			res.type('text/plain'); // set content-type
			return res.send(audio);
		}
	});
	
	// NEW SPEECH API
	app.post('/speak', function(req, result){
		
		try{ // DELETE CACHE FILES
			var soundFilePath = __dirname+'/www/cache/sound.wav'; 
			var textFilePath = __dirname+'/www/cache/txt.txt'; 
			fs.unlinkSync(soundFilePath);
			fs.unlinkSync(textFilePath);
		} catch(err){}
		
		console.log("speak> text: "+req.body.text);
		var data = querystring.stringify({text: req.body.text});
		var options = {
			host: '127.0.0.1',
			port: 4444,
			path: '/say',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(data)
			}
		};

		var str="";
		try{
			
			var req = http.request(options, function(res){
				res.setEncoding('utf8');
				res.on('data', function (chunk){
					str += chunk;
				});
				res.on('end', function(){
					var jsonObject = JSON.parse(str);
					try {
						console.log("str: " + jsonObject.src.length);
					} catch (err) {
						console.log(jsonObject, '....?');
					}
					result.type('text/plain'); 
					return result.send(jsonObject.src);
				 });
			});
			req.write(data);
			req.end();
		} catch(err){
			throw new Error("Error: connect ECONNREFUSED 127.0.0.1:4444 - Run Speech Server with : node sayServerLite");
		}
		
	});
	
	app.set('view engine', 'ejs');

    // listen (start app with node Server.js) ======================================
    app.listen(8080);
    console.log("App listening on port 8080");

	