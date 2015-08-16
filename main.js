// main.js for HungryPup core software 
// Author: Zack Coddington
// Date updated: 8/6/2015
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

// Recent Changes:
// added monitors 
// Incorporated all functions into this one file... may be broken up in the future.
// Added a hella lot of commenting
// moved all pin initialization to main section of the code.


/***********************************************************************************************************************************************/
// main section of the code
/**********************************************************************************************************************************************/
var LCD = require("jsupm_i2clcd");
var upmBuzzer = require("jsupm_buzzer");
var mraa = require('mraa'); //require mraa
var fs = require('fs'); // required to interact with file system on Edison
var webserver = require('./webserver.js');
var date = new Date();  //will this work globally
var accountSid = 'ACa43b0d4eefb2b38f6ca25138d83cd116'; 
var authToken = '24059e1dbad4a64b55e869090ea96ae5'; 
var client = require('twilio')(accountSid,authToken);
var config;
var blocking;

// setup pins on edison
// i2c devices
var theLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62);  // initialize the LCD interface 

// digital in devices
//  currently unconnected pins
var hopperFullDetect = new mraa.Gpio(2);
var hopperMidDetect = new mraa.Gpio(8); 
var hopperLowDetect = new mraa.Gpio(9); 
var lidDetect = new mraa.Gpio(4);
var feedNowButton = new mraa.Gpio(5); 

// set direction on GPIO pins to input
hopperFullDetect.dir(mraa.DIR_IN); 
hopperMidDetect.dir(mraa.DIR_IN); 
hopperLowDetect.dir(mraa.DIR_IN); 
lidDetect.dir(mraa.DIR_IN);
feedNowButton.dir(mraa.DIR_IN); 

// PWM devices 
var motor = new mraa.Pwm(3);

// Buzzer setup
var myBuzzer = new upmBuzzer.Buzzer(6);

var upmBuzzer = require("jsupm_buzzer");
// Initialize on GPIO 5
var myBuzzer = new upmBuzzer.Buzzer(6);
var notes = [];
var playtime = [];
notes.push(upmBuzzer.DO);
playtime.push(250000);
notes.push(upmBuzzer.DO);
playtime.push(250000);
notes.push(upmBuzzer.DO);
playtime.push(250000);
notes.push(upmBuzzer.FA);
playtime.push(500000);
notes.push(upmBuzzer.LA);
playtime.push(250000);
notes.push(upmBuzzer.LA);
playtime.push(250000);
notes.push(upmBuzzer.DO);
playtime.push(250000);
notes.push(upmBuzzer.DO);
playtime.push(250000);
notes.push(upmBuzzer.DO);
playtime.push(250000);

var chordIndex = 0;

// Print sensor name
console.log(myBuzzer.name());
myBuzzer.setVolume(.25);
myBuzzer.stopSound();





// attempt to parse config file, and put the info into the config object
try {
    config = JSON.parse(fs.readFileSync(__dirname + '/public/config.json'));
	console.log('Feeding ' + config.feedingSchedule[0].id + ' is scheduled for ' + config.feedingSchedule[0].time);
	console.log('Feeding ' + config.feedingSchedule[1].id + ' is scheduled for ' + config.feedingSchedule[1].time);
	console.log('Feeding ' + config.feedingSchedule[2].id + ' is scheduled for '+ config.feedingSchedule[2].time);
    console.log(config.smsnumber);
    console.log(date);
} catch (e) {
    console.log(e);
}

try {
    blocking = JSON.parse(fs.readFileSync(__dirname + '/public/blocking.json'));
} catch (e) {
    console.log(e);
}
// whenever there is a change in config.json it will re-parse it into the config object
fs.watchFile(__dirname + '/public/config.json', function(event, filename) {
	console.log('change in config.json detected, reparsing file');
    setTimeout(function(){
	try {
        config = JSON.parse(fs.readFileSync(__dirname + '/public/config.json'));
		console.log('Feeding ' + config.feedingSchedule[0].id + ' is scheduled for ' + config.feedingSchedule[0].time);
		console.log('Feeding ' + config.feedingSchedule[1].id + ' is scheduled for ' + config.feedingSchedule[1].time);
		console.log('Feeding ' + config.feedingSchedule[2].id + ' is scheduled for '+ config.feedingSchedule[2].time);
        console.log('reparsing completed');
    } catch (e) {
        console.log('parsing failed');
		console.log(e);
    }},1000);
});

