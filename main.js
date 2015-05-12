// main.js for HungryPup core software 
// Author: Zack Coddington
// Date updated: 5/11/2015
// Description: Code that runs on Edison controller that drives the hardware and software activities for the HungryPup Automated Pet Feeder

// Global Variables - TBD
// 

// Functions
// clock(myTime) - updates LCD with current time
// feedTheAnimal(amount) - runs through the feeding process, enables motor keeps it on for amount * 1 second , then turns motor off
// sendMessage(messID) - sends a text message via twilio API to defined cell phone.  Message contents are determined by messID integer.
// periodicActivity() - runs every second, checks to see if it time to feed the animal, and monitors for feedNow button.  If it is time to feed it begins the feeding process.  
// HopperMonitor() - returns status of hopper
// BowlMonitor() - returns status of bowl

// ToDo:
// make more event driven
// Add webserver

// Recent Changes:
// added monitors 
// Incorporated all functions into this one file... may be broken up in the future.
// Added a hella lot of commenting
// moved all pin initialization to main section of the code.


/***********************************************************************************************************************************************/
// main section of the code
/**********************************************************************************************************************************************/
var LCD = require("jsupm_i2clcd");
var mraa = require('mraa'); //require mraa
var fs = require('fs'); // required to interact with file system on Edison
var config;
var date = new Date();  //will this work globally

console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the console

// setup pins on edison
// i2c devices
var theLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62);  // initialize the LCD interface 

// digital in devices
/*  currently unconnected pins
var hopperFullDetect = new mraa.Gpio(2);
var hopperMidDetect = new mraa.Gpio(3); 
var hopperLowDetect = new mraa.Gpio(4); 
var lidDetect = new mraa.Gpio(1);
*/
var feedNowButton = new mraa.Gpio(6); 

// set direction on GPIO pins to input
/* currently unconnected pins
hopperFullDetect.dir(mraa.DIR_IN); 
hopperMidDetect.dir(mraa.DIR_IN); 
hopperLowDetect.dir(mraa.DIR_IN); 
lidDetect.dir(mraa.DIR_IN);
*/
feedNowButton.dir(mraa.DIR_IN); 

// PWM devices 
 var motor = new mraa.Pwm(5);

// attempt to parse config file, and put the info into the config object
try {
    config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));
	console.log('Feeding ' + config.feedingSchedule[0].id + ' is scheduled for ' + config.feedingSchedule[0].time);
	console.log('Feeding ' + config.feedingSchedule[1].id + ' is scheduled for ' + config.feedingSchedule[1].time);
	console.log('Feeding ' + config.feedingSchedule[2].id + ' is scheduled for '+ config.feedingSchedule[2].time);
} catch (e) {
    console.log(e);
}
// whenever there is a change in config.json it will re-parse it into the config object
fs.watch(__dirname + '/config.json', function(event, filename) {
	console.log('change in config.json detected, reparsing file');
	try {
        config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));
		console.log('Feeding ' + config.feedingSchedule[0].id + ' is scheduled for ' + config.feedingSchedule[0].time);
		console.log('Feeding ' + config.feedingSchedule[1].id + ' is scheduled for ' + config.feedingSchedule[1].time);
		console.log('Feeding ' + config.feedingSchedule[2].id + ' is scheduled for '+ config.feedingSchedule[2].time);
        console.log('reparsing completed');
    } catch (e) {
        console.log('parsing failed');
		console.log(e);
    }
});

theLCD.setColor(200,100,0);      // sets LCD color
setInterval(function(){clocky();},1000); //updates the LCD every second
setInterval(function(){periodicActivity();},1000); //calls the periodicActivity function every second

