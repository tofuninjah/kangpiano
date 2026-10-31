import { beforeEach, describe, expect, it, vi } from 'vitest';

const { send, Resend } = vi.hoisted(() => {
  const send = vi.fn();
  const Resend = vi.fn(function (this: unknown) {
    return { emails: { send } };
  });
  return { send, Resend };
});
vi.mock('resend', () => ({ Resend }));

import {
  buildEmail,
  EmailNotConfiguredError,
  resendSender,
} from '../src/lib/contact-email';

const request = {
  name: 'Test Parent',
  contact: 'parent@example.com',
  age: '',
  town: 'Mililani',
  message: '',
};

const env = {
  RESEND_API_KEY: 'test-key',
  CONTACT_FORM_TO_EMAIL: 'teacher@example.com',
  CONTACT_FORM_FROM_EMAIL: 'Website <form@example.com>',
};

beforeEach(() => {
  send.mockReset();
  Resend.mockClear();
});

describe('buildEmail', () => {
  it('writes a one-line subject and a plain-text summary', () => {
    const email = buildEmail(request);
    expect(email.subject).toBe('Lesson request from Test Parent');
    expect(email.text).toContain('Phone or email: parent@example.com');
    expect(email.text).toContain('Student’s age: (not given)');
    expect(email.text).toContain('Town: Mililani');
    expect(email.text).toContain('(none)');
  });

  it('replies to the visitor only when they gave an email', () => {
    expect(buildEmail(request).replyTo).toBe('parent@example.com');
    expect(
      buildEmail({ ...request, contact: '(808) 371-0708' }).replyTo
    ).toBeUndefined();
  });
});

describe('resendSender', () => {
  it('sends with From and To from the environment, never the request', async () => {
    send.mockResolvedValue({ data: { id: '1' }, error: null });
    await resendSender(() => env)(buildEmail(request));

    expect(Resend).toHaveBeenCalledWith('test-key');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      from: 'Website <form@example.com>',
      to: 'teacher@example.com',
      subject: 'Lesson request from Test Parent',
      text: expect.stringContaining('Name: Test Parent'),
      replyTo: 'parent@example.com',
    });
  });

  it('omits Reply-To for phone contacts', async () => {
    send.mockResolvedValue({ data: { id: '1' }, error: null });
    await resendSender(() => env)(
      buildEmail({ ...request, contact: '808-371-0708' })
    );
    expect(send.mock.calls[0]![0]).not.toHaveProperty('replyTo');
  });

  it('fails closed when any setting is missing', async () => {
    for (const key of Object.keys(env)) {
      const partial = { ...env, [key]: undefined };
      await expect(
        resendSender(() => partial)(buildEmail(request))
      ).rejects.toBeInstanceOf(EmailNotConfiguredError);
    }
    expect(send).not.toHaveBeenCalled();
  });

  it('reads process.env at send time by default', async () => {
    send.mockResolvedValue({ data: { id: '1' }, error: null });
    const sender = resendSender();
    vi.stubEnv('RESEND_API_KEY', 'later-key');
    vi.stubEnv('CONTACT_FORM_TO_EMAIL', 'teacher@example.com');
    vi.stubEnv('CONTACT_FORM_FROM_EMAIL', 'form@example.com');
    try {
      await sender(buildEmail(request));
      expect(Resend).toHaveBeenCalledWith('later-key');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('turns a Resend error into a thrown error without form contents', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `from` field' },
    });
    await expect(resendSender(() => env)(buildEmail(request))).rejects.toThrow(
      'Resend rejected the email: validation_error'
    );
  });
});
