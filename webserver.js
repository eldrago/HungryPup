var
  http = require('http'),
  fs = require('fs'),
  qs = require('querystring'),
  exec = require('child_process').exec,
  url = require('url');

var site = __dirname + '/public';
var urlobj;
var injectStatusAfter = '<!-- errors will go here -->';
var injectPasswordSectionAfter = 'onsubmit="saveFields()">';
var supportedExtensions = {
  "css"   : "text/css",
  "xml"   : "text/xml",
  "htm"   : "text/html",
  "html"  : "text/html",
  "js"    : "application/javascript",
  "json"  : "application/json",
  "txt"   : "text/plain",
  "bmp"   : "image/bmp",
  "gif"   : "image/gif",
  "jpeg"  : "image/jpeg",
  "jpg"   : "image/jpeg",
  "png"   : "image/png"
};
var STATE_DIR = '/var/lib/edison_config_tools';
var NETWORKS_FILE = STATE_DIR + '/networks.txt';

function getContentType(filename) {
  var i = filename.lastIndexOf('.');
  if (i < 0) {
    return 'application/octet-stream';
  }
  return supportedExtensions[filename.substr(i+1).toLowerCase()] || 'application/octet-stream';
}

function injectStatus(in_text, statusmsg, iserr) {
  var injectStatusAt = in_text.indexOf(injectStatusAfter) + injectStatusAfter.length;
  var status = "";
  if (statusmsg) {
    if (iserr)
      status = '<div id="statusarea" name="statusarea" class="status errmsg">' + statusmsg + '</div>';
    else
      status = '<div id="statusarea" name="statusarea" class="status">' + statusmsg + '</div>';
  }
  return in_text.substring(0, injectStatusAt) + status + in_text.substring(injectStatusAt, in_text.length);
}

function inject(my_text, after_string, in_text) {
  var at = in_text.indexOf(after_string) + after_string.length;
  return in_text.substring(0, at) + my_text + in_text.substring(at, in_text.length);
}

function pageNotFound(res) {
  res.statusCode = 404;
  res.end("The page at " + urlobj.pathname + " was not found.");
}

// --- end utility functions

function getStateBasedIndexPage() {
  if (!fs.existsSync(STATE_DIR + '/password-setup.done')) {
    return inject(fs.readFileSync(site + '/password-section.html', {encoding: 'utf8'}),
      injectPasswordSectionAfter,
      fs.readFileSync(site + '/index.html', {encoding: 'utf8'}));
  }
  return fs.readFileSync(site + '/index.html', {encoding: 'utf8'});
}

function setHost(params) {
  if (!params.name) {
    return {cmd: ""};
  }

  if (params.name.length < 5) {
    return {failure: "The name is too short. It must be at least 5 characters long."};
  }
  return {cmd: "configure_edison --changeName " + params.name};
}

function setPass(params) {
  if (fs.existsSync(STATE_DIR + '/password-setup.done')) {
    return {cmd: ""};
  }
  if (params.pass1 === params.pass2) {
    if (params.pass1.length < 8 || params.pass1.length > 63) {
      return {failure: "Passwords must be between 8 and 63 characters long. Please try again."};
    }
    return {cmd: "configure_edison --changePassword " + params.pass1};
  }
  return {failure: "Passwords do not match. Please try again."};
}

function setWiFi(params) {
  var exec_cmd = null, errmsg = "Unknown error occurred.";
  if (!params.ssid) {
    return {cmd: ""};
  } else if (!params.protocol) {
    errmsg = "Please specify the network protocol (Open, WEP, etc.)";
  } else if (params.protocol === "OPEN") {
    exec_cmd = "configure_edison --changeWiFi OPEN '" + params.ssid + "'";
  } else if (params.protocol === "WEP") {
    if (params.netpass.length == 5 || params.netpass.length == 13)
      exec_cmd = "configure_edison --changeWiFi WEP '" + params.ssid + "' '" + params.netpass + "'";
    else
      errmsg = "The supplied password must be 5 or 13 characters long.";
  } else if (params.protocol === "WPA-PSK") {
      if (params.netpass && params.netpass.length >= 8 && params.netpass.length <= 63) {
        exec_cmd = "configure_edison --changeWiFi WPA-PSK '" + params.ssid + "' '" + params.netpass + "'";
      } else {
        errmsg = "Password must be between 8 and 63 characters long.";
      }
  } else if (params.protocol === "WPA-EAP") {
      if (params.netuser && params.netpass)
        exec_cmd = "configure_edison --changeWiFi WPA-EAP '" + params.ssid + "' '" + params.netuser + "' '" + params.netpass + "'";
      else
        errmsg = "Please specify both the username and the password.";
  } else {
    errmsg = "The specified network protocol is not supported.";
  }

  if (exec_cmd) {
    return {cmd: exec_cmd};
  }
  return {failure: errmsg};
}
/********************************************************/

