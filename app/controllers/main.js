module.exports = {
  abc: (req, res) => {
    const { io } = henri;
    io.on('boo', data => {
      console.log(data);
    });
    console.log('registered');
    res.send('ok');
  },
};
