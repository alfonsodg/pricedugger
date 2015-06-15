//var phantom = require('phantom');
require('events').EventEmitter.prototype._maxListeners = 100;
var WebSocketServer = require('ws').Server;
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var Xray = require('x-ray');
var x = Xray();
var express = require('express');
var request = require('request');

var cfenv = require('cfenv');

var app = express();

app.use(express.static(__dirname + '/public'));

var appEnv = cfenv.getAppEnv();

app.listen(appEnv.port, appEnv.bind, function() {
  console.log("server starting on " + appEnv.url);
});

var port = (process.env.VCAP_APP_PORT || 9981); 

wss = new WebSocketServer({port: port});


wss.on('connection', function(ws) {
    var url = '';
    ws.on('message', function(message) {
        var url = message;
        var google = new Nightmare()
            .goto('http://observatorio.digemid.minsa.gob.pe/Precios/ProcesoL/Consulta/BusquedaGral.aspx?grupo=2926*3&total=1*1&con=120mg/5mL&ffs=24&ubigeo=15&cad=PARACETAL*120mg/5mL*Solucion*-*Suspension')
            .click('input[value="filtroTodos"]')
            .wait()
            .evaluate(function () {
                    return [].map.call(document.querySelectorAll('tr.odd a'),
                    function(link) {
                        return link.href.split("'")[1];
                    }
                );
                },  function (result, m) {
                    for (i = 0; i < result.length; i++) {
                        var xurl = 'http://observatorio.digemid.minsa.gob.pe/Precios/ProcesoL/Consulta/' + result[i];
                        var gurl = '';
                        var x = request(xurl, function (error, response, html) {
                            if (!error && response.statusCode == 200) {
                                var $ = cheerio.load(html);
                                var html_view = '';
                                var blah = {};
                                $('span').each(function(i, element){
                                    if (typeof element.children[0] !== 'undefined') {
                                        blah[element.attribs.id] = element.children[0].data;
                                        html_view += '<strong>'+element.attribs.id+'</strong>:'+element.children[0].data+'<br>';
                                    }
                                });
                                blah['html'] = html_view;
                                blah['MontoEmpaque'] = parseFloat(blah['MontoEmpaque']);
                                if (blah['MontoEmpaque'] > 0) {
                                //ws.send(JSON.stringify(blah));
                                    gurl='http://api.opencagedata.com/geocode/v1/json?q='+blah['Direccion']+' '+blah['Ubicacion']+'&key=f4d1f3ad96668fcfa57a272eb5cbf83d'
                                 //console.log(gurl);
                                    request({
                                        url: gurl,
                                        json: true
                                        }, function (error, response, body) {
                                            if (!error && response.statusCode === 200) {
                                                if (typeof body.results[0] !== 'undefined') {
                                                    blah['coordinates'] = body.results[0].geometry;
                                                    //console.log(body.results[0].geometry);                                    
                                                }
                                                ws.send(JSON.stringify(blah));
                                                //console.log(blah) // Print the json response
                                            }
                                        })
                                }
                                //ws.send(JSON.stringify(blah));
                                
                                //return gurl;
                            }
                        });
                        //console.log(x);
                    }
            })
        //.click('span[id="tbPrivados_next"]')
        //.wait()
        //.evaluate(function () {
                //return [].map.call(document.querySelectorAll('tr.odd a'),
                //function(link) {
                    //return link.href.split("'")[1];
                //}
            //);
        //},  function (result, m) {
                //for (i = 0; i < result.length; i++) {
                //var xurl = 'http://observatorio.digemid.minsa.gob.pe/Precios/ProcesoL/Consulta/' + result[i];
                //ws.send(xurl);
                //}
            //})
        //  .screenshot('google.png')
            .run(function() {console.log('Done!')});
    });
});
