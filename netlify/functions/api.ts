import { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import { app } from '../../server.js';

export const handler: Handler = serverless(app) as unknown as Handler;
