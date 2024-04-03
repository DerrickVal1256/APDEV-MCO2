const express = require('express');
const authLogin = require('./login.js');
const authRegister = require ('./register.js');
const router = express.Router();
const Laboratory = require('../models/laboratories.js');
const User = require('../models/users.js');
const Reservations = require('../models/reservations.js');
const reserve = require('./reservation.js');
const reservations = require('../models/reservations.js');
const labsController = require('./laboratory.js');

function errorFn(error) {
    console.error(error);
    // error.status(500).send('Server Error');
}

router.get('/', function(req, resp){
    resp.render('LoginPage',{
        layout: 'login',
        title: 'Lab Reservation'
    });
});

router.post('/login', function (req,resp) {
    authLogin.handleLogin(req, resp);
});

router.post('/register', function (req,resp){
    authRegister.handleRegistration(req, resp);
});

router.get('/reservation', async (req,resp) =>{
    const user = await User.findById(req.session.userId).lean();
    const labs = await Laboratory.find({}).lean();
    const reserveDates = await reserve.getNextFiveWeekdays();

    resp.render('Reservation', {
        layout: 'reservation',
        title: 'Reservations',
        user,
        labs,
        reserveDate: reserveDates
    });
});

router.get('/helpdesk', async (req,resp) => {
    const user = await User.findById(req.session.userId).lean();
    resp.render('helpdesk',{
        layout: 'helpdesk',
        title: 'Helpdesk',
        user,
    });
});


router.get('/home', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean(); 
        // const reservations = await Laboratory.find({}).lean();
        let reservations =  await Laboratory.aggregate([
            {
                $unwind: "$reservationData", // Deconstruct the reservationData array
            },
            {
                $unwind: "$reservationData.reservationList", // Deconstruct the reservationList array
            },
            {
                $match: {
                "reservationData.reservationList.UserID": user.id,
                },
            },
            {
                $project: {
                _id: 0, // Exclude the _id field
                labName: "name",
                reservation: "$reservationData.reservationList" , // Include only the reservationList field
                },
            },
        ]);

        console.log(reservations);
        
        res.render('main', { 
            layout:'index', 
            title: 'Home',
            reservations, user });
    } catch (error) {
        errorFn(error);
    }
});

router.post('/home', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean(); 
        // const reservations = await Laboratory.find({}).lean();
        let reservations =  await Laboratory.aggregate([
            {
                $unwind: "$reservationData", // Deconstruct the reservationData array
            },
            {
                $unwind: "$reservationData.reservationList", // Deconstruct the reservationList array
            },
            {
                $match: {
                "reservationData.reservationList.UserID": user.id,
                },
            },
            {
                $project: {
                _id: 0, // Exclude the _id field
                reservation: "$reservationData.reservationList" , // Include only the reservationList field
                },
            },
        ]);

        res.render('main', { 
            layout:'index', 
            title: 'Home',
            reservations, user });
    } catch (error) {
        errorFn(error);
    }
});

router.get('/Profile', async (req,resp) =>{
    const user = await User.findById(req.session.userId).lean();
    resp.render('Profile',{
    layout: 'profile',
    title: 'Profile',
    user
    });
});

router.get('/EditProfile', async (req,resp) =>{
    const user = await User.findById(req.session.userId).lean();
   
    resp.render('EditProfile',{
        layout: 'editprofile',
        title: 'Edit Profile',
        user,
    });
});

router.post('/Profile', async (req,resp) =>{
    const user = await User.findById(req.session.userId).lean();
    resp.render('Profile',{
    layout: 'profile',
    title: 'Profile',
    user
    });
});

router.post('/updateProfile', async (req, resp) => {
    const user = await User.findById(req.session.userId).lean();
    const { fname, lname, id, email, description1 } = req.body;
    const userId = user._id;
    try {
        const updatedUser = await User.findOneAndUpdate(
            { _id: userId },
            { fname, lname, id, email, description1 },
            { new: true } 
        );
        resp.redirect(`/Profile`); // Redirect back to the profile page
    } catch (error) {
        errorFn(error);
    }
});