function submitFormFeeding(params, res, req) {
    console.log(params.sms);
    if (!params.time1.match(/\d\d:\d\d:\d\d/)){
        params.time1=params.time1+":00";
    }
    if (!params.time2.match(/\d\d:\d\d:\d\d/)){
        params.time2=params.time2+":00";
    }
    if (!params.time3.match(/\d\d:\d\d:\d\d/)){
        params.time3=params.time3+":00";    
    }
    var newconfig = '{"feedingSchedule": [{"id":"1", "time":"' + params.time1 + '","amount": "' + params.amount1 + '",' + '"enabled": "' + params.enabled1 + '"},' +
                    '{"id":"2", "time":"' + params.time2 + '","amount": "' + params.amount2 + '",' + '"enabled": "' + params.enabled2 + '"},' +
                    '{"id":"3", "time":"' + params.time3 + '","amount": "' + params.amount3 + '",' + '"enabled": "' + params.enabled3 + '"}],' +
                    '"smsnumber":"'+ params.smsAC + params.smsf3 + params.smsl4 + '"}'; 
    console.log(newconfig); 
    
    fs.writeFile('/node_app_slot/public/config.json', newconfig , function (err) {
        if (err) return console.log(err);
        console.log("done");
    } );
    
    res_str = fs.readFileSync(site + '/FeedingSet.html', {encoding: 'utf8'});
    res.end(res_str);
}

/********************************************************/

function submitForm(params, res, req) {
  var calls = [setPass, setHost, setWiFi];
  var result = null, commands = ['sleep 5'];

  // check for errors and respond as soon as we find one
  for (var i = 0; i < calls.length; ++i) {
    result = calls[i](params, req);
    if (result.failure) {
      res.end(injectStatus(getStateBasedIndexPage(), result.failure, true));
      return;
    }
    commands.push(result.cmd);
  }

  // no errors occurred. Do success response.
  exec ('configure_edison --showNames', function (error, stdout, stderr) {
    var nameobj = {hostname: "unknown", ssid: "unknown"};
    try {
      nameobj = JSON.parse(stdout);
    } catch (ex) {
      console.log("Could not parse output of configure_edison --showNames (may not be valid JSON)");
      console.log(ex);
    }

    var hostname = nameobj.hostname;
    var res_str;
    var device_ap_ssid = nameobj.ssid;

    if (params.name) {
      hostname = params.name;
      device_ap_ssid = params.name;
    }

    if (params.ssid) { // WiFi is being configured
      res_str = fs.readFileSync(site + '/exit.html', {encoding: 'utf8'});
    } else {
      res_str = fs.readFileSync(site + '/exiting-without-wifi.html', {encoding: 'utf8'});
    }

    res_str = res_str.replace(/params_ssid/g, params.ssid); // leaves exiting-without-wifi.html unchanged
    res_str = res_str.replace(/params_hostname/g, hostname + ".local");
    res_str = res_str.replace(/params_ap/g, device_ap_ssid);
    res.end(res_str);

    // Now execute commands
    commands.push("configure_edison --disableOneTimeSetup");
    for (var i = 0; i < commands.length; ++i) {
      if (!commands[i]) {
        continue;
      }
      console.log("Executing command: " + commands[i]);
      exec(commands[i], function(error, stdout, stderr) {
        if (error) {
          console.log("Error occurred:");
          console.log(stderr);
        }
        console.log(stdout);
      });
    }
  });
}

/***************************************************************/

