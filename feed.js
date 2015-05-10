/*  Goes through the dog feeding process.  Will accept amount, which will determine how long the motor moves.. not implimented yet  */


exports.feedTheDog = function (amount) // Drives the motor, amount of time is based off of amount of food to be moved.  Will need to measure half cup.
{
    var date2 = new Date(); // setup date
    var mumraa = require("mraa"); // require mraa
    var message = require('./messager.js');
    var motor = new mumraa.Pwm(5);
    motor.enable(true);  // enables PWM for motor
    motor.period_ms(20); // 20 ms period
    motor.write(0.085); // sets the motor to go clockwise (0.085 * 20000 = 1700 usec)  set to .065 for counterclockwise and .075 for stop.
    console.log("Starting feeding the dog on " + date2.toLocaleTimeString() ); // debug
    message.sendMessage(1);

    var callback = function (){   // funky way to allow timing due to asynchronous nature of code
        motor.enable(false); // turn off the system
        console.log("Stopping feeding the dog on " + date2.toLocaleTimeString() ); // debug to make sure that the feeding is going the right amount of time.
    };
    
    setTimeout(callback, 1000 * amount);
    
};
