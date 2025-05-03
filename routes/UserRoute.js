const express = require('express');
const { getIdKidney,getAllWebhooks,webHooksToSendMessages } = require('../Controllers/UserController');

const router = express.Router();


router.get('/getIdKidney', getIdKidney);

router.get('/webhook',getAllWebhooks);
router.post('/webhookSendMessages',webHooksToSendMessages);





module.exports = router;