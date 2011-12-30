var http = require('http');
var plist = require('plist');
var fs = require('fs');

var ODSserver = 'ODS/1.0';

var fsImage = fs.openSync('Fedora-16-x86_64-netinst.iso', 'r');
var fsStat = fs.fstatSync(fsImage);

function error404(res) {
	res.writeHead(404);
	res.end();
}

function image(req, res) {
	switch (req.method) {
	case 'HEAD':
		if (req.headers['user-agent'] != 'CCURLBS::statImage') {
			error404(res);
			return;
		}

		var date = new Date();
		res.writeHead(200, {
			'Server': ODSserver,
			'Date': date.toUTCString(),
			'Content-Type': 'application/octet-stream',
			'Accept-Ranges': 'bytes',
			'Content-Length': fsStat.size
		});
		res.end();
		break;
	case 'GET':
		if (req.headers['user-agent'] != 'CCURLBS::readDataFork') {
			error404(res);
			return;
		}

		var start = 0;
		var end = 0;
		var range = req.headers['range'];
		if (range != null) {
			console.log(range);
			start = parseInt(range.slice(range.indexOf('bytes=') + 6, range.indexOf('-')));
			end = parseInt(range.slice(range.indexOf('-') + 1, range.length));
  		}
		if (isNaN(end) || end == 0) {
			end = fsStat.size - 1;
		}
		if (start > end) {
			error404(res);
			return;
		}
		var len = end - start + 1

		var b = new Buffer(len);
		fs.read(fsImage, b, 0, len, start, function (err, bytesRead, buffer) {
			if (err) {
				error404();
				return;
			}

			var headers = {
				'Server': ODSserver,
				'Content-Type': 'application/octet-stream',
				'Content-Range': 'bytes ' + start + '-' + (start + bytesRead - 1) + '/' + fsStat.size
			};
			console.log(headers);
			res.writeHead(206, headers);
			res.end(buffer);
		});

		break;
	}
}

routing = {
	'/disk2s0.dmg': image
};

http.createServer(function (req, res) {
	console.log( { method: req.method, url: req.url, headers: req.headers } );

	var route = routing[req.url];
	if (typeof route == 'undefined') {
		error404(res);
		return;
	}
	route(req, res);
}).listen(65432, "0.0.0.0");
