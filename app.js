const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const session = require("express-session");
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');

app.use(session({
    secret: 'secretpo',
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({
       mongoUrl: 'mongodb+srv://mattmongodb:mattmongodb@cluster0.awy4yvt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/test',
       collectionName: 'sessions'
    })
   }));

const bodyParser = require('body-parser');
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

const handlebars = require('express-handlebars');
app.use(express.static(path.join(__dirname, 'views')));
app.set("views", __dirname + "/views");
app.set('view engine', 'hbs');
app.engine('hbs', handlebars.engine({
    extname: 'hbs',
}));

const port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log('Listening at port ' + port);
});

// Serve static files from the 'public' directory
uri = "mongodb+srv://mattmongodb:mattmongodb@cluster0.awy4yvt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(uri)
.then((result) => {
        console.log('Connected to database!');
    })
    .catch((err) => console.log(err));

// Routers
const indexRouter = require('./controllers/index.js');
const adminRouter = require('./controllers/adminRouter.js');
const samples = require('./models/sampleData.js');
//samples.createSampleUsers();
// samples.createSampleLabs();
app.use('/', indexRouter);
app.use('/admin', adminRouter);
