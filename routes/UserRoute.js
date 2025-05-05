const express = require('express');
const { getIdKidney,getAllWebhooks,webHooksToSendMessages } = require('../Controllers/UserController');

const router = express.Router();


router.get('/getIdKidney', getIdKidney);

router.get('/webhook',getAllWebhooks);
router.post('/webhook',webHooksToSendMessages);





module.exports = router;