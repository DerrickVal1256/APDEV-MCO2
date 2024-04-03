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
        const laboratories = await Laboratory.find({}).lean();
        res.render('main', { 
            layout:'index', 
            title: 'Home',
            laboratories, user });
    } catch (error) {
        errorFn(error);
    }
});

router.post('/home', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean(); 
        const laboratories = await Laboratory.find({}).lean();
        res.render('main', { 
            layout:'index', 
            title: 'Home',
            laboratories, user });
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

    let labDetails = [];

    let reqReservationList = await Laboratory.aggregate([{ $match: { name: reqLabName, },},{ $unwind: "$reservationData", }, { $unwind: "$reservationData.reservationList", }, 
    { $match: { "reservationData.reservationList.date": selectedDate, "reservationData.reservationList.time": selectedTime }, }, 
    { $project: { _id: 0, reservation: "$reservationData.reservationList", }, }, ]);

    if(reqReservationList.length == 0) { // this if statement makes sure that what details is passed to the hbs is complete and not empty
        await labsController.checkExistingReservationList(reqReservationList, reqLabName, selectedDate, selectedTime);
        reqReservationList = await Laboratory.aggregate([{ $match: { name: reqLabName, },},{ $unwind: "$reservationData", }, { $unwind: "$reservationData.reservationList", }, 
                                                         { $match: { "reservationData.reservationList.date": selectedDate, "reservationData.reservationList.time": selectedTime }, }, 
                                                         { $project: { _id: 0, reservation: "$reservationData.reservationList", }, }, ] );
    }

    labDetails = await Laboratory.aggregate([
        { $match: { name: reqLabName } },
        { $unwind: "$reservationData" },
        { $unwind: "$reservationData.reservationList" },
        { $match: { "reservationData.reservationList.date": selectedDate, "reservationData.reservationList.time": selectedTime } },
        { $project: { _id: 0, "usage": "$reservationData.usage", "capacity": "$capacity", "status": "$reservationData.status" } },
        { $limit: 1 }
    ]);


    labDetails = await reserve.updateDetails(labDetails);

    console.log(labDetails); // remove soon

    
    const user = await User.findById(userId).lean();
    const reserveDates = await reserve.getNextFiveWeekdays();
    req.session.selectedLabName = reqLabName;  // set lab name to current session; global variable
    try {


        res.render('Reservation', {
            layout: 'reservation',
            title: 'Reservation',
            user, // pass the user's details to the template
            reserveDate: reserveDates,
            labName: reqLabName,
            labDetails,
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

        // reserve.createReservation(userId, SlotID, reqLabName, selectedDate, selectedTime);
        try {
            // const reservation = await Laboratory.reservationData.findOne({"reservationList.SlotID" : SlotID}, {"reservationList.date" : selectedDate});
            // console.log(reservation);

            // Find the reservation list that contains the reservation with the specified date and time
            // Assuming you want to update the first reservation that matches the SlotID, date, and time
            const updatedDocument = await Laboratory.findOneAndUpdate(
                { 
                    name: reqLabName,
                }, 
                { 
                    $set: {
                        "reservationData.$[].reservationList.$[reservation].UserID": user.id,
                        "reservationData.$[].reservationList.$[reservation].isOccupied": true,
                    },
                },
                { 
                    arrayFilters: [
                        { "reservation.SlotID": SlotID, "reservation.date": selectedDate, "reservation.time": selectedTime, "reservation.isOccupied": false },
                    ],
                    new: true, // This option returns the updated document
                }
            );
            await Laboratory.findOneAndUpdate(
                { 
                    name: reqLabName,
                    "reservationData.reservationList.date": selectedDate, 
                    "reservationData.reservationList.time": selectedTime,
                }, 
                { 
                    $inc: {
                        "reservationData.$.usage": 1
                    }
                },
                { 
                    new: true, // This option returns the updated document
                }
            );
    
            // console.log(updatedDocument.reservationData); // remove soon
        } catch(error) {console.log(error);}


    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing reservation.');
    }
});

module.exports = router;