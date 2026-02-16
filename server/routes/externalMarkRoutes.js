const express = require('express');
const router = express.Router();
const externalMarkController = require('../controllers/externalMarkController');
const { verifyToken, isExternalStaff } = require('../middleware/authMiddleware');

router.get('/assignment/:assignmentId', verifyToken, isExternalStaff, externalMarkController.getAssignedDummyList);
router.post('/submit', verifyToken, isExternalStaff, externalMarkController.submitMarks);

module.exports = router;
