import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeMsg91OtpWidget,
  retryMsg91Otp,
  sendMsg91Otp,
  verifyMsg91Otp,
} from './msg91OtpWidget';

describe('MSG91 OTP Widget browser flow', () => {
  let browser: {
    initSendOTP: ReturnType<typeof vi.fn>;
    getWidgetData: ReturnType<typeof vi.fn>;
    isCaptchaVerified: ReturnType<typeof vi.fn>;
    sendOtp: ReturnType<typeof vi.fn>;
    retryOtp: ReturnType<typeof vi.fn>;
    verifyOtp: ReturnType<typeof vi.fn>;
    destroyOTPWidget: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    browser = {
      initSendOTP: vi.fn(() => ({ instanceId: 'widget-instance' })),
      getWidgetData: vi.fn(() => ({
        captchaValidations: true,
        widgetMeta: { captcha_type: 3 },
      })),
      isCaptchaVerified: vi.fn(() => true),
      sendOtp: vi.fn((_identifier, success) => success({ type: 'success', message: 'widget-request-id' })),
      retryOtp: vi.fn((_channel, success) => success({ type: 'success' })),
      verifyOtp: vi.fn((_otp, success) => success({ type: 'success', message: 'verified-access-token' })),
      destroyOTPWidget: vi.fn(),
    };
    vi.stubGlobal('window', browser);
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
      createElement: vi.fn(),
      head: { appendChild: vi.fn() },
      getElementById: vi.fn(() => ({ childElementCount: 1 })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes the custom UI with a CAPTCHA container and sends international identifier', async () => {
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    await initializeMsg91OtpWidget(
      { widgetId: 'widget-id', tokenAuth: 'widget-token' },
      'captcha-container',
      { onSuccess, onFailure },
    );

    await expect(sendMsg91Otp('+919999999999')).resolves.toBe('widget-request-id');

    expect(browser.initSendOTP).toHaveBeenCalledWith({
      widgetId: 'widget-id',
      tokenAuth: 'widget-token',
      exposeMethods: true,
      captchaRenderId: 'captcha-container',
      success: expect.any(Function),
      failure: expect.any(Function),
    });
    expect(browser.sendOtp.mock.calls[0][0]).toBe('919999999999');

    const callbacks = browser.initSendOTP.mock.calls[0][0] as {
      success: (data: unknown) => void;
      failure: (error: unknown) => void;
    };
    callbacks.success({ data: { access_token: 'verified-access-token' } });
    expect(onSuccess).toHaveBeenCalledWith('verified-access-token');

    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    callbacks.failure({ message: 'Invalid Captcha Token. AuthKey=private-key' });
    expect(onFailure).toHaveBeenCalledWith('Complete the security check and try again.');
    expect(logError).toHaveBeenCalledWith('MSG91 OTP widget request failed', {
      message: 'Invalid Captcha Token. AuthKey=[redacted]',
    });
    logError.mockRestore();
  });

  it('does not send until the visible CAPTCHA is verified', async () => {
    browser.isCaptchaVerified.mockReturnValue(false);
    await initializeMsg91OtpWidget(
      { widgetId: 'widget-id', tokenAuth: 'widget-token' },
      'captcha-container',
    );

    await expect(sendMsg91Otp('+919999999999')).rejects.toThrow('Complete the CAPTCHA');
    expect(browser.sendOtp).not.toHaveBeenCalled();
  });

  it('uses the widget retry and verify methods and returns the verified access token', async () => {
    browser.getWidgetData.mockReturnValue({ captchaValidations: false });
    await initializeMsg91OtpWidget(
      { widgetId: 'widget-id', tokenAuth: 'widget-token' },
      'captcha-container',
    );

    await retryMsg91Otp();
    await expect(verifyMsg91Otp('123456')).resolves.toBe('verified-access-token');

    expect(browser.retryOtp).toHaveBeenCalledWith('11', expect.any(Function), expect.any(Function));
    expect(browser.verifyOtp.mock.calls[0][0]).toBe('123456');
  });

  it('surfaces provider rejection without exposing provider response details', async () => {
    browser.getWidgetData.mockReturnValue({ captchaValidations: false });
    browser.sendOtp.mockImplementation((_identifier, _success, failure) => {
      failure({ message: 'rejected-secret-or-token' });
    });
    await initializeMsg91OtpWidget(
      { widgetId: 'widget-id', tokenAuth: 'widget-token' },
      'captcha-container',
    );

    await expect(sendMsg91Otp('+919999999999')).rejects.toThrow(
      'MSG91 could not complete phone verification.',
    );
    expect(browser.sendOtp.mock.calls[0][0]).toBe('919999999999');
  });

  it('preserves an access token when MSG91 reports that the OTP was already verified', async () => {
    browser.getWidgetData.mockReturnValue({ captchaValidations: false });
    browser.verifyOtp.mockImplementation((_otp, _success, failure) => {
      failure({ code: 703, message: 'otp already verified', access_token: 'verified-access-token' });
    });
    await initializeMsg91OtpWidget(
      { widgetId: 'widget-id', tokenAuth: 'widget-token' },
      'captcha-container',
    );

    await expect(verifyMsg91Otp('123456')).rejects.toMatchObject({
      name: 'Msg91OtpAlreadyVerifiedError',
      accessToken: 'verified-access-token',
    });
  });

  it('rejects a successful send response without a request ID', async () => {
    browser.getWidgetData.mockReturnValue({ captchaValidations: false });
    browser.sendOtp.mockImplementation((_identifier, success) => success({ type: 'success' }));
    await initializeMsg91OtpWidget(
      { widgetId: 'widget-id', tokenAuth: 'widget-token' },
      'captcha-container',
    );

    await expect(sendMsg91Otp('+919999999999')).rejects.toThrow('request ID');
  });
});
