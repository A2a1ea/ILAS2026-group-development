# OpenAI Security Notes

This repository currently contains a static browser game. It does not call the OpenAI API from browser code.

OpenAI's API authentication documentation states that API keys are secrets and should not be exposed in client-side code such as browsers or apps. If this project later adds an OpenAI-backed feature, add a small server endpoint and load `OPENAI_API_KEY` from a server-side environment variable or key management service.

Reference: https://developers.openai.com/api/reference/overview#authentication