theLCD.setColor(0,0,200);      // sets LCD color
motor.enable(false);
setInterval(function(){clocky();},1000); //updates the LCD every second
setInterval(function(){feedNow();},400); // Checks to see if the feed now button has been pressed, if so then it does the feeding.
setInterval(function(){periodicActivity();},1000); //calls the periodicActivity function every second
setInterval(function(){HopperMonitor();},2000);

/**********************************************************************************************************************************************/
// melody - Plays soudn on the buzzer
/**********************************************************************************************************************************************/
function melody()
{
    for (chordIndex= 0; chordIndex < notes.length; chordIndex++){
        setTimeout(console.log( myBuzzer.playSound(notes[chordIndex], playtime[chordIndex]) ),250);
    }
   
}

/***********************************************************************************************************************************************/
// hopperMonitor - Monitors status of the hopper and lid updates JSON object if a change is detected
/***********************************************************************************************************************************************/
function HopperMonitor(){

	var fullDetectValue = hopperFullDetect.read();
	var midDetectValue = hopperMidDetect.read();
	var lowDetectValue = hopperLowDetect.read();
    var lidOpen = lidDetect.read();
    
    if (lidOpen == 1 && blocking.lidStatus=="Closed"){
        blocking.lidStatus= "Open";
        setTimeout(function(){
	        try {
                fs.writeFileSync(__dirname + '/public/blocking.json', JSON.stringify(blocking));
                console.log('rewriting completed');
            } catch (e) {
                console.log('writing failed');
                console.log(e);
            }},2000);
    }else if (lidOpen == 0 && blocking.lidStatus=="Open"){
        blocking.lidStatus="Closed";
        setTimeout(function(){
	        try {
                fs.writeFileSync(__dirname + '/public/blocking.json', JSON.stringify(blocking));
                console.log('rewriting completed');
            } catch (e) {
                console.log('writing failed');
                console.log(e);
            }},2000);
    }
    
    // checks the capacitive sensors from Full to Low, returning appropriate value.  If all the sensors == 0 then it returns low.
	if (fullDetectValue == 1){  // might be able to do if (fullDetect)
        if (blocking.hopperStatus!="Full"){
            blocking.hopperStatus="Full";
            setTimeout(function(){
	        try {
                fs.writeFileSync(__dirname + '/public/blocking.json', JSON.stringify(blocking));
                console.log('rewriting completed');
            } catch (e) {
                console.log('writing failed');
                console.log(e);
            }},2000);
            
        }
    } else if (midDetectValue == 1){
        if (blocking.hopperStatus != "Plenty"){
            blocking.hopperStatus="Plenty";
            setTimeout(function(){
	        try {
                fs.writeFileSync(__dirname + '/public/blocking.json', JSON.stringify(blocking));
                console.log('rewriting completed');
            } catch (e) {
                console.log('writing failed');
                console.log(e);
            }},2000);
        }
    } else if (lowDetectValue ==1){
        if (blocking.hopperStatus != "Low"){
            blocking.hopperStatus="Low";
            setTimeout(function(){
	        try {
                fs.writeFileSync(__dirname + '/public/blocking.json', JSON.stringify(blocking));
                console.log('rewriting completed');
            } catch (e) {
                console.log('writing failed');
                console.log(e);
            }},2000);
        }
	} else {
        if (blocking.hopperStatus!="Empty"){
            blocking.hopperStatus="Empty";
            setTimeout(function(){
	        try {
                fs.writeFileSync(__dirname + '/public/blocking.json', JSON.stringify(blocking));
                console.log('rewriting completed');
            } catch (e) {
                console.log('writing failed');
                console.log(e);
            }},2000);
            sendMessage("You just ran out of food");
        }
	}
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
    //console.log(myTimeString);
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
    motor.write(0.064); // sets the motor to go clockwise (0.085 * 20000 = 1700 usec)  set to .065 for counterclockwise and .075 for stop.
    console.log("Starting feeding the dog on " + date2.toLocaleTimeString() ); // debug
    
    var turnMotorOff = function (){   // funky way to allow timing due to asynchronous nature of code
        motor.enable(false); // turn off the system
        console.log("Stopping feeding the dog" + date2.toLocaleTimeString() );
		sendMessage("Fed the dog at " + date2.toLocaleTimeString());
		return;
    };
    
    setTimeout(turnMotorOff, 937 * amount);
    
}


