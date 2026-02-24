// controllers/eventController.js
const Event = require('../models/Event');
const User = require('../models/User');
const calendarService = require('../services/calenderService');
const notificationService = require('../services/notificationService');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private
const createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user.id,
      currentParticipants: 1,
      participants: [{
        user: req.user.id,
        joinedAt: new Date(),
        status: 'confirmed'
      }]
    };

    const event = new Event(eventData);
    await event.save();

    // Add to creator's calendar if they have calendar connected
    if (req.user.calendarConnected) {
      try {
        const calendarEventId = await calendarService.addToGoogleCalendar(event, req.user);
        event.calendarEventId = calendarEventId;
        await event.save();
      } catch (calendarError) {
        console.error('Calendar sync error:', calendarError);
        // Continue even if calendar sync fails
      }
    }

    // Schedule reminders
    if (event.reminders) {
      await notificationService.scheduleEventReminders(event);
    }

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all events with filters
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      eventType,
      startDate,
      endDate,
      city,
      status
    } = req.query;

    const query = {};

    if (eventType) query.eventType = eventType;
    if (status) query.status = status;
    if (city) query['location.city'] = city;
    
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email avatar bio')
      .populate('participants.user', 'name email avatar bio');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Join an event
// @route   POST /api/events/:id/join
// @access  Private
const joinEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if user already joined
    const alreadyJoined = event.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        error: 'Already joined this event'
      });
    }

    // Check if event is full
    const isFull = event.currentParticipants >= event.maxParticipants;
    const status = isFull ? 'waitlist' : 'confirmed';

    // Add participant
    event.participants.push({
      user: req.user.id,
      joinedAt: new Date(),
      status
    });

    if (!isFull) {
      event.currentParticipants += 1;
    }

    await event.save();

    // Add to user's calendar if they have calendar connected
    if (req.user.calendarConnected && status === 'confirmed') {
      try {
        await calendarService.addToGoogleCalendar(event, req.user);
      } catch (calendarError) {
        console.error('Calendar sync error:', calendarError);
      }
    }

    // Send confirmation email
    await notificationService.sendJoinConfirmation(event, req.user, status);

    res.json({
      success: true,
      data: {
        event,
        participationStatus: status
      },
      message: isFull ? 'Added to waitlist' : 'Successfully joined event'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Leave an event
// @route   POST /api/events/:id/leave
// @access  Private
const leaveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if user is a participant
    const participantIndex = event.participants.findIndex(
      p => p.user.toString() === req.user.id
    );

    if (participantIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'You are not a participant of this event'
      });
    }

    // Remove participant
    const removedParticipant = event.participants[participantIndex];
    event.participants.splice(participantIndex, 1);
    
    if (removedParticipant.status === 'confirmed') {
      event.currentParticipants -= 1;
      
      // Promote first waitlisted user if any
      const waitlistedUser = event.participants.find(p => p.status === 'waitlist');
      if (waitlistedUser) {
        waitlistedUser.status = 'confirmed';
        event.currentParticipants += 1;
      }
    }

    await event.save();

    // Remove from calendar if needed
    if (req.user.calendarConnected && event.calendarEventId) {
      try {
        await calendarService.removeFromGoogleCalendar(event.calendarEventId, req.user);
      } catch (calendarError) {
        console.error('Calendar removal error:', calendarError);
      }
    }

    res.json({
      success: true,
      message: 'Successfully left the event'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get event participants
// @route   GET /api/events/:id/participants
// @access  Public
const getEventParticipants = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants.user', 'name email avatar bio joinedAt');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const participants = {
      confirmed: event.participants
        .filter(p => p.status === 'confirmed')
        .map(p => ({
          ...p.user.toObject(),
          joinedAt: p.joinedAt
        })),
      waitlist: event.participants
        .filter(p => p.status === 'waitlist')
        .map(p => ({
          ...p.user.toObject(),
          joinedAt: p.joinedAt
        })),
      total: event.participants.length,
      maxParticipants: event.maxParticipants,
      availableSpots: event.maxParticipants - event.currentParticipants
    };

    res.json({
      success: true,
      data: participants
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (Event creator only)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if user is the creator
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this event'
      });
    }

    // Update fields
    const updatableFields = [
      'title', 'description', 'eventType', 'startDate', 'endDate',
      'location', 'maxParticipants', 'tags', 'images', 'status'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    // Update calendar if needed
    if (req.user.calendarConnected && event.calendarEventId) {
      try {
        await calendarService.updateGoogleCalendarEvent(event, req.user, event.calendarEventId);
      } catch (calendarError) {
        console.error('Calendar update error:', calendarError);
      }
    }

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (Event creator or admin)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if user is creator or admin
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this event'
      });
    }

    // Remove from calendars of all participants
    if (event.calendarEventId) {
      const participants = await User.find({
        '_id': { $in: event.participants.map(p => p.user) },
        calendarConnected: true
      });

      for (const participant of participants) {
        try {
          await calendarService.removeFromGoogleCalendar(event.calendarEventId, participant);
        } catch (error) {
          console.error(`Failed to remove calendar for user ${participant._id}:`, error);
        }
      }
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get events created by current user
// @route   GET /api/events/user/created
// @access  Private
const getUserCreatedEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get events joined by current user
// @route   GET /api/events/user/joined
// @access  Private
const getUserJoinedEvents = async (req, res) => {
  try {
    const events = await Event.find({
      'participants.user': req.user.id
    })
    .populate('createdBy', 'name email avatar')
    .sort({ startDate: 1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Search events by location
// @route   GET /api/events/search/nearby
// @access  Public
const searchNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    // Find events within radius (in kilometers)
    const events = await Event.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000
        }
      },
      status: 'upcoming'
    }).populate('createdBy', 'name email avatar');

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  joinEvent,
  leaveEvent,
  getEventParticipants,
  updateEvent,
  deleteEvent,
  getUserCreatedEvents,
  getUserJoinedEvents,
  searchNearbyEvents
};