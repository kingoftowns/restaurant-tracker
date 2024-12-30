const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// Get all restaurants
router.get('/', async (req, res) => {
    try {
        const restaurants = await Restaurant.find().sort('-date');
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new restaurant
router.post('/', async (req, res) => {
    const restaurant = new Restaurant({
        name: req.body.name,
        location: req.body.location,
        dish: req.body.dish,
        rating: req.body.rating,
        date: req.body.date
    });

    try {
        const newRestaurant = await restaurant.save();
        res.status(201).json(newRestaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;