const path = require('path');
const express = require('express');
const { sessionMiddleware } = require('./session');
const apiRoutes = require('./routes');

const app = express();

app.use(express.json());
app.use(sessionMiddleware);
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', 'public')));

module.exports = app;
