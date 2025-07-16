const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const port = process.env.API_PORT || 3003;

app.use(cors());
app.use(express.json());
app.use('/', routes);

app.listen(port, () => {
  console.log(`🚀 API HTTP escuchando en puerto ${port}`);
});
