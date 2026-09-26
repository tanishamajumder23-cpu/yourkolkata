// Vercel serverless entry point.
//
// Vercel turns any file under /api into a serverless function. This catch-all
// ([...path]) receives every /api/* request and hands it to the same Express
// app used locally — so there's one codebase, no duplicated route logic.
import app from '../backend/src/app.js';

export default app;