// sendMessage sends a text message via twilio API to defined cell phone.  Message contents are determined by messID integer.
/******************************************************************************************/
function  sendMessage(textToSend)
{
    var accountSid = 'ACa43b0d4eefb2b38f6ca25138d83cd116'; 
    var authToken = '24059e1dbad4a64b55e869090ea96ae5'; 
    var client = require('twilio')(accountSid,authToken);
    console.log("trying to send a message");
    /*
    try {
        config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
    } catch (e) {
        console.log(e);
    }
    */
    console.log(config.smsnumber);
    client.messages.create({
    to: config.smsnumber , 
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


/******************************************************************************/

function periodicActivity() 
{
    var date = new Date();
    var currentTime = date.toLocaleTimeString();
    
    
    if ((currentTime == config.feedingSchedule[0].time && config.feedingSchedule[0].enabled) || (currentTime == config.feedingSchedule[1].time && config.feedingSchedule[1].enabled) || (currentTime == config.feedingSchedule[2].time && config.feedingSchedule[2].enabled)){
        if (lidDetect.read() === 1){
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper lid is open");
        } else if (blocking.hopperStatus === "Empty") {
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper is empty");
        } else {
            console.log("feeding the dog due to schedule ");
            var derp = 0;
            if (config.feedingSchedule[0].time === currentTime){
                derp=0;
            } else if (config.feedingSchedule[1].time === currentTime){
                derp=1;
            } else if (config.feedingSchedule[2].time === currentTime){
                derp=2;
            }
            feedTheAnimal(config.feedingSchedule[derp].amount);
        }

    } 
}
    
  // console.log("lid " + lidDetect.read());
  // console.log("hopper " + HopperMonitor());
  // Checks against feeding schedule.. if it is time to eat, the feeding process is started. 
    
    /*
    if (currentTime == config.feedingSchedule[0].time && config.feedingSchedule[0].enabled){
        if (lidDetect.read() === 1){
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper lid is open");
        } else if (HopperMonitor === 0) {
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper is empty");
        } else {
            console.log("feeding the dog due to schedule " + config.feedingSchedule[0].id);
            feedTheAnimal(config.feedingSchedule[0].amount);
        }
    } else if (currentTime == config.feedingSchedule[1].time && config.feedingSchedule[1].enabled){
        if (lidDetect.read() === 1){
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper lid is open");
            console.log("tried to feed but hopper was open");
        } else if (HopperMonitor === 0) {
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper is empty");
            console.log("tried to feed but hopper was empty");
        } else {
            console.log("feeding the dog due to schedule " + config.feedingSchedule[1].id);
            feedTheAnimal(config.feedingSchedule[1].amount);
        }
    } else if (currentTime == config.feedingSchedule[2].time && config.feedingSchedule[2].enabled){
        if (lidDetect.read() === 1){
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper lid is open");
        } else if (HopperMonitor === 0) {
            sendMessage("Unable to feed your pet at " + currentTime + " because the hopper is empty");
        } else {
            console.log("feeding the dog due to schedule " + config.feedingSchedule[2].id);
            feedTheAnimal(config.feedingSchedule[2].amount);
        }
    }

}*/
/*********************************************************/
function feedNow(){
    var feedNowValue =  feedNowButton.read(); //Checking if feed now button has been press
    if (feedNowValue == 1){ // might be able to go boolean
        console.log("feeding the dog due to feed now button");
        //sendMessage("feed now has been pushed at " + currentTime);  // tells the message server to send the feeding message.
        feedTheAnimal(2); // goes through feeding process
    }
  }