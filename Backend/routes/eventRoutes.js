// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.js'); 
const eventController = require('../controllers/eventController.js');

// Public routes (no authentication required)
router.get('/', eventController.getEvents);
router.get('/search/nearby', eventController.searchNearbyEvents);
router.get('/:id', eventController.getEventById);
router.get('/:id/participants', eventController.getEventParticipants);

// Protected routes (authentication required)
// User specific routes
router.get('/user/created', protect, eventController.getUserCreatedEvents);
router.get('/user/joined', protect, eventController.getUserJoinedEvents);

// Event CRUD operations
router.post('/', protect, eventController.createEvent);
router.put('/:id', protect, eventController.updateEvent);
router.delete('/:id', protect, eventController.deleteEvent);

// Event participation
router.post('/:id/join', protect, eventController.joinEvent);
router.post('/:id/leave', protect, eventController.leaveEvent);

module.exports = router;