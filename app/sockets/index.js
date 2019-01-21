const ss = require('socket.io-stream');
const fs = require('fs');
const util = require('util');
const speech = require('@google-cloud/speech');
var SnappyJS = require('snappyjs');
process.on('uncaughtException', function(err) {
  console.error(new Date().toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
});
module.exports = socket => {
  let count = 1;
  let sending = false;
  let compress = false;
  const client = new speech.SpeechClient({
    keyFilename: 'ketfile.json',
  });
  let recognizeStream;
  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 48000,
      languageCode: 'fr-CA',
    },
    interimResults: true, // If you want interim results, set this to true
  };

  socket.on('status', data => {
    if (data === 'start') {
      //fs.unlinkSync('boos.ogg');
      console.log('starting');
      sending = true;
      try {
        recognizeStream = client
          .streamingRecognize(request)
          .on('error', e => console.log('ash', e))
          .on('data', dat => {
            handleLanguage(dat);
          });
      } catch (e) {
        console.log('2 error in streaming recognize');
        console.log('error', e);
      }
      return;
    }
    if (data === 'stop') {
      console.log('stopping');
      // recognizeStream.write(null);
      recognizeStream && recognizeStream.destroy();
      sending = false;
    }
  });

  socket.on('disconnect', reason => {
    console.log('disconnected');
    recognizeStream && recognizeStream.destroy();
    sending = false;
  });

  socket.on('message', data => {
    if (!sending) {
      return;
    }
    // console.log('msg', data);
    const deflated = compress ? SnappyJS.uncompress(data) : data;
    recognizeStream.write(deflated.toString('base64'));
  });
  const handleLanguage = data => {
    try {
      if (data.error && data.error !== null) {
        henri.log.error('ERROR: ', data.error);
        return null;
      }
      if (data.results && data.results.length > 0) {
        if (
          false &&
          data.results.length === 1 &&
          (data.results[0].stability < 0.2 ||
            data.results[0].alternatives[0].confidence < 0.2)
        ) {
          henri.log.warn('skipping', data.results);
          return null;
        }
        const response = data.results.map(val => {
          if (val.alternatives) {
            console.log(val.stability, val.alternatives[0].confidence);
            return {
              text: val.alternatives[0].transcript,
              color:
                val.stability > 0.2 || val.alternatives[0].confidence > 0.2
                  ? 'black'
                  : 'lightgrey',
            };
          }
        });
        socket.emit('answers', response);
        henri.log.info('sending ' + util.inspect(response));
      } else {
        console.log('data.results is missing?', data, data);
      }
    } catch (e) {
      console.log('==========================================');
      console.log('error in handle language with data:');
      console.log(data);
      console.log('error', e);
      console.log('==========================================');
    }
  };
};
