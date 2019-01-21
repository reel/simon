const handleLanguage = data => {
  if (data.error !== null) {
    console.error('ERROR: ', data.error);
    return;
  }
  if (data.results.length > 0) {
    if (data.results.length === 1 && data.results[0].stability < 0.2) {
      return null;
    }
    const response = data.results.map(val => {
      if (val.alternatives) {
        console.log(val.stability);
        return {
          text: val.alternatives[0].transcript,
          color: val.stability > 0.2 ? 'black' : 'grey',
        };
      }
    });
    return response;
  }
};
const tester = () => {
  data = {
    results: [
      {
        alternatives: [{ words: [], transcript: ' ça va', confidence: 0 }],
        isFinal: false,
        stability: 0.009999999776482582,
      },
    ],
    error: null,
    speechEventType: 'SPEECH_EVENT_UNSPECIFIED',
  };
  console.log('text', handleLanguage(data));
};
tester();
