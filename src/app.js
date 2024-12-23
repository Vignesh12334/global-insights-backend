import express from "express";
import cors from 'cors';
import insightsRouter from './routes/insights.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/insights', insightsRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default app;
