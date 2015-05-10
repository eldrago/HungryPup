/*  The core of the software code */

var LCD = require("jsupm_i2clcd");
var mraa = require('mraa'); //require mraa
var fs = require('fs');
var messager = require('./messager.js'); //require messager
var feed = require('./feed.js');
var config;
var date = new Date();

console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the console

var feedNowButton = new mraa.Gpio(6); //setup digital read for feed now button on Digital pin #6 (D6)
feedNowButton.dir(mraa.DIR_IN); //set the gpio direction to input

var theLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62);
theLCD.setColor(200,100,0);

periodicActivity(); //call the periodicActivity function


/*****************************************************************************/

function periodicActivity() 
{
    var date = new Date();
    var mytime = date.toLocaleTimeString();
    
    try {
        config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
    } catch (e) {
        console.log(e);
    }
    theLCD.setCursor(0,0);
    theLCD.write(mytime);
    
    // Checks against feeding schedule.. if it is time to eat the dogs eat.  Feeding schedule is currently reloaded every second... need to add events.. but hey this works
    if (mytime == config.feedingSchedule[0].time && config.feedingSchedule[0].enabled){
        console.log("feeding the dog due to schedule " + config.feedingSchedule[0].id);
        feed.feedTheDog(config.feedingSchedule[0].amount);
    } else if (mytime == config.feedingSchedule[1].time && config.feedingSchedule[1].enabled){
        console.log("feeding the dog due to schedule " + config.feedingSchedule[1].id);
        feed.feedTheDog(config.feedingSchedule[1].amount);
    } else if (mytime == config.feedingSchedule[2].time && config.feedingSchedule[2].enabled){
        console.log("feeding the dog due to schedule " + config.feedingSchedule[2].id);
        feed.feedTheDog(config.feedingSchedule[2].amount);
    }
        
    var feedNowValue =  feedNowButton.read(); //Checking if feed now button has been press
    if (feedNowValue == 1){
        console.log("feeding the dog due to feed now button");
        //messager.sendMessage(2);  // tells the message server to send the feeding message.
        feed.feedTheDog(2); // goes through feeding process
    }
    setTimeout(periodicActivity,1000); //call the indicated function after 1 second (1000 milliseconds)
}
/*********************************************************/