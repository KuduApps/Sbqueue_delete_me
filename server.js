var http = require('http');
var port = process.env.port || 1337;
var azure = require('azure');
var fs = require('fs');
var serviceBusService = azure.createServiceBusService();
var queueName = 'taskqueue1';
var queueName2 = 'taskqueue2';

var queueOptions = {
      LockDuration: 'PT45S',
      MaxSizeInMegabytes: '2048',
      RequiresDuplicateDetection: false,
      RequiresSession: false,
      DefaultMessageTimeToLive: 'PT5S',
      DeadLetteringOnMessageExpiration: true,
      DuplicateDetectionHistoryTimeWindow: 'PT55S'
    };

var message1 = 'hello there';
var message2 = 'hello again';
  
http.createServer(
  function (req, res) {
    setUp();
    function setUp() {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      serviceBusService.createQueueIfNotExists(queueName, queueOptions, 
        function( error, created) {
          if (error === null) {
            res.write('Using queue 1 ' + queueName + '\r\n');
            serviceBusService.createQueueIfNotExists(queueName2, queueOptions, 
              function( error2, created) {
                if ( error2 === null) {
                  res.write("Using queue 2 " + queueName2 + '\r\n');
                  serviceBusService.listQueues(handleQueueList);
                }
                else {
                  res.end("Unable to create queue 2, error: " + error2);
                }
              });
          }
          else {
            res.end("Unable to create queue 1, error: " + error);
          }
        });
    }

    function handleQueueList(error, queueList) { 
      res.write("Listing queues\r\n");
      if (error === null) {
       var queueCount = 0;
       for (var queue in queueList) {
         var theQueue = queueList[queue];
         if (theQueue.QueueName === queueName) {
           queueCount +=1;
         }
         else if (theQueue.QueueName === queueName2) {
           queueCount+=2;
         }
         res.write("Found queue " + theQueue.QueueName + "\r\n");
       }
       if (queueCount == 3) {
         res.write("List test succeeded\r\n");
         serviceBusService.sendQueueMessage(queueName, message1, function(sendError) {
           if (sendError === null) {
             res.write("Sent first message successfully\r\n");
             serviceBusService.sendQueueMessage(queueName, message2, receiveMessages);
           }
           else {
             res.end("Could not send messages, error: " + error);
           }
         });
       }
       else {
         res.end("List test failed\r\n");
       }
      } 
      else 
      { 
       res.end('Error listing queues: ' + error + '\r\n'); 
      } 
    } 

    function receiveMessages(error) { 
      if(error === null) { 
        res.write("Successfully inserted messages into queue\r\n"); 
        serviceBusService.receiveQueueMessage(queueName, function( receiveError, receivedMessage) {
          if (receiveError === null) {
            if (receivedMessage.messagetext === message1) {
              res.write("Received first message \r\n");
              serviceBusService.receiveQueueMessage(queueName, function( receiveError2, receivedMessage2) {
                if (receiveError2 === null) {
                  if (receivedMessage2.messagetext === message2) {
                    res.write("received second message \r\n");
                    cleanupQueues();
                  }
                  else {
                    res.end("Second message did not match, received: " + receivedMessage2.messagetext + ", expecting " + message2 + "\r\n");
                  }
                }
                else {
                  res.end("error receiving second message " + receiveError2 + "\r\n");
                }
              })
            }
            else {
              res.end("First received message did not match, received: " + received.messagetext + ", expecting: " + message1 + "\r\n");
            }
          }
          else {
            res.end("error receiving first message " + receiveError + "\r\n");
          }
          
        });

      } 
      else 
      { 
        res.end('Could not insert message into queue: ' + error); 
      }
    }

    function cleanupQueues() {
      serviceBusService.deleteQueue(queueName, function(error, response) {
        if (error === null) {
          res.write("Successfully deleted first queue\r\n");
          serviceBusService.deleteQueue(queueName2, function(error2, response2) {
            if (error2 === null) {
              res.end("Queue deleted, test passed!\r\n");
            }
            else {
              res.end("Deleting final queue failed with error: " + error2 + "\r\n");
            }
          });
        }
        else {
          res.end("First queue deletion failes with error: " + error + "\r\n");
        }
      });
      
    } 
  }
).listen(port);