exports.sendMessage = function (messID)
{
    var fs = require('fs');
    var accountSid = 'ACa43b0d4eefb2b38f6ca25138d83cd116'; 
    var authToken = '24059e1dbad4a64b55e869090ea96ae5'; 
    var client = require('twilio')(accountSid,authToken);
    var texttosend = '';
    
    
    try {
        config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
    } catch (e) {
        console.log(e);
    }
    
    if (messID == 1)
    {
        client.messages.create({
        to: "5037083261" , //config.user.smsnum,
        from: "+19713402146",
        body: "I fed the dawg ... dawg"// + config.user.name ,
        }, function(error, message){  //if there was a problem it states the error 
                if(!error){
                    console.log("Message sent at " + message.dateCreated);
                } else {
                    console.log("Message wasn't sent...");
			}
		});
    } else if (messID == 2){
          client.messages.create({
        to:"5037083261",
        from: "+19713402146",
        body: "You are almost out of dog food, dawg" ,
        }, function(error, message){  //if there was a problem it states the error 
                if(!error){
                    console.log("Message sent at " + message.dateCreated);
                } else {
                    console.log("Message wasn't sent...");
			}
		});
    } else {
         client.messages.create({
        to:"5037083261",
        from: "+19713402146",
        body: "Broken" ,
        }, function(error, message){  //if there was a problem it states the error 
                if(!error){
                    console.log("Message sent at " + message.dateCreated);
                } else {
                    console.log("Message wasn't sent...");
			}
		});
    }
};