/***********************************************************************************************************************************************/
// hopperMonitor - returns status of the hopper ... returns 0 if empty, 1 if low, 2 if partially filled, 3 if full.  Note digital checks are
// currently commented out because hardware is not attached
/***********************************************************************************************************************************************/
function HopperMonitor(){
/*

	var fullDetectValue = fullDetect.read();
	var midDetectValue = midDetect.read();
	var lowDetectValue = lowDetect.read();
	
	// checks the capacitive sensors from Full to Low, returning appropriate value.  If all the sensors == 0 then it returns low.
	if (fullDetect == 1){  // might be able to do if (fullDetect)
		return 3;
	} else if (midDetect == 1){
		return 2;
	} else if (lowDetect ==1){
		return 1;
	} else {
		return 0;
	}
*/
	return 3;
}
/***********************************************************************************************************************************************/
// BowlMonitor - Checks weight of bowl.. if bowl is above a certain weight we assume that it has food in it and return true, else return false
// actual hardware setup commented out as we do not have it connected
/**********************************************************************************************************************************************/
function BowlMonitor(){
/*
	var bowlCheck = new mraa.Aio(0);
	var bowlValue = bowlCheck.read();
	console.log('value of bowl weight is '+ bowlValue);
	if (bowlValue > 22){
		return true;
	}
*/
	return false;
}
/***********************************************************************************************************************************************/
// clock- updates the LCD with the value of myTime.
/***********************************************************************************************************************************************/
function clocky()
{
    var myTime = new Date();
    var myTimeString = myTime.toLocaleTimeString();
    theLCD.setCursor(0,0);
    theLCD.write(myTimeString);
}
/***********************************************************************************************************************************************/
// feedTheAnimal runs through the feeding process, enables motor keeps it on for amount * 1 second , then turns motor off.
/***********************************************************************************************************************************************/
function feedTheAnimal(amount) // Drives the motor, amount of time is based off of amount of food to be moved.  Will need to measure half cup.
{
    var date2 = new Date(); // setup date
    motor.enable(true);  // enables PWM for motor
    motor.period_ms(20); // 20 ms period
    motor.write(0.085); // sets the motor to go clockwise (0.085 * 20000 = 1700 usec)  set to .065 for counterclockwise and .075 for stop.
    console.log("Starting feeding the dog on " + date2.toLocaleTimeString() ); // debug
    
    var turnMotorOff = function (){   // funky way to allow timing due to asynchronous nature of code
        motor.enable(false); // turn off the system
        console.log("Stopping feeding the dog on " + date2.toLocaleTimeString() ); // debug to make sure that the feeding is going the right amount of time.
		sendMessage("Fed the dog at " + date2.toLocaleTimeString());
		return;
    };
    
    setTimeout(turnMotorOff, 1000 * amount);
    
}


// sendMessage sends a text message via twilio API to defined cell phone.  Message contents are determined by messID integer.
/******************************************************************************************/
function  sendMessage(textToSend)
{
    var accountSid = 'ACa43b0d4eefb2b38f6ca25138d83cd116'; 
    var authToken = '24059e1dbad4a64b55e869090ea96ae5'; 
    var client = require('twilio')(accountSid,authToken);
    
    /*  Will use to get sms number
    try {
        config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
    } catch (e) {
        console.log(e);
    }
    */
    
    client.messages.create({
    to: "5037083261" , //config.user.smsnum,
    from: "+19713402146",
    body: textToSend,
    }, function(error, message){  //if there was a problem it states the error 
            if(!error){
                console.log("Message sent at " + message.dateCreated);
            } else {
                console.log("Message wasn't sent...");
			}
	});
}
/******************************************************************************/


/*****************************************************************************/

function periodicActivity() 
{
    var date = new Date();
    var currentTime = date.toLocaleTimeString();
 /*   try {
        config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
    } catch (e) {
        console.log(e);
    }
*/
    // Checks against feeding schedule.. if it is time to eat, the feeding process is started. 
    if (currentTime == config.feedingSchedule[0].time && config.feedingSchedule[0].enabled){
        console.log("feeding the dog due to schedule " + config.feedingSchedule[0].id);
        feedTheAnimal(config.feedingSchedule[0].amount);
    } else if (currentTime == config.feedingSchedule[1].time && config.feedingSchedule[1].enabled){
        console.log("feeding the dog due to schedule " + config.feedingSchedule[1].id);
        feedTheAnimal(config.feedingSchedule[1].amount);
    } else if (currentTime == config.feedingSchedule[2].time && config.feedingSchedule[2].enabled){
        console.log("feeding the dog due to schedule " + config.feedingSchedule[2].id);
        feedTheAnimal(config.feedingSchedule[2].amount);
    }
        
    var feedNowValue =  feedNowButton.read(); //Checking if feed now button has been press
    if (feedNowValue == 1){ // might be able to go boolean
        console.log("feeding the dog due to feed now button");
        sendMessage("feed now has been pushed at " + currentTime);  // tells the message server to send the feeding message.
        feedTheDog(2); // goes through feeding process
    }
}
/*********************************************************/