function handlePostRequest(req, res) {
  if (urlobj.pathname === '/submitConfig' || urlobj.pathname=== '/submitForm') {
    var payload = "";
    req.on('data', function (data) {
        payload += data;
    });
    console.log("parse 1" + payload);
    req.on('end', function () {
      var params = qs.parse(payload);
      console.log (payload);
      // edit so that it can tell between wifi and feeding submit.
      if (urlobj.pathname === '/submitConfig') {
        submitFormFeeding(params, res, req);
      } else {
          submitForm(params,res,req);
      }
      
    });
  } else {
    pageNotFound(res);
  }
}

/***************************************************************/
// main request handler. GET requests are handled here.
// POST requests are handled in handlePostRequest()
function requestHandler(req, res) {

  urlobj = url.parse(req.url, true);

  // POST request. Get payload.
  if (req.method === 'POST') {
    handlePostRequest(req, res);
    return;
  }

  // GET request
  if (!urlobj.pathname || urlobj.pathname === '/' || urlobj.pathname === '/index.html') {
      var config;

      try 
      {
            config = JSON.parse(fs.readFileSync(__dirname + '/public/config.json'));
	  } catch (e) {
        console.log(e);
      }
            try 
      {
            blocking = JSON.parse(fs.readFileSync(__dirname + '/public/blocking.json'));
	  } catch (e) {
        console.log(e);
      }
      
      var res_str = fs.readFileSync(site + '/index.html', {encoding: 'utf8'});
      var myhostname, myipaddr;
      var cmd = 'configure_edison --showWiFiIP';
      console.log("Executing: " + cmd);
      exec(cmd, function (error, stdout, stderr) {
        if (error) {
          console.log("Error occurred:");
          console.log(stderr);
          myipaddr = "unknown";
        } else {
          myipaddr = stdout;
        }
        console.log(stdout);

        cmd = 'hostname';
        console.log("Executing: " + cmd);
        exec(cmd, function (error, stdout, stderr) {
          if (error) {
            console.log("Error occurred:");
            console.log(stderr);
            myhostname = "unknown";
          } else {
            myhostname = stdout;
          }
          console.log(stdout);
// added for sensors
          res_str = res_str.replace(/lidStat/g, blocking.lidStatus);
          res_str = res_str.replace(/hopperStat/g, blocking.hopperStatus);
          res_str = res_str.replace(/bowlStat/g, blocking.bowlStatus);
//normal replacements            
          res_str = res_str.replace(/params_ip/g, myipaddr);
          res_str = res_str.replace(/params_hostname/g, myhostname);
          res_str = res_str.replace(/time1/g, config.feedingSchedule[0].time);
          res_str = res_str.replace(/amount1/g, config.feedingSchedule[0].amount);
          res_str = res_str.replace(/enabled1/g, config.feedingSchedule[0].enabled);
          res_str = res_str.replace(/time2/g, config.feedingSchedule[1].time);
          res_str = res_str.replace(/amount2/g, config.feedingSchedule[1].amount);
          res_str = res_str.replace(/enabled2/g, config.feedingSchedule[1].enabled);
          res_str = res_str.replace(/time3/g, config.feedingSchedule[2].time);
          res_str = res_str.replace(/amount3/g, config.feedingSchedule[2].amount);
          res_str = res_str.replace(/enabled3/g, config.feedingSchedule[2].enabled);
          res.end(res_str);
        });
      });
  } else if (urlobj.pathname === '/wifiNetworks') {
    if (fs.existsSync(NETWORKS_FILE)) {
      res.setHeader('content-type', getContentType(NETWORKS_FILE));
      res.end(fs.readFileSync(NETWORKS_FILE, {encoding: 'utf8'}));
    } else {
      res.statusCode = 404;
      res.end("Please try again later.");
    }
  } else { // for files like .css and images.
    if (!fs.existsSync(site + urlobj.pathname)) {
      pageNotFound(res);
      return;
    }
    fs.readFile(site + urlobj.pathname, function (err, data) {
      if (err)
        throw err;
      res.setHeader('content-type', getContentType(urlobj.pathname));
      res.end(data);
    });
  }
}

/****************************************************************************/

http.createServer(requestHandler).listen(8081);