router.get('/LoginPage', function(req, resp){
    resp.redirect('/');
});

router.post('/selectlab', async (req, res) => {
    const userId = req.session.userId;
    const reqLabName = req.body.labName;
    const selectedDate = req.body.selectedDate;
    const selectedTime = req.body.time;

    req.session.date = selectedDate;
    req.session.time = selectedTime;

    console.log(req.body); // remove soon 
    console.log("LAB: ", reqLabName); // remove soon
    console.log("DATE: ", selectedDate); // remove soon
    console.log("TIME: ", selectedTime); // remove soon

    let reqReservationList =  await Laboratory.aggregate([{
        $match: {
          name: reqLabName, // Assuming you're looking for documents with name "Lab 1"
        },
        },
        {
            $unwind: "$reservationData", // Deconstruct the reservationData array
        },
        {
            $unwind: "$reservationData.reservationList", // Deconstruct the reservationList array
        },
        {
            $match: {
            "reservationData.reservationList.date": selectedDate,
            "reservationData.reservationList.time": selectedTime
            },
        },
        {
            $project: {
            _id: 0, // Exclude the _id field
            reservation: "$reservationData.reservationList" , // Include only the reservationList field
            },
        },
    ]);
    // reqReservationList.forEach(item => {
    //     console.log(item);
    // })
    
    const user = await User.findById(userId).lean();
    const reserveDates = await reserve.getNextFiveWeekdays();
    req.session.selectedLabName = reqLabName;  // set lab name to current session; global variable
    try {
        reqReservationList = await labsController.checkExistingReservationList(reqReservationList, reqLabName, selectedDate, selectedTime);

        // need to add a way to update the status of the lab itself for that specific date and time
        const usage = await reserve.availableCapacity(reqReservationList);
        let labDetails = await Laboratory.findOne({name : reqLabName}).lean();
        labDetails = await reserve.updateDetails(labDetails, usage);

        res.render('Reservation', {
            layout: 'reservation',
            title: 'Reservation',
            user, // pass the user's details to the template
            reserveDate: reserveDates,
            labDetails,
            usage,
            reqReservationList, // Pass the selected lab's details to the template
            labs: await Laboratory.find({}).lean(), // Pass the list of labs again for the dropdown
            date: selectedDate,
            time: selectedTime
        });
    } catch(error) { errorFn(error);}
});

router.post('/404', async (req, resp) => {
    const user = await User.findById(req.session.userId).lean();
    resp.render('404', {
        layout: 'editprofile',
        title: '404',
        user
    });
});

router.get('/404', async (req, resp) => {
    const user = await User.findById(req.session.userId).lean();
    resp.render('404', {
        layout: 'editprofile',
        title: '404',
        user
    });
});

router.post('/reserve', async (req, resp) => {
    const user = await User.findById(req.session.userId).lean();
    const SlotID = req.body.SlotID;
    console.log(req.body);
    resp.render('confirm-reservation', { 
        layout: 'reservation',
        SlotID, 
        user,
    });
});

router.post('/confirm-reservation', async (req, res) => {
    const SlotID = req.body.SlotID;
    const userId = req.session.userId;
    const reqLabName = req.session.selectedLabName;
    const selectedDate = req.session.date;
    const selectedTime = req.session.time;
    const user = await User.findById(userId).lean();
    const labs = await Laboratory.find({}).lean();
    const reserveDates = await reserve.getNextFiveWeekdays();
    
    try {
        res.render('Reservation', {
            layout: 'reservation',
            title: 'Reservations',
            user,
            labs,
            reserveDate: reserveDates
        });

        reserve.createReservation(userId, SlotID, reqLabName, selectedDate, selectedTime);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing reservation.');
    }
});

module.exports = router;