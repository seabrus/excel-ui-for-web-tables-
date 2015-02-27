var http = require('http');
var fs = require('fs');
var path = require('path');

var ROW_ID = 33;


var server = http.createServer( function (req, res) {

    var url = require('url').parse(req.url);


    // ********* GET requests *********
    if ( req.method === "GET" ) {

        var fileName = '';
        var conType = '';

        if ( req.url === '/' )
            fileName = 'app/index.html';
        else if ( url.pathname.indexOf('vendors') !== -1 )
            fileName = url.pathname;
        else
            fileName = 'app/' + url.pathname;

        if ( !fileName ) {
            console.log("GET request: No file name");
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        if ( path.extname( fileName ) === '.html')  conType = 'text/html';
        if ( path.extname( fileName ) === '.css')   conType = 'text/css';
        if ( path.extname( fileName ) === '.js')      conType = 'text/javascript';
        if ( path.extname( fileName ) === '.json')  conType = 'application/json';
        if ( path.extname( fileName ) === '.png')   conType = 'image/png';
        if ( path.extname( fileName ) === '.gif')     conType = 'image/gif';
        if ( path.extname( fileName ) === '.ico')    conType = 'image/x-icon';

        fileName = path.join( __dirname, fileName );

        fs.stat( fileName, function(err, stat) {
            if (err) {
                if ( err.code === 'ENOENT' ) {
                    res.statusCode = 404;
                    res.end('ENOENT - File Not Found');
                }
                else {
                    res.statusCode = 500;
                    res.end('Internal Server Error');
                }
                return;
            }

            fs.readFile( fileName, function (err, data) {
                if (err) {
                    console.log('File ' + fileName + ' is not found or cannot be read');
                    res.writeHead(404, 'Cannot read the file');
                    res.end('Ошибка при чтении файла на сервере: файл отсутствует или поврежден');
                    return;
                }

                res.writeHead( 200, { 'content-type': conType, 'content-length': stat.size} );
                res.write( data );
                res.end();
            });

        });

    }

    // ********* DELETE requests *********
    if ( req.method === "DELETE" ) {

        if ( req.url !== '/db' ) {
            console.log("DELETE request: Incorrect path");
            res.writeHead(404);
            res.end('Incorrect path');
            return;
        }

        var deletedRows = '';
        req.setEncoding('utf8');

        req.on('data', function (chunk) {
            deletedRows += chunk;
        });

        req.on('error', function (err) {
            console.log('DELETE request: Error when transferring user data: ' + err.message);
            res.writeHead(404);
            res.end('DELETE request: Error when transferring user data: ' + err.message);
            return;
        });

        req.on('end', function () {
            if ( !deletedRows ) {
                console.log('DELETE request: Data are empty, nothing to delete');
                res.writeHead(404);
                res.end('DELETE request: Data are empty, nothing to delete');
                return;
            }

            var deletedRowsArray = JSON.parse( deletedRows );
            var counter = -1;

            (function nextRow( err ) {
                if (err) console.log('DELETE: Errors -- ' + err.message);
                else    counter++;
                
                if ( deletedRowsArray.length === 0 ) {
					finishDelete();
					return;
				}

                var rowID = deletedRowsArray.shift();
                //fs.stat( 'db/' + rowID + '.dat', function(err, stat) {
                    //if (err) {
                        //nextRow( err );
                        //return;
                    //}
                    fs.unlink( 'db/' + rowID + '.dat', nextRow );
                //});
            })();

            function finishDelete() {
	            if ( counter > 0 ) {
	                console.log('DELETE request: ' + counter + ' file(s) were deleted');
	                res.writeHead( 200, {'content-type': 'application/json'} );
	                res.end( deletedRows );
	            }
	            else {
	                console.log('DELETE request: Nothing was deleted');
	                //res.writeHead(404);
	                res.writeHead(200);
	                res.end('DELETE request: Nothing was deleted');
	            }
			}
        });
    }


    // ********* POST requests *********
    if ( req.method === 'POST' ) {

        if ( req.url !== '/db' ) {
            console.log("POST request: Incorrect file name");
            res.writeHead(404);
            res.end('File not found - Incorrect file name');
            return;
        }

        var newRows = '';
        req.setEncoding('utf8');

        req.on('data', function (chunk) {
            newRows += chunk;
        });

        req.on('error', function (err) {
            console.log('POST request: Error when transferring new rows: ' + err.message);
            res.writeHead(404);
            res.end();
            return;
        });

        req.on('end', function () {
            if ( newRows ) {

                var newRowsArray = JSON.parse( newRows );
                var postRes = [];
                var _tempID = '', _dbID = '';

                for ( var i=0, len=newRowsArray.length || 0; i<len; i++ ) {
                    _tempID = newRowsArray[ i ].id;
                    _dbID = 'RID000' + (ROW_ID++) + 'db';
                    postRes.push( { tempID: _tempID, dbID : _dbID } );

                    newRowsArray[ i ].id = _dbID;
                    fs.writeFileSync( 'db/' + _dbID + '.dat', JSON.stringify(newRowsArray[ i ]) );
                }

                console.log('POST: ' + newRowsArray.length + ' new rows were added to the DB');

                // setTimeout( function() {
                res.writeHead( 200, { 'content-type': 'application/json'} );
                res.end( JSON.stringify( postRes ) );
                // }, 5000 );

            }
            else {
                console.log('POST request: New rows are empty, nothing to add to the DB');
                res.writeHead(404);
                res.end('POST request: New rows are empty, nothing to add to the DB');
            }
        });

    }


    // ********* PUT requests *********
    if ( req.method === 'PUT' ) {

        if ( req.url !== '/db' ) {
            console.log("PUT request: Incorrect file name");
            res.writeHead(404);
            res.end('File not found - Incorrect file name');
            return;
        }

        var updatedRows = '';
        req.setEncoding('utf8');

        req.on('data', function (chunk) {
            updatedRows += chunk;
        });

        req.on('error', function (err) {
            console.log('PUT request: Error when transferring rows: ' + err.message);
            res.writeHead(404);
            res.end();
            return;
        });

        req.on('end', function () {
            if ( updatedRows ) {

                var updatedRowsArray = JSON.parse( updatedRows );
                var postRes = [];
                var _ID = '';

                for ( var i=0, len=updatedRowsArray.length || 0; i<len; i++ ) {
                    _ID = updatedRowsArray[ i ].id;
                    postRes.push( _ID );

                    fs.writeFileSync( 'db/' + _ID + '.dat', JSON.stringify( updatedRowsArray[ i ]) );
                }

                console.log('PUT: ' + updatedRowsArray.length + ' rows were updated');

                // setTimeout( function() {
                res.writeHead( 200, { 'content-type': 'application/json'} );
                res.end( JSON.stringify( postRes ) );
                // }, 5000 );
            }
            else {
                console.log('PUT request: Rows are empty, data were not rewritten');
                res.writeHead(404);
                res.end('PUT request: Rows are empty, data were not rewritten');
            }
        });
    }


});

server.listen(8000);



