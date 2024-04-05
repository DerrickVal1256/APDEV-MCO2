const express = require('express');
const authLogin = require('./login.js');
const authRegister = require ('./register.js');
const adminRouter = express.Router();
const Laboratory = require('../models/laboratories.js');
const User = require('../models/users.js');
const Reservations = require('../models/reservations.js');
const reserve = require('./reservation.js');
const reservations = require('../models/reservations.js');

adminRouter.get('/index', async (req, res) => {
    try {
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
                "reservationData.reservationList.isOccupied": true,
                },
            },
            {
                $project: {
                _id: 0, // Exclude the _id field
                labName: "$name",
                reservation: "$reservationData.reservationList" , // Include only the reservationList field
                },
            },
        ]);

        console.log(reservations);
        
        res.render('adminIndex', { 
            layout:'admin', 
            title: 'Admin Home',
            reservations
        });
    } catch (error) {
        console.log(error);
    }
});

adminRouter.get('/ReservationAdminView', async (req, resp) => {
    const user = await User.findById(req.session.userId).lean();
    resp.render('ReservationAdminView', {
        layout: 'reservationadmin',
        title: 'Admin Reservation',
        user
    });
})





module.exports = adminRouter;