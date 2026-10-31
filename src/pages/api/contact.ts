import type { APIRoute } from 'astro';
import { CONTACT_RATE_LIMIT } from '../../lib/contact';
import { resendSender } from '../../lib/contact-email';
import { handleContact } from '../../lib/contact-handler';
import { createRateLimiter } from '../../lib/rate-limit';

// The only on-demand route; every page is prerendered.
export const prerender = false;

const limiter = createRateLimiter(CONTACT_RATE_LIMIT);
const send = resendSender();

export const POST: APIRoute = ({ request, clientAddress }) =>
  handleContact(request, clientAddress, {
    send,
    limiter,
    log: (message) => console.error(message),
  });
