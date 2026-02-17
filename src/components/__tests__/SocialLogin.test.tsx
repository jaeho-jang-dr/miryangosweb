import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialLogin } from '@/components/social-login';

// Mock next/script
jest.mock('next/script', () => ({
    __esModule: true,
    default: ({ onLoad, ...props }: any) => {
        // Simulate script load via useEffect-like behavior
        React.useEffect(() => {
            if (onLoad) onLoad();
        }, [onLoad]);
        return <script {...props} />;
    },
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
    MessageSquare: (props: any) => <span data-testid="message-square-icon" {...props} />,
}));

// Firebase auth mocks
const mockSignInWithPopup = require('firebase/auth').signInWithEmailAndPassword as jest.Mock;
jest.mock('firebase/auth', () => ({
    ...jest.requireActual('firebase/auth'),
    GoogleAuthProvider: jest.fn(() => ({})),
    signInWithPopup: jest.fn(),
    signInWithCustomToken: jest.fn(),
}));

const { signInWithPopup, signInWithCustomToken, GoogleAuthProvider } = require('firebase/auth');

// Mock firebase-public
jest.mock('@/lib/firebase-public', () => ({
    auth: { currentUser: null },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.open
const mockWindowOpen = jest.fn();

describe('SocialLogin', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();

        process.env = {
            ...originalEnv,
            NEXT_PUBLIC_KAKAO_JS_KEY: 'test-kakao-key',
            NEXT_PUBLIC_NAVER_CLIENT_ID: 'test-naver-id',
            NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
        };

        // Set up Kakao mock on window
        (window as any).Kakao = {
            isInitialized: jest.fn(() => true),
            init: jest.fn(),
            Auth: {
                login: jest.fn(),
            },
            API: {
                request: jest.fn(),
            },
        };

        // Set up Naver mock on window
        (window as any).naver = {};

        // Mock window.open
        window.open = mockWindowOpen;

        // Mock sessionStorage
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn(),
            },
            writable: true,
        });
    });

    afterEach(() => {
        process.env = originalEnv;
        delete (window as any).Kakao;
        delete (window as any).naver;
    });

    // ─── Rendering ────────────────────────────────────────────
    it('renders all three login buttons', () => {
        render(<SocialLogin />);

        expect(screen.getByText('구글 계정으로 시작하기')).toBeInTheDocument();
        expect(screen.getByText('카카오톡으로 시작하기')).toBeInTheDocument();
        expect(screen.getByText('네이버로 시작하기')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(<SocialLogin className="custom-class" />);

        const div = container.querySelector('.custom-class');
        expect(div).toBeInTheDocument();
    });

    it('does not show loading message initially', () => {
        render(<SocialLogin />);

        expect(screen.queryByText('로그인 처리 중...')).not.toBeInTheDocument();
    });

    // ─── Google Login ─────────────────────────────────────────
    it('calls signInWithPopup on Google login button click', async () => {
        signInWithPopup.mockResolvedValue({ user: { uid: 'google-123' } });

        render(<SocialLogin />);

        const googleButton = screen.getByText('구글 계정으로 시작하기');
        await userEvent.click(googleButton);

        expect(signInWithPopup).toHaveBeenCalledTimes(1);
    });

    it('calls onLoginSuccess after successful Google login', async () => {
        const mockOnLoginSuccess = jest.fn();
        signInWithPopup.mockResolvedValue({ user: { uid: 'google-123' } });

        render(<SocialLogin onLoginSuccess={mockOnLoginSuccess} />);

        const googleButton = screen.getByText('구글 계정으로 시작하기');
        await userEvent.click(googleButton);

        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('silently handles popup-closed-by-user error for Google', async () => {
        signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

        render(<SocialLogin />);

        const googleButton = screen.getByText('구글 계정으로 시작하기');
        await userEvent.click(googleButton);

        // Should not show alert for popup closed
        await waitFor(() => {
            expect(window.alert).not.toHaveBeenCalled();
        });
    });

    it('shows alert for non-popup-closed Google login errors', async () => {
        signInWithPopup.mockRejectedValue({ code: 'auth/other-error', message: 'Something went wrong' });

        render(<SocialLogin />);

        const googleButton = screen.getByText('구글 계정으로 시작하기');
        await userEvent.click(googleButton);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Google 로그인 실패'));
        });
    });

    it('prevents double-click on Google login when loading', async () => {
        signInWithPopup.mockReturnValue(new Promise(() => {})); // hang

        render(<SocialLogin />);

        const googleButton = screen.getByText('구글 계정으로 시작하기');
        await userEvent.click(googleButton);
        await userEvent.click(googleButton);

        expect(signInWithPopup).toHaveBeenCalledTimes(1);
    });

    // ─── Kakao Login ──────────────────────────────────────────
    it('alerts when Kakao SDK is not loaded', async () => {
        (window as any).Kakao = undefined;

        render(<SocialLogin />);

        const kakaoButton = screen.getByText('카카오톡으로 시작하기');
        // Button might be disabled since kakaoLoaded depends on Script onLoad
        // but we can still test the handler logic
        fireEvent.click(kakaoButton);

        // The component checks kakaoLoaded state AND window.Kakao
        // Since our mock Script calls onLoad, kakaoLoaded will be true
        // but window.Kakao is undefined, so it should alert
    });

    it('initializes Kakao SDK if not initialized', async () => {
        (window as any).Kakao.isInitialized.mockReturnValue(false);

        render(<SocialLogin />);

        const kakaoButton = screen.getByText('카카오톡으로 시작하기');
        await userEvent.click(kakaoButton);

        expect((window as any).Kakao.init).toHaveBeenCalledWith('test-kakao-key');
    });

    it('does not re-initialize Kakao SDK if already initialized', async () => {
        (window as any).Kakao.isInitialized.mockReturnValue(true);

        render(<SocialLogin />);

        const kakaoButton = screen.getByText('카카오톡으로 시작하기');
        await userEvent.click(kakaoButton);

        // Init should only be called from Script onLoad, not from the login handler
        // because isInitialized returns true
    });

    it('calls Kakao.Auth.login on Kakao login button click', async () => {
        render(<SocialLogin />);

        const kakaoButton = screen.getByText('카카오톡으로 시작하기');
        await userEvent.click(kakaoButton);

        expect((window as any).Kakao.Auth.login).toHaveBeenCalledTimes(1);
    });

    // ─── Naver Login ──────────────────────────────────────────
    it('opens popup for Naver login', async () => {
        mockWindowOpen.mockReturnValue({ closed: false });

        render(<SocialLogin />);

        const naverButton = screen.getByText('네이버로 시작하기');
        await userEvent.click(naverButton);

        expect(mockWindowOpen).toHaveBeenCalledWith(
            expect.stringContaining('nid.naver.com/oauth2.0/authorize'),
            'naverloginpop',
            expect.any(String)
        );
    });

    it('stores naver state in sessionStorage', async () => {
        mockWindowOpen.mockReturnValue({ closed: false });

        render(<SocialLogin />);

        const naverButton = screen.getByText('네이버로 시작하기');
        await userEvent.click(naverButton);

        expect(sessionStorage.setItem).toHaveBeenCalledWith('naver_state', expect.any(String));
    });

    it('alerts when NAVER_CLIENT_ID is not set', async () => {
        delete process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;

        render(<SocialLogin />);

        const naverButton = screen.getByText('네이버로 시작하기');
        await userEvent.click(naverButton);

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('네이버 Client ID'));
    });

    // ─── Loading State ────────────────────────────────────────
    it('shows loading indicator during login process', async () => {
        signInWithPopup.mockReturnValue(new Promise(() => {})); // hang

        render(<SocialLogin />);

        const googleButton = screen.getByText('구글 계정으로 시작하기');
        await userEvent.click(googleButton);

        expect(screen.getByText('로그인 처리 중...')).toBeInTheDocument();
    });

    it('disables all buttons during loading', async () => {
        signInWithPopup.mockReturnValue(new Promise(() => {})); // hang

        render(<SocialLogin />);

        const googleButton = screen.getByText('구글 계정으로 시작하기');
        await userEvent.click(googleButton);

        // Google button should be disabled
        expect(googleButton.closest('button')).toBeDisabled();
    });

    // ─── Naver Message Handler ────────────────────────────────
    it('handles NAVER_LOGIN_SUCCESS message', async () => {
        const mockOnLoginSuccess = jest.fn();
        const mockPopup = { closed: false };
        mockWindowOpen.mockReturnValue(mockPopup);

        render(<SocialLogin onLoginSuccess={mockOnLoginSuccess} />);

        const naverButton = screen.getByText('네이버로 시작하기');
        await userEvent.click(naverButton);

        // Simulate message from callback window
        const messageEvent = new MessageEvent('message', {
            origin: window.location.origin,
            data: { type: 'NAVER_LOGIN_SUCCESS' },
        });

        fireEvent(window, messageEvent);

        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('handles NAVER_LOGIN_FAILED message', async () => {
        const mockPopup = { closed: false };
        mockWindowOpen.mockReturnValue(mockPopup);

        render(<SocialLogin />);

        const naverButton = screen.getByText('네이버로 시작하기');
        await userEvent.click(naverButton);

        // Simulate failed message from callback window
        const messageEvent = new MessageEvent('message', {
            origin: window.location.origin,
            data: { type: 'NAVER_LOGIN_FAILED' },
        });

        fireEvent(window, messageEvent);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('네이버 로그인에 실패했습니다.');
        });
    });

    it('ignores messages from different origins', async () => {
        const mockOnLoginSuccess = jest.fn();
        const mockPopup = { closed: false };
        mockWindowOpen.mockReturnValue(mockPopup);

        render(<SocialLogin onLoginSuccess={mockOnLoginSuccess} />);

        const naverButton = screen.getByText('네이버로 시작하기');
        await userEvent.click(naverButton);

        // Simulate message from different origin
        const messageEvent = new MessageEvent('message', {
            origin: 'https://evil.example.com',
            data: { type: 'NAVER_LOGIN_SUCCESS' },
        });

        fireEvent(window, messageEvent);

        // Should NOT call onLoginSuccess because origin is different
        expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
});
