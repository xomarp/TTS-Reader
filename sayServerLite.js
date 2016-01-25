/**
 * Created by user on 8/2/15.
 */

/**
 * /say to speak test
 * Install http://sourceforge.net/projects/jampal/files/
 * http://jampal.sourceforge.net/ptts.html
 */

var sh = {};
var fs = require("fs");
var encoding = 'utf8';
var express = require("express");
var app = express();
var r
var port = 4444;


sh.writeFile = function writeFile(fileName, content, surpressErrors, binary){

	fs.writeFile(fileName, content, encoding, function(err){
		if(err){
			return console.log(err);
		}
	});
}

sh.dv = function defaultValue(input, ifNullUse){
    if(input == null){
        return ifNullUse;
    }
    return input;
}

sh.qq = function qq(text){
    return "\"" + text + "\"";
};

sh.isWin = function isWin() {
    return process.platform === 'win32'
};

function SayServerLite(){
    var p = SayServerLite.prototype;
    p = this;
    var self = this;
    /**
     * Setup middleware and routes
     * @param urlf
     * @param appCode
     */
    p.start = function start(){
        self.setupExpressApp();
        app.post('/say', self.say);
    }

    p.setupExpressApp = function setupApp(){

        var bodyParser = require('body-parser');
        app.use(bodyParser());

        //Add middleware for cross domains
        app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        app.listen(port)
        return app;
    }

    function defineRoutes(){
        self.say = function sayRoute(req, res){
            var text = req.body.text;
            var rate = req.body.rate;
            var voice = req.body.voice;

            if (sh.isWin()==false) {
                voice = sh.dv(voice, 'graham')
                self.speak(function result(body){
                    res.json({src:"."})
                }, text , rate, voice);
                return;
            }


			var json = {}
			json.src="audio/x-wav;base64,";
            self.speak(function result(body){
				fs.readFile(__dirname+'/www/cache/sound.wav', function(err, original_data){
					json.src += new Buffer(original_data, 'binary').toString('base64');
					json.status = 'ok';
					// SEND RESULT
					res.json(json);
				});
            }, text , rate, voice);
        }

        p.speak = function (fx, text, rate, voice){
			console.log("speak.text: "+text);
            var child_process = require('child_process');
            var gb = "say "
            voice = sh.dv(voice, 'Ryan')
            gb += ' '+'-v ' + voice +' ';
            gb += ' '+sh.qq(text) +' ';
            if(rate != null){
                gb += ' ' + '-r ' + rate + ' ';
            }

            if(sh.isWin()){ //windows
                var path = require('path');
                var filePath = path.resolve(__dirname+'/www/cache/txt.txt')
                filePath = filePath.replace(/\\/gi, "/")
                sh.writeFile(filePath, text);
                gb = 'cscript "C:\\Program Files\\Jampal\\ptts.vbs" -u '+filePath+' -w www/cache/sound.wav';
            }
			// EXECUTION
            var cp = child_process.exec(gb, function (err, stdout, stderr){
                fx(true);
                //console.log('done speaking', text, stdout);
            });
            return;
        }
    }
    defineRoutes();

    p.proc = function debugLogger(){
        if(self.silent == true){
            return
        }
        sh.sLog(arguments)
    }

}

exports.SayServerLite = SayServerLite;

if(module.parent == null){
    var e = new SayServerLite()
    e.start();
};



