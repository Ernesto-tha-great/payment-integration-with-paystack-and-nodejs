const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/online_payment', {useNewUrlParser: true, useUnifiedTopology: true})



module.exports= {mongoose}